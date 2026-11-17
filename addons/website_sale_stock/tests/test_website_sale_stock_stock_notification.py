# Part of WETH. See LICENSE file for full copyright and licensing details.

from contextlib import contextmanager

from lxml import html

from weth.tests import tagged
from weth.tests.common import HttpCase

from weth.addons.website_sale_stock.tests.common import WebsiteSaleStockCommon


@tagged("post_install", "-at_install")
class TestStockNotificationProduct(WebsiteSaleStockCommon, HttpCase):
    _test_user_groups = (
        'base.group_user',
        'product.group_product_manager',
        'sales_team.group_sale_manager',  # FIXME: use sales_team.group_sale_salesman
    )

    _test_user_name = 'Test Sales & Product Manager'

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.macbook = cls._create_product(name="Macbook Pro")


    def test_back_in_stock_notification_price_tax_included(self):
        self.website.sudo().show_line_subtotals_tax_selection = "tax_included"
        self.env["product.stock.notification"].sudo().create({
            "product_id": self.macbook.id,
            "partner_id": self.partner.id,
            "website_id": self.website.id,
        })
        self._add_product_qty_to_wh(self.macbook.id, 10.0, self.warehouse.lot_stock_id.id)

        with self.setup_cron_env() as env:
            env["product.product"].sudo()._send_availability_email()

        email = (
            self
            .env["mail.mail"]
            .sudo()
            .search([
                ("email_to", "=", self.partner.email_formatted),
                ("subject", "=", "Macbook Pro is back in stock"),
            ])
        )
        price = html.fromstring(email.body_html).xpath('//td[@align="right"]')[0].text_content()
        self.assertIn("115.00", price)

    @contextmanager
    def setup_cron_env(self):
        """Set up the `TestCursor` required to execute a cron job and ensures proper handling of the
        environment before and after the operation.

        Note: In `HttpCase`, `TransactionCase.enter_registry_test_mode` is enabled by default.
        """
        env = self.env
        env.flush_all()
        try:
            with self.registry.cursor() as cr:  # Creates a temporary `TestCursor`
                yield env(cr=cr)
        finally:
            env.invalidate_all()

    def test_partner_email_confirmation(self):
        """Partner receives email confirmation for a delivery if the setting is enabled."""
        self.company.sudo().stock_move_email_validation = True
        self.partner.email = 'test@example.com'
        new_so = self._create_so()
        new_so._validate_order()
        new_so.picking_ids.button_validate()
        self.assertTrue(
            any(partner.email == self.partner.email
            for partner in new_so.picking_ids.message_ids.notified_partner_ids
        ))
