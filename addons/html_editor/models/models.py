# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import api, models


class Base(models.AbstractModel):
    _inherit = 'base'

    @api.model
    def _get_view_field_attributes(self):
        keys = super()._get_view_field_attributes()
        keys.append('sanitize')
        keys.append('sanitize_tags')
        return keys
