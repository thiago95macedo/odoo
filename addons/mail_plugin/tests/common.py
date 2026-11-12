# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import json
from contextlib import contextmanager
from unittest.mock import patch

from odoo.addons.mail.tests.common import mail_new_test_user
from odoo.http import request
from odoo.tests.common import HttpCase
from odoo import SUPERUSER_ID


@contextmanager
def mock_auth_method_outlook(login):
    """Mock the Outlook auth method.

    This must be used as a method decorator.

    :param login: Login of the user used for the authentication
    """
    def patched_auth_method_outlook(*args, **kwargs):
        request.update_env(user=request.env['res.users'].with_user(SUPERUSER_ID).search([('login', '=', login)], limit=1))

    with patch(
            'odoo.addons.mail_plugin.models.ir_http.IrHttp'
            '._auth_method_outlook',
            new=patched_auth_method_outlook):
        yield


class TestMailPluginControllerCommon(HttpCase):
    def setUp(self):
        super(TestMailPluginControllerCommon, self).setUp()
        self.user_test = mail_new_test_user(
            self.env,
            login="employee",
            groups="base.group_user,base.group_partner_manager",
        )
