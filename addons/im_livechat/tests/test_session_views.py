# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import Command, fields
from weth.tests import new_test_user
from weth.addons.im_livechat.tests.common import TestImLivechatCommon
from weth.tests.common import users

from datetime import timedelta


class TestImLivechatSessionViews(TestImLivechatCommon):


    def test_partner_display_name(self):
        user = new_test_user(self.env, login="agent", name="john")
        company = self.env["res.partner"].create({"name": "TestCompany"})
        user.partner_id.parent_id = company.id
        self.assertEqual(
            user.with_context(im_livechat_hide_partner_company=True).partner_id.display_name,
            "john",
        )
        self.assertEqual(user.partner_id.display_name, "TestCompany, john")


class TestImLivechatLookingForHelpViews(TestImLivechatSessionViews):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls.bob = new_test_user(
            cls.env,
            login="bob_looking_for_help",
            groups="base.group_user,im_livechat.im_livechat_group_user",
        )
        cls.livechat_channel.user_ids |= cls.bob

    def start_needhelp_session(self, guest_name=None):
        self.authenticate(None, None)
        cookies = {}
        if guest_name:
            guest = self.env["mail.guest"].create({"name": guest_name})
            cookies = {guest._cookie_name: guest._format_auth_cookie()}
        data = self.make_jsonrpc_request(
            "/im_livechat/get_session",
            {
                "channel_id": self.livechat_channel.id,
                "previous_operator_id": self.bob.partner_id.id,
            },
            cookies=cookies,
        )
        chat = self.env["discuss.channel"].browse(data["channel_id"])
        chat.livechat_status = "need_help"
        return chat

