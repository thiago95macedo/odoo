# Part of WETH. See LICENSE file for full copyright and licensing details.

from markupsafe import Markup

from weth import models, fields


class ResUsers(models.Model):
    _inherit = 'res.users'

    odoobot_state = fields.Selection(
        [
            ('not_initialized', 'Not initialized'),
            ('onboarding_emoji', 'Onboarding emoji'),
            ('onboarding_attachement', 'Onboarding attachment'),
            ('onboarding_command', 'Onboarding command'),
            ('onboarding_ping', 'Onboarding ping'),
            ('onboarding_canned', 'Onboarding canned'),
            ('idle', 'Idle'),
            ('disabled', 'Disabled'),
        ], string="WethBot Status", readonly=True, required=False)
    odoobot_failed = fields.Boolean(readonly=True)
    wethbot_state = fields.Selection(related='odoobot_state', readonly=False)
    wethbot_failed = fields.Boolean(related='odoobot_failed', readonly=False)

    def _on_webclient_bootstrap(self):
        super()._on_webclient_bootstrap()
        if self._is_internal() and self.wethbot_state in [False, "not_initialized"]:
            self._init_wethbot()

    def _init_wethbot(self):
        self.ensure_one()
        wethbot_id = self.env['ir.model.data']._xmlid_to_res_id("base.partner_root")
        channel = self.env['discuss.channel']._get_or_create_chat([wethbot_id, self.partner_id.id])
        message = Markup("%s<br/>%s<br/><b>%s</b>") % (
            self.env._("Hello 👋"),
            self.env._("WETH's Discuss application helps employees collaborate efficiently. I'm here to help you explore its features."),
            self.env._("Go ahead - Try sending me an emoji 😊")
        )
        channel.sudo().message_post(
            author_id=wethbot_id,
            body=message,
            message_type="comment",
            silent=True,
            subtype_xmlid="mail.mt_comment",
        )
        self.sudo().wethbot_state = 'onboarding_emoji'
        return channel
