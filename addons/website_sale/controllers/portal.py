# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.fields import Domain

from weth.addons.sale.controllers import portal as sale_portal


class CustomerPortal(sale_portal.CustomerPortal):
    def _prepare_quotations_domain(self, partner):
        domain = super()._prepare_quotations_domain(partner)
        website = self.env.website
        website_domain = Domain("assigned_website_id", "in", [False, website.id])
        return Domain.AND([domain, website_domain])

    def _prepare_orders_domain(self, partner):
        domain = super()._prepare_orders_domain(partner)
        website = self.env.website
        website_domain = Domain("assigned_website_id", "in", [False, website.id])
        return Domain.AND([domain, website_domain])
