# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import tests
from weth.addons.website_livechat.tests.common import TestLivechatCommon


class TestBusLazyFrontendBus(tests.HttpCase, TestLivechatCommon):
    def test_bus_not_started(self):
        self.start_tour("/", "website_livechat.lazy_frontend_bus")
