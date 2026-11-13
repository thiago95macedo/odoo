# Part of WETH. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class WebsiteTrack(models.Model):
    _inherit = 'website.track'

    slide_channel_id = fields.Many2one(
        comodel_name='slide.channel', ondelete='cascade', readonly=True, index='btree_not_null',
    )
