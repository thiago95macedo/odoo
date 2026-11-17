# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import fields, models


class ResUsersSettings(models.Model):
    _inherit = "res.users.settings"

    calendar_show_activities = fields.Boolean(string='Show Activities in Calendar', default=True)
