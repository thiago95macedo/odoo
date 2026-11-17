# Part of WETH. See LICENSE file for full copyright and licensing details.

from datetime import timedelta

from weth import fields, http
from weth.exceptions import ValidationError
from weth.fields import Command
from weth.tests import HttpCase, tagged
from weth.tools import SQL

from weth.addons.sale.tests.common import TestSaleCommon
from weth.addons.website_sale.tests.common import MockRequest, WebsiteSaleCommon
from weth.addons.website_sale_loyalty.controllers.cart import Cart
from weth.addons.website_sale_loyalty.controllers.main import WebsiteSale


@tagged("post_install", "-at_install")
class WebsiteSaleLoyaltyTestUi(TestSaleCommon, HttpCase):
    _test_user_groups = None  # FIXME list needed groups

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        if "payment_stripe" in cls.env["ir.module.module"]._installed():
            cls.env["payment.provider"].search([
                ("code", "=", "stripe")
            ]).allow_express_checkout = False

        cls.env.ref("base.user_admin").sudo().write({
            "company_id": cls.env.company.id,
            "company_ids": [(4, cls.env.company.id)],
            "name": "Mitchell Admin",
            "email": "mitchell.admin@example.com",
            "street": "215 Vine St",
            "phone": "+1 555-555-5555",
            "city": "Scranton",
            "zip": "18503",
            "country_id": cls.env.ref("base.us").id,
            "state_id": cls.env.ref("base.state_us_39").id,
        })
        cls.env.ref("base.user_admin").sudo().partner_id.company_id = cls.env.company
        cls.env.ref("base.default_website").company_id = cls.env.company
        cls.public_category = cls.env["product.public.category"].create({"name": "Public Category"})





