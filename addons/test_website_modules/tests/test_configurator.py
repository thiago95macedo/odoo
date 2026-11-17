# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.

import weth.tests
from weth.addons.website.tests.test_configurator import TestConfiguratorCommon


@weth.tests.common.tagged('post_install', '-at_install')
class TestConfigurator(TestConfiguratorCommon):

    def test_01_configurator_flow(self):
        self.start_tour('/weth/action-website.action_website_configuration', 'configurator_flow', login="admin", timeout=120)
