# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import models, fields
from weth.addons.mail.tools.discuss import Store


class MailActivity(models.Model):
    _inherit = "mail.activity"

    request_partner_id = fields.Many2one("res.partner", string="Requesting Partner", ondelete="cascade")

    def _store_activity_fields(self, res: Store.FieldList):
        super()._store_activity_fields(res)
        res.attr("request_partner_id")
