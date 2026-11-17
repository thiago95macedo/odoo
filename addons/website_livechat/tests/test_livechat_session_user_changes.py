# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import tests
from weth.addons.website_livechat.tests.common import TestLivechatCommon


class TestLivechatSessionUserChanges(tests.HttpCase, TestLivechatCommon):
    def test_livechat_logout_after_chat_start(self):
        self.start_tour("/", "website_livechat_logout_after_chat_start", login="admin")
