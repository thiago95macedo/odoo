# Part of WETH. See LICENSE file for full copyright and licensing details.

import logging

from odoo import api, fields, models, modules, _

_logger = logging.getLogger(__name__)

COMPANY_AC_TIMEOUT = 5


class ResCompany(models.Model):
    _inherit = 'res.company'

    @api.model
    def _get_view(self, view_id=None, view_type='form', **options):
        arch, view = super()._get_view(view_id, view_type, **options)

        if view_type == 'form':
            for i, node in enumerate(arch.xpath("//field[@name='name' or @name='vat' or @name='duns']")):
                node.set('widget', 'field_partner_autocomplete')

        return arch, view
