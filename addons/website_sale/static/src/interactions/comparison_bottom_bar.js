import { Interaction } from '@web/public/interaction';
import { registry } from '@web/core/registry';
import {
    ProductComparisonBottomBar
} from '@website_sale/js/product_comparison_bottom_bar/product_comparison_bottom_bar';

export class ComparisonBottomBar extends Interaction {
    static selector = 'main:has(.w_wsale_product_page, .w_wsale_products_page, .w_wsale_wishlist_page, .s_dynamic_snippet_products)';

    setup() {
        // Mount the ProductComparisonBottomBar on pages with comparison functionality.
        this.mountComponent(this.el, ProductComparisonBottomBar);
    }
}

registry
    .category('public.interactions')
    .add('website_sale.comparison_bottom_bar', ComparisonBottomBar);
