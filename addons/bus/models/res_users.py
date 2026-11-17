# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import models


class ResUsers(models.Model):
    _name = "res.users"
    _inherit = ["res.users", "bus.listener.mixin"]
