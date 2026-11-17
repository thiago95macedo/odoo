# Part of WETH. See LICENSE file for full copyright and licensing details.
from unittest.mock import patch

from weth.tests import tagged
from weth.addons.point_of_sale.tests.test_order_receipt import TestPosOrderReceipt


@tagged('post_install', '-at_install')
class TestOrderReceiptPosLoyalty(TestPosOrderReceipt):
    _test_user_groups = None  # FIXME list needed groups

    @classmethod
    def setUpClass(self):
        super().setUpClass()

        # Coupon_id is skipped because the frontend doesn't have the server id yet.
        self.key_to_skip.update({
            'pos.order.line': ['coupon_id'] + self.key_to_skip['pos.order.line'],
        })


    def test_total_item_count_excludes_reward_line(self):
        order, _ = self.create_backend_pos_order({
            'pos_config': self.main_pos_config,
            'line_data': [
                {
                    'product_id': self.example_simple_product.product_variant_id.id,
                    'qty': 1,
                    'price_subtotal': 0.0,
                    'price_subtotal_incl': 0.0,
                },
                {
                    'product_id': self.example_simple_product.product_variant_id.id,
                    'qty': 1,
                    'price_subtotal': 0.0,
                    'price_subtotal_incl': 0.0,
                    'is_reward_line': True,
                },
            ],
        })

        self.assertEqual(order.order_receipt_generate_data()['extra_data']['total_item_count'], 1)
