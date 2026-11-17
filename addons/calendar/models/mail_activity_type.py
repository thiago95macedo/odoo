# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import models, fields


class MailActivityType(models.Model):
    _inherit = "mail.activity.type"

    category = fields.Selection(selection_add=[('meeting', 'Meeting')])
