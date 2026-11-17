"""
The module :mod:`weth.tests.common` provides unittest test cases and a few
helpers and classes to write tests.

"""
from __future__ import annotations

import base64
import binascii
import concurrent.futures
import contextlib
import difflib
import importlib
import inspect
import itertools
import json
import logging
import os
import pathlib
import platform
import pprint
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import traceback
import typing
import unittest
from collections import defaultdict, deque
from concurrent.futures import CancelledError, Future, InvalidStateError, wait
from contextlib import AbstractContextManager, ExitStack, contextmanager
from copy import deepcopy
from datetime import datetime
from functools import cache, partial, wraps
from itertools import islice, zip_longest
from textwrap import shorten
from unittest.mock import Mock, _patch, patch
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit
from uuid import uuid4
from xmlrpc import client as xmlrpclib

import freezegun
import psutil
import requests
from lxml import etree, html
from passlib.context import CryptContext
from requests import PreparedRequest, Session
from urllib3.util import parse_url
from werkzeug.exceptions import BadRequest

import weth.cli
import weth.models
import weth.orm.registry
from weth import api, fields
from weth.exceptions import AccessError
from weth.fields import Command
from weth.http import request, request_var
from weth.http.requestlib import Request
from weth.http.session import (
    DEFAULT_LANG,
    get_default_session,
    logout,
    update_session_token,
    session_store,
)
from weth.http.session import Session as OdooHttpSession
from weth.orm.environments import CacheLayer
from weth.modules.registry import Registry
from weth.sql_db import Cursor
from weth.tools import SQL, DotDict, config, file_open, float_compare, mute_logger, profiler
from weth.tools.binary import BinaryBytes
from weth.tools.lru import LRU
from weth.tools.mail import single_email_re
from weth.tools.misc import diff_zip, find_in_path, real_time, str2bool
from weth.tools.safe_eval import safe_whitelist
from weth.tools.xml_utils import _validate_xml

import weth.addons.base
from . import case, test_cursor

if typing.TYPE_CHECKING:
    from collections.abc import Iterable

try:
    import websocket
except ImportError:
    # chrome headless tests will be skipped
    websocket = None

_logger = logging.getLogger(__name__)
if weth.cli.COMMAND in ('server', 'start') and not config['test_enable']:
    _logger.error(
        "Importing test framework"
        ", avoid importing from business modules and when not running in test mode",
        stack_info=True,
    )
else:
    _logger.info("Importing test framework", stack_info=_logger.isEnabledFor(logging.DEBUG))


# The odoo library is supposed already configured.
HOST = '127.0.0.1'
# Useless constant, tests are aware of the content of demo data
ADMIN_USER_ID = api.SUPERUSER_ID

CHECK_BROWSER_SLEEP = 0.1 # seconds
CHECK_BROWSER_ITERATIONS = 100
BROWSER_WAIT = CHECK_BROWSER_SLEEP * CHECK_BROWSER_ITERATIONS # seconds
DEFAULT_SUCCESS_SIGNAL = 'test successful'
TEST_CURSOR_COOKIE_NAME = 'test_request_key'

DISABLE_TIMEOUTS = str2bool(os.getenv('ODOO_TEST_DISABLE_TIMEOUT', '0'))

IGNORED_MSGS = re.compile(r"""
    failed\ to\ fetch  # base error
  | connectionlosterror:  # conversion by offlineFailToFetchErrorHandler
  | assetsloadingerror: # lazy loaded bundle
""", flags=re.VERBOSE | re.IGNORECASE).search

def get_db_name():
    dbnames = weth.tools.config['db_name']
    # If the database name is not provided on the command-line,
    # use the one on the thread (which means if it is provided on
    # the command-line, this will break when installing another
    # database from XML-RPC).
    if not dbnames and hasattr(threading.current_thread(), 'dbname'):
        return threading.current_thread().dbname
    if len(dbnames) > 1:
        sys.exit("-d/--database/db_name has multiple database, please provide a single one")
    return dbnames[0]


standalone_tests = defaultdict(list)


class RegistryRLock(threading._RLock):
    @property
    def count(self):
        return self._count  # Expose private attribute


# The lock should only be released when new test cursors are meant to be opened.
# Further filtering on cursors can be done by extending `assertCanOpenTestCursor`.
_registry_test_lock = RegistryRLock()
_registry_test_lock.acquire()
_disable_flushing_cursor = False


@contextmanager
def release_test_lock(check_acquired=False):
    """ Releases the test lock in a context manager, the lock is acquired once the context is over."""
    if check_acquired and not _registry_test_lock.count:
        # not acquired, just noop
        yield
        return
    try:
        _registry_test_lock.release()
        yield
    finally:
        if not _registry_test_lock.acquire(timeout=60):
            tag = weth.modules.module.current_test.canonical_tag
            exit(f'Could not re-acquire the registry lock during {tag}, exiting...')


