# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.fields import Command
from weth.tests import tagged

from weth.addons.base.tests.common import HttpCaseWithUserPortal
from weth.addons.http_routing.tests.common import MockRequest


@tagged("post_install", "-at_install")
class TestWebsiteSaleReorderFromPortal(HttpCaseWithUserPortal):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls.website = cls.env.ref('base.default_website')
        cls.website.write({"prevent_sale": False})
        cls.empty_cart = cls.env["sale.order"].create({"partner_id": cls.partner_portal.id})
        cls.product_1, cls.product_2 = cls.env["product.product"].create([
            {"name": "Reorder Product 1", "sale_ok": True, "website_published": True},
            {"name": "Reorder Product 2", "sale_ok": True, "website_published": True},
        ])


    def test_is_reorder_allowed(self):
        line_published_product = Command.create({"product_id": self.product_1.id})
        self.product_2.active = False
        line_archived_product = Command.create({"product_id": self.product_2.id})
        line_section = Command.create({"name": "Free line", "display_type": "line_section"})
        line_downpayment = Command.create({
            "name": "Down with the Payment",
            "is_downpayment": True,
            "price_unit": 5,
        })

        order = self.empty_cart.with_user(self.user_portal).sudo()
        order.order_line = [line_section]
        order.action_confirm()

        with MockRequest(self.env, website=self.website):
            self.assertFalse(
                order._is_reorder_allowed(), "Reordering a line section should not be allowed"
            )

            order.order_line = [line_archived_product]
            self.assertFalse(
                order._is_reorder_allowed(), "Reordering an archived product should not be allowed"
            )

            order.order_line = [line_published_product]
            self.assertTrue(
                order._is_reorder_allowed(), "Reordering a published product should be allowed"
            )

            self.product_1.website_published = False
            self.assertFalse(
                order._is_reorder_allowed(),
                "Reordering an unpublished product should not be allowed",
            )

            order.order_line = [line_downpayment]
            self.assertFalse(
                order._is_reorder_allowed(), "Reordering a down payment should not be allowed"
            )

            self.product_2.write({"active": True, "list_price": 0.0})
            self.assertTrue(
                order._is_reorder_allowed(),
                "Reordering a zero-priced product should be allowed when enabled",
            )
