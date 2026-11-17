# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import Command
from weth.addons.crm_livechat.tests import chatbot_common


class CrmChatbotCase(chatbot_common.CrmChatbotCase):

    def test_chatbot_create_lead_public_user(self):
        self._play_session_with_lead()

        created_lead = self.env['crm.lead'].sudo().search([], limit=1, order='id desc')
        self.assertEqual(created_lead.name, "Testing Bot's New Lead")
        self.assertEqual(created_lead.email_from, 'test2@example.com')
        self.assertEqual(created_lead.phone, "+919876543210")

        self.assertEqual(created_lead.team_id, self.sale_team)
        self.assertEqual(created_lead.type, 'opportunity')

        # UTMs
        self.assertEqual(created_lead.utm_reference, self.chatbot_script)
        self.assertEqual(created_lead.source_id, self.env.ref("im_livechat.utm_source_chatbot"))
        self.assertFalse(created_lead.campaign_id)

    def test_chatbot_create_lead_portal_user(self):
        self.authenticate(self.user_portal.login, self.user_portal.login)
        self.step_create_lead.write({'crm_team_id': self.sale_team_with_lead})
        self._play_session_with_lead()

        created_lead = self.env['crm.lead'].sudo().search([], limit=1, order='id desc')
        self.assertEqual(created_lead.name, "Testing Bot's New Lead")
        self.assertNotEqual(created_lead.email_from, 'test2@example.com', "User's email should'nt have been overridden")
        self.assertEqual(created_lead.phone, "+919876543210", "User's phone should have been updated")

        self.assertEqual(created_lead.team_id, self.sale_team_with_lead)
        self.assertEqual(created_lead.type, 'lead')

        # UTMs
        self.assertEqual(created_lead.utm_reference, self.chatbot_script)
        self.assertEqual(created_lead.source_id, self.env.ref("im_livechat.utm_source_chatbot"))
        self.assertFalse(created_lead.campaign_id)

    def test_chatbot_create_lead_company(self):
        self.user_portal.write({"company_ids": self.company_2, "company_id": self.company_2})
        team = self.sale_team_with_lead
        partner = self.user_portal.partner_id
        self.step_create_lead.crm_team_id = team
        self.authenticate(self.user_portal.login, self.user_portal.login)

        def play_script_and_get_created_lead():
            self.env["crm.lead"].search([]).unlink()
            self._play_session_with_lead()
            return self.env["crm.lead"].sudo().search([], limit=1, order="id desc")

        # lead has company of partner and no team if no company matching
        partner.company_id = self.company_2
        team.company_id = self.company_3
        lead = play_script_and_get_created_lead()
        self.assertEqual(lead.company_id, self.company_2)
        self.assertFalse(lead.team_id)
        # lead has common company of partner and team if both are matching
        partner.company_id = self.company_2
        team.company_id = self.company_2
        self.assertEqual(play_script_and_get_created_lead().company_id, self.company_2)
        # lead has team company if partner has no company
        partner.company_id = False
        team.company_id = self.company_2
        self.assertEqual(play_script_and_get_created_lead().company_id, self.company_2)
        # lead has partner company if team has no company
        partner.company_id = self.company_2
        team.company_id = False
        self.assertEqual(play_script_and_get_created_lead().company_id, self.company_2)
        # lead has no company if no company on partner and team
        partner.company_id = False
        team.company_id = False
        self.assertFalse(play_script_and_get_created_lead().company_id)

    def _play_session_with_lead(self):
        data = self.make_jsonrpc_request("/im_livechat/get_session", {
            'channel_id': self.livechat_channel.id,
            'chatbot_script_id': self.chatbot_script.id,
        })
        discuss_channel = (
            self.env["discuss.channel"].sudo().browse(data["channel_id"])
        )
        self._post_answer_and_trigger_next_step(
            discuss_channel, chatbot_script_answer=self.step_dispatch_create_lead
        )
        self.assertEqual(discuss_channel.chatbot_current_step_id, self.step_create_lead_email)
        self._post_answer_and_trigger_next_step(discuss_channel, email="test2@example.com")
        self.assertEqual(discuss_channel.chatbot_current_step_id, self.step_create_lead_phone)
        self._post_answer_and_trigger_next_step(discuss_channel, "+919876543210")
        self.assertEqual(discuss_channel.chatbot_current_step_id, self.step_create_lead)
        return discuss_channel

