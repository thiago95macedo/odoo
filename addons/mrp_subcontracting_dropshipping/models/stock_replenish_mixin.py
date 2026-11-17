# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import models
from weth.fields import Domain


class StockReplenishMixin(models.AbstractModel):
    _inherit = 'stock.replenish.mixin'

    def _get_allowed_route_domain(self):
        domains = super()._get_allowed_route_domain()
        return Domain.AND([domains, [('id', '!=', self.env.ref('stock_dropshipping.route_drop_shipping', raise_if_not_found=False).id)]])
