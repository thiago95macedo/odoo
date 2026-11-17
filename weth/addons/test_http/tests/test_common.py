# Part of WETH. See LICENSE file for full copyright and licensing details.

from datetime import UTC, datetime
from unittest.mock import patch

from werkzeug.datastructures import ResponseCacheControl
from werkzeug.http import parse_cache_control_header

import weth.http.geoip
from weth.http.router import root
from weth.tools import config, reset_cached_properties

from weth.addons.base.tests.common import HttpCaseWithUserDemo
from weth.addons.test_http.utils import MemoryGeoipResolver

HTTP_DATETIME_FORMAT = '%a, %d %b %Y %H:%M:%S GMT'


class TestHttpBase(HttpCaseWithUserDemo):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        geoip_resolver = MemoryGeoipResolver()

        reset_cached_properties(root)
        cls.addClassCleanup(reset_cached_properties, root)
        cls.classPatch(config, 'options', config.options.new_child({
            'server_wide_modules': ['base', 'web', 'rpc', 'test_http'],
        }))
        cls.classPatch(weth.http.geoip, '_geoip_city_db', lambda: geoip_resolver)
        cls.classPatch(weth.http.geoip, '_geoip_country_db', lambda: geoip_resolver)

    def db_url_open(self, url, *args, allow_redirects=False, **kwargs):
        return self.url_open(url, *args, allow_redirects=allow_redirects, **kwargs)

    def nodb_url_open(self, url, *args, allow_redirects=False, **kwargs):
        with patch('weth.http.router.db_list') as db_list, \
             patch('weth.http.router.db_filter') as db_filter:
            db_list.return_value = []
            db_filter.return_value = []
            return self.url_open(url, *args, allow_redirects=allow_redirects, **kwargs)

    def multidb_url_open(self, url, *args, allow_redirects=False, dblist=(), **kwargs):
        dblist = dblist or self.db_list
        assert len(dblist) >= 2, "There should be at least 2 databases"
        with patch('weth.http.router.db_list') as db_list, \
             patch('weth.http.router.db_filter') as db_filter, \
             patch('weth.http.router.Registry') as Registry:
            db_list.return_value = dblist
            db_filter.side_effect = lambda dbs, host=None: [db for db in dbs if db in dblist]
            Registry.return_value = self.registry
            return self.url_open(url, *args, allow_redirects=allow_redirects, **kwargs)

    def parse_http_cache_control(self, cache_control):
        return parse_cache_control_header(cache_control, None, ResponseCacheControl)

    def assertCacheControl(self, response, cache_control):
        self.assertEqual(
           self.parse_http_cache_control(response.headers['Cache-Control']),
           self.parse_http_cache_control(cache_control),
        )

    def parse_http_expires(self, expires):
        return datetime.strptime(expires, HTTP_DATETIME_FORMAT).replace(tzinfo=UTC)