@contextmanager
def flushing_cursor(cr: Cursor):
    """ Simulate a commit on a cursor (without comitting) and reset on exit.

    Run this on the main cursor when creating test cursors so that they can see
    changes made on the main cursor. You can still continue using the main
    cursor inside the block, it will be flushed on exit and then reset.
    """
    assert isinstance(weth.modules.module.current_test, TransactionCase), "only available for TransactionCase"

    if _disable_flushing_cursor:
        # execution of wkhtml happens in parallel, we don't want to flush the
        # cursor in that case
        yield
        return

    if cr.transaction is None:  # no environment to clear
        cr.flush()
        yield
        return

    # simluate cr.commit()
    state_stack = cr.transaction._state_stack__
    registry_invalidated = cr.transaction._registry_invalidated
    closing = cr._closing
    # preserve registry_invalidated flag which is reset when committing
    # sum them after yielding
    try:
        # Since we simulate an empty stack, make sure the parent layer is set as
        # the cache on the registry. This ensures that existing caches are not
        # affected by updating parent layers.
        registry_caches = cr.transaction.registry.registry_caches__
        for name in registry_caches:
            layer = cr.transaction.ormcaches__[name]
            parent = layer.parent
            if parent is None:
                # simulate signaling already here
                layer.parent = parent = LRU(999999)
                layer.update_parent()
            registry_caches[name] = (registry_caches[name][0], parent)

        cr._closing = True  # do a quick clean
        cr.transaction._state_stack__ = []  # replace the stack
        with cr.transaction.committing():
            pass  # no real commit
        # restore the stack
        cr.transaction._state_stack__ = state_stack
        cr._closing = closing

        try:
            yield
        finally:
            # the registry may be invalidated during the yield
            registry_invalidated += cr.transaction._registry_invalidated

        # simulate cr.commit() again to flush changes made by the main cursor
        state_stack = cr.transaction._state_stack__
        closing = cr._closing

        cr._closing = False  # do a reset
        cr.transaction._state_stack__ = []  # replace the stack
        with cr.transaction.committing():
            pass  # no real commit
    finally:
        cr.transaction._state_stack__ = state_stack
        cr._closing = closing
        cr.transaction._registry_invalidated = registry_invalidated


def standalone(*tags):
    """ Decorator for standalone test functions.  This is somewhat dedicated to
    tests that install, upgrade or uninstall some modules, which is currently
    forbidden in regular test cases.  The function is registered under the given
    ``tags`` and the corresponding Odoo module name.
    """
    def register(func):
        # register func by odoo module name
        if func.__module__.startswith('weth.addons.'):
            module = func.__module__.split('.')[2]
            standalone_tests[module].append(func)
        # register func with aribitrary name, if any
        for tag in tags:
            standalone_tests[tag].append(func)
        standalone_tests['all'].append(func)
        return func

    return register


def test_xsd(url=None, path=None, skip=False):
    def decorator(func):
        def wrapped_f(self, *args, **kwargs):
            if not skip:
                xmls = func(self, *args, **kwargs)
                _validate_xml(self.env, url, path, xmls)
        return wrapped_f
    return decorator


def new_test_user(env, login='', groups='base.group_user', context=None, **kwargs):
    """ Helper function to create a new test user. It allows to quickly create
    users given its login and groups (being a comma separated list of xml ids).
    Kwargs are directly propagated to the create to further customize the
    created user.

    User creation uses a potentially customized environment using the context
    parameter allowing to specify a custom context. It can be used to force a
    specific behavior and/or simplify record creation. An example is to use
    mail-related context keys in mail tests to speedup record creation.

    Some specific fields are automatically filled to avoid issues

     * group_ids: it is filled using groups function parameter;
     * name: "login (groups)" by default as it is required;
     * email: it is either the login (if it is a valid email) or a generated
       string 'x.x@example.com' (x being the first login letter). This is due
       to email being required for most odoo operations;
    """
    if not login:
        raise ValueError('New users require at least a login')
    if not groups:
        raise ValueError('New users require at least user groups')
    if context is None:
        context = {}

    group_ids = [Command.set(kwargs.pop('group_ids', False) or [env.ref(g.strip()).id for g in groups.split(',')])]
    create_values = dict(kwargs, login=login, group_ids=group_ids)
    # automatically generate a name as "Login (groups)" to ease user comprehension
    if not create_values.get('name'):
        create_values['name'] = '%s (%s)' % (login, groups)
    # automatically give a password equal to login
    if not create_values.get('password'):
        create_values['password'] = login + 'x' * (8 - len(login))
    # generate email if not given as most test require an email
    if 'email' not in create_values:
        if single_email_re.match(login):
            create_values['email'] = login
        else:
            create_values['email'] = '%s.%s@example.com' % (login[0], login[0])
    # ensure company_id + allowed company constraint works if not given at create
    if 'company_id' in create_values and 'company_ids' not in create_values:
        create_values['company_ids'] = [(4, create_values['company_id'])]

    return env['res.users'].sudo().with_context(**context).create(create_values)

def loaded_demo_data(env):
    return bool(env.ref('base.user_demo', raise_if_not_found=False))

class RecordCapturer:
    def __init__(self, model, domain=None):
        self._model = model
        self._domain = domain or []

    def __enter__(self):
        self._before = self._model.search(self._domain, order='id')
        self._after = None
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        if exc_type is None:
            self._after = self._model.search(self._domain, order='id') - self._before

    @property
    def records(self):
        if self._after is None:
            return self._model.search(self._domain, order='id') - self._before
        return self._after


def _enter_context(cm, addcleanup):
    # We look up the special methods on the type to match the with
    # statement.
    cls = type(cm)
    try:
        enter = cls.__enter__
        exit = cls.__exit__
    except AttributeError:
        raise TypeError(f"'{cls.__module__}.{cls.__qualname__}' object does "
                        f"not support the context manager protocol") from None
    result = enter(cm)
    addcleanup(exit, cm, None, None, None)
    return result


def _normalize_arch_for_assert(arch_string, parser_method="xml"):
    """Takes some xml and normalize it to make it comparable to other xml
    in particular, blank text is removed, and the output is pretty-printed

    :param str arch_string: the string representing an XML arch
    :param str parser_method: an string representing which lxml.Parser class to use
        when normalizing both archs. Takes either "xml" or "html"
    :return: the normalized arch
    :rtype str:
    """
    Parser = None
    if parser_method == 'xml':
        Parser = etree.XMLParser
    elif parser_method == 'html':
        Parser = etree.HTMLParser
    parser = Parser(remove_blank_text=True)
    arch_string = etree.fromstring(arch_string, parser=parser)
    return etree.tostring(arch_string, pretty_print=True, encoding='unicode')


