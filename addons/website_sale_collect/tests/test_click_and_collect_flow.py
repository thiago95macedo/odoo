# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.tests import tagged
from weth.tests.common import HttpCase

from weth.addons.website_sale_collect.tests.common import ClickAndCollectCommon


@tagged("post_install", "-at_install")
class TestClickAndCollectFlow(HttpCase, ClickAndCollectCommon):
    _test_user_groups = (
        'base.group_user',
        'product.group_product_manager',
        'sales_team.group_sale_manager',  # FIXME: use sales_team.group_sale_salesman
    )

    _test_user_name = 'Test Sales & Product Manager'

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.storable_product.name = "Test CAC Product"
        cls.provider.write({"is_live": True, "is_published": True})
        cls.in_store_dm.warehouse_ids[0].partner_id = cls.env["res.partner"].create({
            **cls.dummy_partner_address_values,
            "name": "Shop 1",
            "partner_latitude": 1.0,
            "partner_longitude": 2.0,
        })



    def test_cash_on_delivery_resets_on_in_store_type(self):
        """
        Ensure that when a carrier with cash-on-delivery enabled is switched
        to the 'in_store' delivery type, the 'allow_cash_on_delivery' field
        is automatically reset to False.
        """
        carrier = self.env["delivery.carrier"].create({
            "name": "Test Carrier",
            "allow_cash_on_delivery": True,
            "delivery_type": "fixed",
            "product_id": self.storable_product.id,
        })
        carrier.delivery_type = "in_store"
        self.assertEqual(carrier.allow_cash_on_delivery, False)
