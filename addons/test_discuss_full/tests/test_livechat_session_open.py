# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.addons.im_livechat.tests.common import TestImLivechatCommon
from weth.tests import new_test_user
from weth import fields

from datetime import timedelta
from freezegun import freeze_time


class TestImLivechatSessions(TestImLivechatCommon):
    def test_livechat_session_open(self):
        new_test_user(
            self.env,
            login="operator",
            groups="base.group_user,im_livechat.im_livechat_group_manager",
        )
        target_date = fields.Datetime.now() - timedelta(days=15)
        with freeze_time(target_date):  # Freeze time to make sure record appears with default filter
            self.make_jsonrpc_request(
                "/im_livechat/get_session", {"channel_id": self.livechat_channel.id}
            )
        action = self.env.ref("im_livechat.discuss_channel_action_from_livechat_channel")
        self.start_tour(
            f"/weth/livechat/{self.livechat_channel.id}/action-{action.id}", "im_livechat_session_open",
            login="operator",
        )
