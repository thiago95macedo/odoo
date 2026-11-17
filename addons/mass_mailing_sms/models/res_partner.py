# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import api, models


class ResPartner(models.Model):
    _inherit = "res.partner"

    @api.depends('phone_sanitized')
    def _compute_mailing_contact_id(self):
        return super()._compute_mailing_contact_id()