@tagged("post_install", "-at_install")
class TestWebsiteSaleCoupon(HttpCase, WebsiteSaleCommon):
    _test_user_groups = (
        "base.group_user",
        "product.group_product_manager",
        "sales_team.group_sale_manager",  # FIXME: use sales_team.group_sale_salesman
    )

    _test_user_name = "Test Sales & Product Manager"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        program = cls.env["loyalty.program"].create({
            "name": "10% TEST Discount",
            "trigger": "with_code",
            "applies_on": "current",
            "rule_ids": [Command.create({})],
            "reward_ids": [
                Command.create({
                    "reward_type": "discount",
                    "discount": 10,
                    "discount_mode": "percent",
                })
            ],
        })

        cls.env["loyalty.generate.wizard"].with_context(active_id=program.id).create({
            "coupon_qty": 1,
            "points_granted": 1,
        }).generate_coupons()
        cls.coupon = program.coupon_ids[0]

    def _apply_promo_code(self, order, code, no_reward_fail=True):
        status = order._try_apply_code(code)
        if "error" in status:
            raise ValidationError(status["error"])
        if not status and no_reward_fail:
            # Can happen if global discount got filtered out in `_get_claimable_rewards`
            raise ValidationError(self.env._("No reward to claim with this coupon"))
        coupons = self.env["loyalty.card"]
        rewards = self.env["loyalty.reward"]
        for coupon, coupon_rewards in status.items():
            coupons |= coupon
            rewards |= coupon_rewards
        if len(coupons) == 1 and len(rewards) == 1:
            status = order._apply_program_reward(rewards, coupons)
            if "error" in status:
                raise ValidationError(status["error"])

    def test_01_gc_coupon(self):
        # 1. Simulate a frontend order (website, product)
        product = self.env["product.product"].create({
            "name": "Product A",
            "list_price": 100,
            "sale_ok": True,
        })
        order = self._create_so(
            order_line=[Command.create({"product_id": product.id, "product_uom_qty": 2.0})]
        )

        # 2. Apply the coupon
        self._apply_promo_code(order, self.coupon.code)

        self.assertEqual(
            len(order.applied_coupon_ids), 1, "The coupon should've been applied on the order"
        )
        self.assertEqual(self.coupon, order.applied_coupon_ids)

        # 3. Test recent order -> Should not be removed
        order._gc_abandoned_coupons()

        self.assertEqual(
            len(order.applied_coupon_ids),
            1,
            "The coupon shouldn't have been removed from the order no more than 4 days",
        )

        # 4. Test order not older than ICP validity -> Should not be removed
        ICP = self.env["ir.config_parameter"].sudo()
        ICP.set_int("website_sale_coupon.abandonned_coupon_validity", 5)
        self.env.flush_all()
        self.env.cr.execute(
            SQL(
                "UPDATE %s SET write_date = %s WHERE id = %s",
                SQL.identifier(order._table),
                fields.Datetime.to_string(fields.Datetime.now() - timedelta(days=4, hours=2)),
                order.id,
            )
        )
        order._gc_abandoned_coupons()

        self.assertEqual(
            len(order.applied_coupon_ids),
            1,
            "The coupon shouldn't have been removed from the order the order is 4 days old but icp"
            " validity is 5 days",
        )

        # 5. Test order with no ICP and older then 4 default days -> Should be removed
        ICP.search([("key", "=", "website_sale_coupon.abandonned_coupon_validity")]).unlink()
        order._gc_abandoned_coupons()

        self.assertEqual(
            len(order.applied_coupon_ids),
            0,
            "The coupon should've been removed from the order as more than 4 days",
        )


    def test_03_remove_coupon(self):
        # 1. Simulate a frontend order (website, product)
        product = self.env["product.product"].create({
            "name": "Product A",
            "list_price": 100,
            "sale_ok": True,
        })
        order = self._create_so(order_line=[Command.create({"product_id": product.id})])

        # 2. Apply the coupon
        self._apply_promo_code(order, self.coupon.code)

        # 3. Remove the coupon
        coupon_line = order.website_order_line.filtered(
            lambda line: line.coupon_id and line.coupon_id.id == self.coupon.id
        )

        website = self.website
        with MockRequest(website.env, website=self.website, sale_order_id=order.id):
            Cart().update_cart(line_id=None, quantity=0.0, product_id=coupon_line.product_id.id)

        msg = "The coupon should've been removed from the order"
        self.assertEqual(len(order.applied_coupon_ids), 0, msg=msg)

    def test_04_apply_coupon_code_twice(self):
        """Ensure that applying a coupon with code twice will:
        1. Raise an error.
        2. Not delete the coupon.
        """
        # Create product
        product = self.env["product.product"].create({
            "name": "Product",
            "list_price": 100,
            "sale_ok": True,
            "taxes_id": [],
        })

        order = self._create_so(order_line=[Command.create({"product_id": product.id})])

        WebsiteSaleController = WebsiteSale()

        installed_modules = set(
            self.env["ir.module.module"].search([("state", "=", "installed")]).mapped("name")
        )
        for __ in http.routing_map._generate_routing_rules(installed_modules, nodb_only=False):
            pass

        with self.mock_request(path="/shop/cart", sale_order_id=order.id) as request:
            # Check the base cart value
            self.assertEqual(order.amount_total, 100.0, "The base cart value is incorrect.")

            # Apply coupon for the first time
            WebsiteSaleController.pricelist(promo=self.coupon.code)

            # Check that the coupon has been applied
            self.assertEqual(order.amount_total, 90.0, "The coupon is not applied.")

            # Apply the coupon again
            WebsiteSaleController.pricelist(promo=self.coupon.code)
            Cart().cart()
            error_msg = request.session.get("error_promo_code")

            # Check that the coupon stay applied
            self.assertEqual(
                bool(error_msg), True, "Apply a coupon twice should display an error message"
            )
            self.assertEqual(order.amount_total, 90.0, "Apply a coupon twice shouldn't delete it")

    def test_03_remove_coupon_with_different_taxes_on_products(self):
        """Test the removal of a coupon from an order containing products with various tax rates,
        ensuring that the system correctly handles multiple coupon lines created for each unique tax
        scenario.

        Background:
            An order may include products with different tax implications,
            such as non-taxed products, products with a single tax rate,
            and products with multiple tax rates. When a coupon is applied,
            it creates separate coupon lines for each distinct tax situation
            (non-taxed, individual taxes, and combinations of taxes).
            This test verifies that the coupon deletion process accurately removes
            all associated coupon lines, maintaining the financial accuracy of the order.

        Steps:
            1. Create an order with products subject to different tax scenarios:
            - Non-taxed product 'Product A'
            - Product 'Product B' with Tax A
            - Product 'Product C' with Tax B
            - Product 'Product D' subject to both Tax A and Tax B
            2. Apply a coupon, which generates four distinct coupon lines
                to reflect each tax scenario.
            3. Remove the coupon and verify that all coupon lines are removed and
                that no coupons remain applied.
        """
        # Create 2 Taxes
        tax_a = (
            self
            .env["account.tax"]
            .sudo()
            .create({
                "name": "Tax A",
                "type_tax_use": "sale",
                "amount_type": "percent",
                "amount": 15,
            })
        )
        tax_b = tax_a.copy({"name": "Tax B"})

        # Create 4 products subject to different tax
        products_data = [
            ("Product A", []),
            ("Product B", [tax_a.id]),
            ("Product C", [tax_b.id]),
            ("Product D", [tax_a.id, tax_b.id]),
        ]

        products = self.env["product.product"].create([
            {"name": name, "list_price": 100, "sale_ok": True, "taxes_id": [Command.set(taxes_id)]}
            for name, taxes_id in products_data
        ])

        order = self._create_so(
            order_line=[Command.create({"product_id": product.id}) for product in products]
        )

        msg = "There should only be 4 lines for the 4 products."
        self.assertEqual(len(order.order_line), 4, msg=msg)

        # 2. Apply the coupon
        self._apply_promo_code(order, self.coupon.code)

        msg = (
            "4 additional lines should have been added to the sale orders"
            "after application of the coupon for each separate tax situation."
        )
        self.assertEqual(len(order.order_line), 8, msg=msg)

        # 3. Remove the coupon
        coupon_line = order.website_order_line.filtered(
            lambda line: line.coupon_id and line.coupon_id.id == self.coupon.id
        )
        website = self.website
        with MockRequest(website.env, website=self.website, sale_order_id=order.id):
            Cart().update_cart(line_id=None, quantity=0.0, product_id=coupon_line.product_id.id)

        msg = "All coupon lines should have been removed from the order."
        self.assertEqual(len(order.applied_coupon_ids), 0, msg=msg)
        self.assertEqual(len(order.order_line), 4, msg=msg)

    def test_confirm_points_as_public_user(self):
        test_product = self.env["product.product"].create({
            "name": "Test Product",
            "list_price": 100,
            "sale_ok": True,
        })
        test_partner = self.env["res.partner"].create({"name": "Test Partner"})

        loyalty_program = self.env["loyalty.program"].create({
            "name": "Loyalty Program",
            "program_type": "loyalty",
            "trigger": "auto",
            "applies_on": "both",
            "rule_ids": [
                Command.create({
                    "reward_point_mode": "unit",
                    "reward_point_amount": 1,
                    "product_ids": [test_product.id],
                })
            ],
            "reward_ids": [
                Command.create({
                    "reward_type": "discount",
                    "discount": 1.5,
                    "discount_mode": "per_point",
                    "discount_applicability": "order",
                    "required_points": 3,
                })
            ],
        })

        order = self.env["sale.order"].create({
            "partner_id": test_partner.id,
            "order_line": [Command.create({"product_id": test_product.id, "product_uom_qty": 1})],
        })

        loyalty_card = self.env["loyalty.card"].create({
            "program_id": loyalty_program.id,
            "partner_id": test_partner.id,
        })
        public_user = self.env.ref("base.public_user")
        order.action_quotation_send()
        order.with_context(access_token=order.access_token, user=public_user).action_confirm()
        self.assertEqual(loyalty_card.points, 1)
