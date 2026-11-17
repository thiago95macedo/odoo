# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.fields import Command
from weth.tests import HttpCase, JsonRpcException, tagged
from weth.tools import mute_logger

from weth.addons.website_sale.tests.common import WebsiteSaleCommon


@tagged("post_install", "-at_install")
class TestWebsiteSaleComboConfigurator(HttpCase, WebsiteSaleCommon):
    _test_user_groups = (
        'base.group_user',
        'product.group_product_manager',
        'sales_team.group_sale_manager',  # FIXME: use sales_team.group_sale_salesman
        'website.group_website_designer',  # website config (show_line_subtotals_tax_selection)
    )

    _test_user_name = 'Test Sales & Product Manager'




    @mute_logger("weth.http")
    def test_website_sale_combo_configurator_incomplete_selection(self):
        """ Test that a combo can't be added to the cart with missing combo choices. """
        combos = self.env["product.combo"].create([{
            "name": f"Combo {suffix}",
            "combo_item_ids": [Command.create({"product_id": self._create_product().id})],
        } for suffix in ("A", "B")])
        combo_product = self._create_product(type="combo", combo_ids=[Command.set(combos.ids)])
        item_a, item_b = combos.combo_item_ids

        def add_to_cart(combo_items):
            return self.make_jsonrpc_request("/shop/cart/add", {
                "product_template_id": combo_product.product_tmpl_id.id,
                "product_id": combo_product.id,
                "quantity": 1,
                "linked_products": [{
                    "product_template_id": item.product_id.product_tmpl_id.id,
                    "parent_product_template_id": combo_product.product_tmpl_id.id,
                    "quantity": 1,
                    "product_id": item.product_id.id,
                    "combo_item_id": item.id,
                    "no_variant_attribute_value_ids": [],
                    "product_custom_attribute_values": [],
                } for item in combo_items],
            })

        with self.assertRaises(JsonRpcException):  # A combo choice is unanswered.
            add_to_cart(item_a)
        with self.assertRaises(JsonRpcException):  # The same combo choice is answered twice.
            add_to_cart(item_a + item_a)
        with self.assertRaises(JsonRpcException):  # Every choice is answered, but one twice.
            add_to_cart(item_a + item_a + item_b)
        self.assertEqual(add_to_cart(item_a + item_b)["quantity"], 1)
