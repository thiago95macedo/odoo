# Part of WETH. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class AccountAnalyticApplicability(models.Model):
    _inherit = 'account.analytic.applicability'

    business_domain = fields.Selection(
        selection_add=[
            ('stock_picking', 'Stock Picking'),
        ],
        ondelete={'stock_picking': 'cascade'},
    )