class BlockedRequest(requests.exceptions.ConnectionError):
    pass


_super_send = requests.Session.send


class MockHTTPClient(AbstractContextManager):
    """Mock ``requests`` calls and return a fake ``requests.Response``.

    This context manager patches ``requests.sessions.Session.send``.
    Each outgoing request is checked against the match criteria. If it
    matches, the request is recorded in ``calls``, the optional
    ``side_effect`` is executed, and a mocked response is returned. If
    it does not match, the request is delegated to the previously active
    ``send`` (either the real ``requests`` implementation, or an outer
    ``MockHTTPClient`` when you nest mocks), so multiple
    ``MockHTTPClient`` instances can be composed.

    A request matches when all checks pass:

    * ``method`` (if passed): matches the HTTP method (case-insensitive)
    * ``url`` (if passed):  limits which requests this mock will catch.
      Use ``"https://api.example.com/v1/items"`` to match that
      host + path; include more (e.g. a query string) to make it
      stricter. Anything you omit is treated as "don't care" and won't
      affect matching.
    * ``matcher(request)`` (if passed): a custom function predicate for
      anything beyond method/URL (headers, JSON body, etc.).

    The response is built from ``return_status`` and ``return_headers``
    (both can be values or callables).
    The body comes from ``return_json`` (JSON-encoded and defaults
    ``Content-Type`` to ``application/json``) or from ``return_body``
    when ``return_json`` is ``None``.

    Examples
    --------
    Mock an auth flow and return dynamic JSON based on headers

    .. code-block:: python
        def is_body_authorized(req):
            token = req.headers.get('Authorization')
            if token == 'Bearer super-secure-token':
                return "Authorized!"
            return "Not authorized :("

        def check_auth_header(req):
            self.assertIn(
                'Authorization',
                req.headers,
                "Missing Authorization header",
            )

        with (
            MockHTTPClient(
                url='https://auth.example.com/token',
                return_json={'token': 'super-secure-token'},
            ) as auth_mock,
            MockHTTPClient(
                url='https://api.example.com/am-i-authorized',
                return_body=is_body_authorized,
                side_effect=check_auth_header,
            ) as api_mock,
        ):
            token = requests.get(
                'https://auth.example.com/token',
            ).json()['token']
            auth_mock.assert_called_once()

            resp = requests.get(
                'https://api.example.com/am-i-authorized',
                headers={'Authorization': f'Bearer {token}'},
            )
            api_mock.assert_called_once()
            assert resp.text == "Authorized!"
    """

    def __init__(
        self,
        url: str | None = None,
        *,
        method: str | None = None,
        matcher: typing.Callable[[requests.PreparedRequest], bool] | None = None,
        return_status: int | typing.Callable[[requests.PreparedRequest], int] = 200,
        return_json: dict | typing.Callable[[requests.PreparedRequest], dict] | None = None,
        return_body: bytes | str | typing.Callable[[requests.PreparedRequest], bytes | str] | None = None,
        return_headers: dict | typing.Callable[[requests.PreparedRequest], dict] | None = None,
        side_effect: typing.Callable[[requests.PreparedRequest], None] | None = None,
    ):
        self.url = parse_url(url) if url else None
        if url and not self.url.host:
            raise ValueError(f"URL '{url}' is not valid: missing host")
        self.method = method.upper() if method else None
        self.matcher = matcher
        self.return_status = return_status if callable(return_status) else lambda _req: return_status

        self.return_json = None
        if callable(return_json):
            self.return_json = return_json
        elif return_json is not None:
            self.return_json = lambda _req: return_json
        if self.return_json is not None and return_body is not None:
            raise ValueError("Cannot specify both return_json and return_body")

        self.return_body = return_body if callable(return_body) else lambda _req: return_body
        self.return_headers = return_headers if callable(return_headers) else lambda _req: return_headers or {}
        self.side_effect = side_effect
        self.calls = []
        self.super_send = None

    def _request_matches(self, req: requests.PreparedRequest) -> bool:
        if self.method and self.method != req.method.upper():
            return False
        if self.url and req.url:
            request_url = parse_url(req.url)
            if any((
                self.url.scheme and self.url.scheme != request_url.scheme,
                self.url.host and self.url.host != request_url.host,
                self.url.port and self.url.port != request_url.port,
                self.url.path and self.url.path != request_url.path,
                self.url.query and self.url.query != request_url.query,
            )):
                return False
        return self.matcher is None or self.matcher(req)

    def __enter__(self):
        self.super_send = requests.sessions.Session.send
        self.calls = []

        def send(session, req: requests.PreparedRequest, **kw):
            if not self._request_matches(req):
                return self.super_send(session, req, **kw)

            self.calls.append(req)
            if self.side_effect:
                self.side_effect(req)

            resp = requests.Response()
            resp.status_code = self.return_status(req)
            resp.url = req.url or ''
            resp.request = req
            resp.headers.update(self.return_headers(req))
            if self.return_json is not None:
                resp.headers.setdefault('Content-Type', 'application/json')
                resp.encoding = 'utf-8'
                resp._content = json.dumps(self.return_json(req), ensure_ascii=False).encode()
            else:
                return_body = self.return_body(req)
                resp._content = return_body.encode() if isinstance(return_body, str) else return_body or b''

            return resp

        self.patcher = patch.object(requests.sessions.Session, 'send', send)
        self.patcher.start()
        return self

    def __exit__(self, exc_type, exc, tb):
        self.patcher.stop()
        self.super_send = None
        return False

    def __repr__(self) -> str:
        return (
            'MockHTTPClient('
            f'method={str(self.method)!r}, '
            f'url={str(self.url.url) if self.url is not None else None!r}, '
            f'matcher={"set" if self.matcher else None!r}, '
            f'side_effect={"set" if self.side_effect else None!r}, '
            f'body={"json" if self.return_json is not None else "body"!r}, '
            f'calls={len(self.calls)})'
        )

    def assert_called(self, n_times=None):
        if n_times == 0:
            if self.calls:
                raise AssertionError(f"Expected 0 calls. Called {len(self.calls)} times.")
            return

        if not self.calls:
            raise AssertionError("Expected to have been called at least once. No calls were made.")

        if n_times is not None and len(self.calls) != n_times:
            raise AssertionError(f"Expected {n_times} calls. Called {len(self.calls)} times.")

    def assert_called_once(self):
        self.assert_called(n_times=1)

    def assert_not_called(self):
        self.assert_called(n_times=0)


