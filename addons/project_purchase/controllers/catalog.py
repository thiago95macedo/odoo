# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.http import request, route

from weth.addons.product.controllers.catalog import ProductCatalogController


class ProjectPurchaseCatalogController(ProductCatalogController):

    @route()
    def product_catalog_update_order_line_info(self, *args, **kwargs):
        if project_id := kwargs.get('project_id'):
            request.update_context(project_id=project_id)
        return super().product_catalog_update_order_line_info(*args, **kwargs)
