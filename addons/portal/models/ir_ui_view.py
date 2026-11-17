# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import models, fields


class IrUiView(models.Model):
    _inherit = "ir.ui.view"

    customize_show = fields.Boolean("Show As Optional Inherit", default=False)