class DummyRLock:
    """ Dummy reentrant lock, to be used while running rpc and js tests """
    def acquire(self):
        pass

    def release(self):
        pass

    def __enter__(self):
        self.acquire()

    def __exit__(self, *args):
        self.release()


class BaseCase(case.TestCase):
    """ Subclass of TestCase for Odoo-specific code. This class is abstract and
    expects self.registry, self.cr and self.uid to be initialized by subclasses.
    """
    registry: Registry = None
    env: api.Environment = None
    cr: Cursor = None

    longMessage = True      # more verbose error message by default: https://www.weth.com.br/r/Vmh
    warm = True             # False during warm-up phase (see :func:`warmup`)
    _python_version = sys.version_info

    _registry_patched = False
    _registry_readonly_enabled = True
    test_cursor_lock_timeout: int = 3600 if DISABLE_TIMEOUTS else 20

    @classmethod
    def __init_subclass__(cls):
        """Assigns default test tags ``standard`` and ``post_install`` to test
        cases not having them. Also sets a completely unnecessary
        ``test_module`` attribute.
        """
        super().__init_subclass__()
        if cls.__module__.startswith('weth.addons.'):
            if getattr(cls, 'test_tags', None) is None:
                cls.test_tags = {'standard', 'post_install'}
            cls.test_module = cls.__module__.split('.')[2]

    def __init__(self, methodName='runTest'):
        super().__init__(methodName)
        self.addTypeEqualityFunc(etree._Element, self.assertTreesEqual)
        self.addTypeEqualityFunc(html.HtmlElement, self.assertTreesEqual)
        if methodName != 'runTest':
            self.test_tags = self.test_tags | set(self.get_method_additional_tags(getattr(self, methodName)))

    @classmethod
    def _request_handler(cls, s: Session, r: PreparedRequest, /, **kw):
        # allow localhost requests
        # TODO: also check port?
        url = urlsplit(r.url)
        timeout = kw.get('timeout')
        if timeout and timeout < 10:
            _logger.getChild('requests').info('request %s with timeout %s increased to 10s during tests', url, timeout)
            kw['timeout'] = 10
        if url.hostname in (HOST, 'localhost'):
            return _super_send(s, r, **kw)
        if url.scheme == 'file':
            return _super_send(s, r, **kw)

        _logger.getChild('requests').info(
            "Blocking un-mocked external HTTP request %s %s", r.method, r.url)
        raise BlockedRequest(f"External requests verboten (was {r.method} {r.url})")

    @classmethod
    def setUpClass(cls):
        def check_remaining_processes():
            current_process = psutil.Process()
            children = current_process.children(recursive=False)
            for child in children:
                _logger.warning('A child process was found, terminating it: %s', child)
                child.terminate()
            psutil.wait_procs(children, timeout=10)  # mainly to avoid a zombie process that would be logged again at the end.
        cls.addClassCleanup(check_remaining_processes)

        def check_remaining_patchers():
            for patcher in _patch._active_patches:
                _logger.warning("A patcher (targeting %s.%s) was remaining active at the end of %s, disabling it...", patcher.target, patcher.attribute, cls.__name__)
                patcher.stop()
        cls.addClassCleanup(check_remaining_patchers)
        super().setUpClass()
        if 'standard' in cls.test_tags or 'click_all' in cls.test_tags:
            # if the method is passed directly `patch` discards the session
            # object which we need
            # pylint: disable=unnecessary-lambda
            patcher = patch.object(
                requests.sessions.Session,
                'send',
                lambda s, r, **kwargs: cls._request_handler(s, r, **kwargs),
            )
            patcher.start()
            cls.addClassCleanup(patcher.stop)

        # cannot create new registries during testing, it would mess up test
        # runs, install other modules, reporting, etc.
        def forbidden(*a, **kw):
            raise RuntimeError("cannot call Registry.new during testing")
        cls.startClassPatcher(patch.object(Registry, 'new', forbidden))

    def setUp(self):
        super().setUp()
        self.http_request_key: str = ''
        self.http_request_allow_all: bool = False

    def cursor(self):
        return self.registry.cursor()

    @property
    def uid(self):
        """ Get the current uid. """
        return self.env.uid

    @uid.setter
    def uid(self, user):
        """ Set the uid by changing the test's environment. """
        self.env = self.env(user=user)
        # set the updated environment as the default one
        self.env.transaction.default_env = self.env

    def ref(self, xid):
        """ Returns database ID for the provided :term:`external identifier`,
        shortcut for ``_xmlid_lookup``

        :param xid: fully-qualified :term:`external identifier`, in the form
                    :samp:`{module}.{identifier}`
        :raise: ValueError if not found
        :returns: registered id
        """
        return self.browse_ref(xid).id

    def browse_ref(self, xid):
        """ Returns a record object for the provided
        :term:`external identifier`

        :param xid: fully-qualified :term:`external identifier`, in the form
                    :samp:`{module}.{identifier}`
        :raise: ValueError if not found
        :returns: :class:`~weth.models.BaseModel`
        """
        assert "." in xid, "this method requires a fully qualified parameter, in the following form: 'module.identifier'"
        return self.env.ref(xid)

    def patch(self, obj, key, val):
        """ Do the patch ``setattr(obj, key, val)``, and prepare cleanup. """
        patcher = patch.object(obj, key, val)   # this is unittest.mock.patch
        patcher.start()
        self.addCleanup(patcher.stop)

    @classmethod
    def classPatch(cls, obj, key, val):
        """ Do the patch ``setattr(obj, key, val)``, and prepare cleanup. """
        patcher = patch.object(obj, key, val)   # this is unittest.mock.patch
        patcher.start()
        cls.addClassCleanup(patcher.stop)

    def startPatcher(self, patcher):
        mock = patcher.start()
        self.addCleanup(patcher.stop)
        return mock

    @classmethod
    def startClassPatcher(cls, patcher):
        mock = patcher.start()
        cls.addClassCleanup(patcher.stop)
        return mock

    def enterContext(self, cm):
        """Enters the supplied context manager.

        If successful, also adds its __exit__ method as a cleanup
        function and returns the result of the __enter__ method.
        """
        return _enter_context(cm, self.addCleanup)

    @classmethod
    def enterClassContext(cls, cm):
        """Same as enterContext, but class-wide."""
        return _enter_context(cm, cls.addClassCleanup)

    @contextmanager
    def with_user(self, login):
        """ Change user for a given test, like with self.with_user() ... """
        old_uid = self.uid
        old_env = self.env
        try:
            user = self.env['res.users'].sudo().search([('login', '=', login)], order='login')
            assert user, "Login %s not found" % login
            # switch user
            self.uid = user.id
            self.env = self.env(user=self.uid)
            yield
        finally:
            # back
            self.uid = old_uid
            self.env = old_env

    @contextmanager
    def debug_mode(self):
        """ Enable the effects of debug mode (in particular for group ``base.group_no_one``). """
        request = Mock(
            httprequest=Mock(host='localhost'),
            db=self.env.cr.dbname,
            env=self.env,
            session=DotDict(get_default_session(), debug='1', sid=''),
        )
        reset_req = None
        try:
            self.env.flush_all()
            self.env.invalidate_all()
            reset_req = request_var.set(request)
            yield
            self.env.flush_all()
            self.env.invalidate_all()
        finally:
            current_request = request_var.get()
            if reset_req is not None:
                request_var.reset(reset_req)
            if current_request is not request:
                raise Exception('Wrong request stack cleanup.')

    @contextmanager
    def _raisesContext(self, method, expected_exception, *args, **kwargs):
        """ Context manager that clears the environment upon failure. """
        with ExitStack() as init:
            if self.env:
                init.enter_context(self.env.cr.savepoint())
                if isinstance(expected_exception, tuple):
                    clear_cache = any(issubclass(e, AccessError) for e in expected_exception)
                else:
                    clear_cache = issubclass(expected_exception, AccessError)
                if clear_cache:
                    # When checking for an `AccessError`, the cache is cleared
                    # before executing the code. This avoids cache pollution issues and
                    # ensures that access are re-evaluated correctly.
                    self.env.transaction.clear()

            with ExitStack() as inner:
                cm = inner.enter_context(method(expected_exception, *args, **kwargs))
                # *moves* the cleanups from init to inner, this ensures the
                # savepoint gets rolled back when `yield` raises `exception`,
                # but still allows the initialisation to be protected *and* not
                # interfered with by `assertRaises`.
                inner.push(init.pop_all())

                yield cm

    def assertRaises(self, expected_exception, callable=None, *args, **kwargs):
        if callable:
            with self._raisesContext(super().assertRaises, expected_exception):
                callable(*args, **kwargs)
            return None
        return self._raisesContext(super().assertRaises, expected_exception, *args, **kwargs)

    def assertRaisesRegex(self, expected_exception, expected_regex, callable=None, *args, **kwargs):
        if callable:
            with self._raisesContext(super().assertRaisesRegex, expected_exception, expected_regex):
                callable(*args, **kwargs)
            return None
        return self._raisesContext(super().assertRaisesRegex, expected_exception, expected_regex, *args, **kwargs)

    def _patchExecute(self, actual_queries, flush=True):
        Cursor_execute = Cursor.execute

        def execute(self, query, params=None, log_exceptions=None):
            if isinstance(query, SQL):
                assert params is None
                query, params, _ = query._sql_tuple
            actual_queries.append(query)
            return Cursor_execute(self, query, params, log_exceptions)

        if flush:
            self.env.cr.flush()

        with (
            patch('weth.sql_db.Cursor.execute', execute),
            patch.object(self.env.registry, 'unaccent', lambda x: x),
        ):
            yield actual_queries
            if flush:
                self.env.cr.flush()

    @contextmanager
    def assertQueries(self, expected, flush=True):
        """ Check the queries made by the current cursor. ``expected`` is a list
        of strings representing the expected queries being made. Query strings
        are matched against each other, ignoring case and whitespaces. Moreover,
        the substring ``"..."`` can be used as a wildcard to match anything in
        the corresponding actual query.
        """
        actual_queries = []

        yield from self._patchExecute(actual_queries, flush)

        if not self.warm:
            return

        # diff lists of queries 'expected' and 'actual_queries'
        queries1 = [QueryLike(query) for query in expected]
        queries2 = [QueryLike(query) for query in actual_queries]
        if queries1 == queries2:
            return

        diff = "\n".join(
            (f"--- {query1}" if query2 is None else
             f"+++ {query2}" if query1 is None else
             f"=== {query2}")
            for query1, query2 in diff_zip(queries1, queries2)
        )
        self.fail(self._formatMessage("\n" + diff, "Not the expected queries"))

    @contextmanager
    def assertQueryCount(self, default=0, flush=True, **counters):
        """ Context manager that counts queries. It may be invoked either with
            one value, or with a set of named arguments like ``login=value``::

                with self.assertQueryCount(42):
                    ...

                with self.assertQueryCount(admin=3, demo=5):
                    ...

            The second form is convenient when used with :func:`users`.
        """
        flush_func = self.env.cr.flush if flush else lambda: None
        if self.warm:
            # mock random in order to avoid random bus gc
            with patch('random.random', lambda: 1):
                login = self.env.user.login
                expected = counters.get(login, default)
                flush_func()
                count0 = self.cr.sql_log_count
                yield
                flush_func()
                count = self.cr.sql_log_count - count0
                if count != expected:
                    # add some info on caller to allow semi-automatic update of query count
                    _frame, filename, linenum, funcname, _lines, _index = inspect.stack()[2]
                    filename = filename.replace('\\', '/')
                    if "/weth/addons/" in filename:
                        filename = filename.rsplit("/weth/addons/", 1)[1]
                    if count > expected:
                        msg = "Query count more than expected for user %s: %d > %d in %s at %s:%s"
                        # add a subtest in order to continue the test_method in case of failures
                        with self.subTest():
                            self.fail(msg % (login, count, expected, funcname, filename, linenum))
                    elif expected and not count:
                        msg = "Query count did not detect any queries %s: expected %d in %s at %s:%s"
                        with self.subTest():
                            self.fail(msg % (login, expected, funcname, filename, linenum))
                    else:
                        logger = logging.getLogger(type(self).__module__)
                        msg = "Query count less than expected for user %s: %d < %d in %s at %s:%s"
                        logger.info(msg, login, count, expected, funcname, filename, linenum)
        else:
            # flush before and after during warmup, in order to reproduce the
            # same operations, otherwise the caches might not be ready!
            flush_func()
            yield
            flush_func()

    def assertRecordValues(
            self,
            records: weth.models.BaseModel,
            expected_values: list[dict],
            *,
            field_names: Iterable[str] | None = None,
    ) -> None:
        ''' Compare a recordset with a list of dictionaries representing the expected results.
        This method performs a comparison element by element based on their index.
        Then, the order of the expected values is extremely important.

        .. note::

            - ``None`` expected values can be used for empty fields.
            - x2many fields are expected by ids (so the expected value should be
              a ``list[int]``
            - many2one fields are expected by id (so the expected value should
              be an ``int``

        :param records: The records to compare.
        :param expected_values: Items to check the ``records`` against.
        :param field_names: list of fields to check during comparison, if
                            unspecified all expected_values must have the same
                            keys and all are checked
        '''
        if not field_names:
            field_names = expected_values[0].keys()
            for i, v in enumerate(expected_values):
                self.assertEqual(
                    v.keys(), field_names,
                    f"All expected values must have the same keys, found differences between records 0 and {i}",
                )

        expected_reformatted = []
        for vs in expected_values:
            r = {}
            for f in field_names:
                t = records._fields[f].type
                if t in ('one2many', 'many2many'):
                    r[f] = sorted(vs[f])
                elif t == 'float':
                    r[f] = float(vs[f])
                elif t == 'integer':
                    r[f] = int(vs[f])
                elif t == 'binary':
                    r[f] = bytes(vs[f])
                elif vs[f] is None:
                    r[f] = False
                else:
                    r[f] = vs[f]
            expected_reformatted.append(r)

        record_reformatted = []
        for record in records:
            r = {}
            for field_name in field_names:
                record_value = record[field_name]
                match record._fields[field_name]:
                    case weth.fields.Many2one():
                        record_value = record_value.id
                    case weth.fields.One2many() | weth.fields.Many2many():
                        record_value = sorted(record_value.ids)
                    case weth.fields.Float() as field if digits := field.get_digits(record.env):
                        record_value = Approx(record_value, digits[1], decorate=False)
                    case weth.fields.Monetary() as field if currency_field_name := field.get_currency_field(record):
                        # don't round if there's no currency set
                        if c := record[currency_field_name]:
                            record_value = Approx(record_value, c, decorate=False)
                    case weth.fields.Binary() as field:
                        record_value = record_value.content

                r[field_name] = record_value
            record_reformatted.append(r)

        try:
            self.assertSequenceEqual(expected_reformatted, record_reformatted, seq_type=list)
            return
        except AssertionError as e:
            standardMsg, _, diffMsg = str(e).rpartition('\n')
            if 'self.maxDiff' not in diffMsg:
                raise
            # move out of handler to avoid exception chaining

        diffMsg = "".join(difflib.unified_diff(
            pprint.pformat(expected_reformatted).splitlines(keepends=True),
            pprint.pformat(record_reformatted).splitlines(keepends=True),
            fromfile="expected", tofile="records",
        ))
        self.fail(self._formatMessage(None, standardMsg + '\n' + diffMsg))

    # turns out this thing may not be quite as useful as we thought...
    def assertItemsEqual(self, a, b, msg=None):
        self.assertCountEqual(a, b, msg=None)

    def assertTreesEqual(self, n1, n2, msg=None):
        self.assertIsNotNone(n1, msg)
        self.assertIsNotNone(n2, msg)
        self.assertEqual(n1.tag, n2.tag, msg)
        # Because lxml.attrib is an ordereddict for which order is important
        # to equality, even though *we* don't care
        self.assertEqual(dict(n1.attrib), dict(n2.attrib), msg)
        self.assertEqual((n1.text or u'').strip(), (n2.text or u'').strip(), msg)
        self.assertEqual((n1.tail or u'').strip(), (n2.tail or u'').strip(), msg)

        for c1, c2 in zip_longest(n1, n2):
            self.assertTreesEqual(c1, c2, msg)

    def _assertXMLEqual(self, original, expected, parser="xml"):
        """Asserts that two xmls archs are equal

        :param original: the xml arch to test
        :type original: str
        :param expected: the xml arch of reference
        :type expected: str
        :param parser: an string representing which lxml.Parser class to use
            when normalizing both archs. Takes either "xml" or "html"
        :type parser: str
        """
        self.maxDiff = 10000
        if original:
            original = _normalize_arch_for_assert(original, parser)
        if expected:
            expected = _normalize_arch_for_assert(expected, parser)
        self.assertEqual(original, expected)

    def assertXMLEqual(self, original, expected):
        return self._assertXMLEqual(original, expected)

    def assertHTMLEqual(self, original, expected):
        return self._assertXMLEqual(original, expected, 'html')

    def profile(self, description='', **kwargs):
        test_method = getattr(self, '_testMethodName', 'Unknown test method')
        if not hasattr(self, 'profile_session'):
            self.profile_session = profiler.make_session(test_method)
        if 'db' not in kwargs:
            kwargs['db'] = self.env.cr.dbname
        return profiler.Profiler(
            description='%s uid:%s %s %s' % (test_method, self.env.user.id, 'warm' if self.warm else 'cold', description),
            profile_session=self.profile_session,
            **kwargs)

    @classmethod
    def file_read(cls, path: str) -> BinaryBytes:
        """Read contents of a file using ``file_open``."""
        with file_open(path, 'rb') as f:
            return BinaryBytes(f.read())

    @classmethod
    @contextmanager
    def registry_test_mode(cls, *, cr: Cursor | None = None, registry: Registry | None = None):
        """ Entering registry test mode.

        New cursors returned by the registry will be instances of `TestCursor`
        which will wrap the current cursor.

        Defined in BaseCase because used by upgrade for IntegrityCase.
        This should be used on TransactionCase only.
        """
        assert not cls._registry_patched, 'Can only patch registry once'
        if cr is None:
            cr = cls.cr
        if registry is None:
            registry = cls.registry
        assert cr, 'No cursor'
        assert registry, 'No registry'

        def _patched_cursor(readonly: bool = False):
            return test_cursor.TestCursor(
                cr, _registry_test_lock, readonly and cls._registry_readonly_enabled
            )

        try:
            from weth.addons.bus.tools import misc as bus_misc  # noqa: PLC0415
        except ImportError:
            additional_patches = ()
        else:
            og_db_connect = bus_misc.db_connect

            def _patched_ws_db_connect(to, allow_uri=False, readonly=False):
                # acquire_cursor() opens a cursor via db_connect(db_name) directly instead
                # of going through Registry(db_name).cursor(), bypassing the patch above.
                # Redirect it to the test's cursor too.
                if to == cr.dbname:

                    class _TestConnection:
                        def cursor(self):
                            return _patched_cursor(readonly)

                    return _TestConnection()
                return og_db_connect(to, allow_uri=allow_uri, readonly=readonly)

            additional_patches = (
                patch.object(bus_misc, 'db_connect', _patched_ws_db_connect),
            )

        def get_sequences(cr):
            return registry.registry_sequence, registry.cache_sequences.copy()

        with ExitStack() as stack:
            for additional_patch in additional_patches:
                stack.enter_context(additional_patch)
            stack.enter_context(patch.object(cls, '_registry_patched', True))
            # New cursor should point to the test's cursor
            stack.enter_context(patch.object(registry, 'cursor', _patched_cursor))
            # Disable locking and signaling
            stack.enter_context(patch.object(Registry, '_lock', DummyRLock()))
            stack.enter_context(patch.object(registry, 'setup_signaling', return_value=None))  # noop
            yield

    @classmethod
    def set_registry_readonly_mode(cls, enabled: bool):
        assert cls._registry_patched, 'Registry is not patched'

        cls._registry_readonly_enabled = enabled

    def assertCanOpenTestCursor(self):
        """ Asserts that we can currently open a test cursor. """
        if weth.modules.module.current_test is not self:
            message = f"Trying to open a test cursor for {self.canonical_tag} while already in a test {weth.modules.module.current_test.canonical_tag}"
            _logger.runbot(message)
            raise BadRequest(message)
        if isinstance(request, Mock):
            return
        if not request or self.http_request_allow_all:
            return
        http_request_required_key = self.http_request_key
        # Read from the raw transmitted cookies rather than request.cookies.
        # The latter can be cleared by a handler (e.g. the force_guest auth
        # method in livechat CORS flows) before a new cursor is opened, which
        # would incorrectly fail this check even though the cookie was sent by
        # the test.
        http_request_key = request.httprequest.cookies.get(TEST_CURSOR_COOKIE_NAME)
        if http_request_key != http_request_required_key:
            expected = http_request_required_key
            if not expected:
                expected = 'None (request are not enabled)'
            _logger.runbot(
                'Request with path %s has been ignored during test as it '
                'it does not contain the test_cursor cookie or it is expired.'
                ' (required "%s", got "%s")',
                request.httprequest.path, expected, http_request_key
            )
            raise BadRequest(
                'Request ignored during test as it does not contain the required cookie.'
            )

    def make_jsonrpc_request(self, route, params=None, headers=None, cookies=None, timeout=12):
        """Make a JSON-RPC request to the server.

        :raises requests.HTTPError: if one occurred
        :raises JsonRpcException: if the response contains an error
        """
        if DISABLE_TIMEOUTS:
            timeout = None
        response = self.opener.post(urljoin(self.base_url(), route), json={
            'id': 0,
            'jsonrpc': '2.0',
            'method': 'call',
            'params': params or {},
        }, headers=headers, cookies=cookies, timeout=timeout)
        response.raise_for_status()
        decoded_response = response.json()
        if 'error' in decoded_response:
            raise JsonRpcException(
                code=decoded_response['error']['code'],
                message=decoded_response['error']['data']['name'],
            )
        return decoded_response['result']


