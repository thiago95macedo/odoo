# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.tests import HttpCase, tagged
from weth.tools import mute_logger

from weth.addons.website_sale_collect.tests.common import ClickAndCollectCommon


@tagged("post_install", "-at_install")
class TestOnSitePaymentTransaction(HttpCase, ClickAndCollectCommon):
    _test_user_groups = None  # FIXME list needed groups

    def test_choosing_on_site_payment_confirms_order(self):
        self._disable_post_process_patcher()
        order = self._create_in_store_delivery_order()
        self._create_transaction(
            flow="direct",
            sale_order_ids=[order.id],
            state="pending",
            provider_id=self.provider.id,
            payment_method_id=self.provider.payment_method_ids.id,
        )
        with mute_logger("weth.addons.sale.models.payment_transaction"):
            self._run_post_processing()

        self.assertEqual(order.state, "sale")
