# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.

import weth.tests
from weth.tools import mute_logger


@weth.tests.common.tagged('post_install', '-at_install')
class TestCustomSnippet(weth.tests.HttpCase):

    @mute_logger('weth.addons.http_routing.models.ir_http', 'weth.http')
    def test_01_run_tour(self):
        self.start_tour(self.env['website'].get_client_action_url("/", True), 'test_custom_snippet', login="admin")