def no_retry(arg):
    """Disable auto retry on decorated test method or test class"""
    arg._retry = False
    return arg


def users(*logins):
    """ Decorate a method to execute it once for each given user. """
    assert logins, "Expecting at least one login to execute"

    def users_decorator(func, /):
        @wraps(func)
        def with_users(self, *args, **kwargs):
            old_uid = self.uid
            try:
                # retrieve users
                Users = self.env['res.users'].with_context(active_test=False)
                user_id = {
                    user.login: user.id
                    for user in Users.search_fetch(
                        [('login', 'in', list(logins))],
                        ['login'], order='login',
                    )
                }
                for login in logins:
                    with self.subTest(login=login):
                        # switch user and execute func
                        self.uid = user_id[login]
                        func(self, *args, **kwargs)
                        self.env.flush_all()
                    # Invalidate the cache between subtests, in order to not reuse
                    # the former user's cache (`test_read_mail`, `test_write_mail`)
                    self.env.invalidate_all()
            finally:
                self.uid = old_uid

        return with_users
    return users_decorator


def warmup(func, /):
    """
    Stabilize assertQueries and assertQueryCount assertions.

    Reset the cache to a stable state by flushing pending changes and
    invalidating the cache.

    Warmup the ormcaches by running the decorated function an extra time
    before the actual test runs. The extra execution ignores
    assertQueries and assertQueryCount assertions, it also discardes all
    changes but the ormcaches ones.
    """
    @wraps(func)
    def warmup(self, *args, **kwargs):
        self.env.flush_all()
        self.env.invalidate_all()
        # run once to warm up the caches
        self.warm = False
        with contextlib.closing(self.cr.savepoint(flush=False)):
            func(self, *args, **kwargs)
            self.env.flush_all()
        # run once for real
        self.env.invalidate_all()
        self.warm = True
        func(self, *args, **kwargs)
    return warmup


def can_import(module):
    """ Checks if <module> can be imported, returns ``True`` if it can be,
    ``False`` otherwise.

    To use with ``unittest.skipUnless`` for tests conditional on *optional*
    dependencies, which may or may be present but must still be tested if
    possible.
    """
    try:
        importlib.import_module(module)
    except ImportError:
        return False
    else:
        return True


def tagged(*tags):
    """A decorator to tag BaseCase objects.

    Tags are stored in a set that can be accessed from a 'test_tags' attribute.

    A tag prefixed by '-' will remove the tag e.g. to remove the 'standard' tag.

    By default, all Test classes from weth.tests.common have a test_tags
    attribute that defaults to 'standard' and 'post_install'.

    When using class inheritance, the tags ARE inherited.
    """
    include = {t for t in tags if not t.startswith('-')}
    exclude = {t[1:] for t in tags if t.startswith('-')}

    def tags_decorator(obj):
        obj.test_tags = (getattr(obj, 'test_tags', set()) | include) - exclude
        at_install = 'at_install' in obj.test_tags
        post_install = 'post_install' in obj.test_tags
        if not (at_install ^ post_install):
            _logger.warning('A tests should be either at_install or post_install, which is not the case of %r', obj)
        return obj
    return tags_decorator


class freeze_time:
    """ Object to replace the freezegun in Odoo test suites
        It properly handles the test classes decoration
        Also, it can be used like the usual method decorator or context manager
    """
    _freeze_time = staticmethod(freezegun.freeze_time)

    def __init__(self, time_to_freeze=None, tz_offset=0, tick=False, as_kwarg='', auto_tick_seconds=0):
        self.freezer = self._freeze_time(
            time_to_freeze=time_to_freeze,
            tz_offset=tz_offset,
            tick=tick,
            as_kwarg=as_kwarg,
            auto_tick_seconds=auto_tick_seconds,
        )

    def __call__(self, arg):
        if isinstance(arg, type) and issubclass(arg, case.TestCase):
            arg.freeze_time = self
            return arg

        return self.freezer(arg)

    def __enter__(self):
        return self.freezer.start()

    def __exit__(self, *args):
        self.freezer.stop()

    start = __enter__
    stop = __exit__


freezegun.freeze_time = freeze_time

safe_whitelist.add_class('freezegun.api.FakeDate')
safe_whitelist.add_class('freezegun.api.FakeDatetime')
safe_whitelist.add_function('FakeDate.*')
safe_whitelist.add_function('FakeDatetime.*')
safe_whitelist.add_instance('weth.sql_db.TestCursor')
safe_whitelist.add_instance('weth.tests.*')
safe_whitelist.add_instance('unittest.mock.MagicMock')
safe_whitelist.add_instance('unittest.mock.Mock')
