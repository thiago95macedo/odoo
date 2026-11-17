from weth.exceptions import UserError
from weth.tests import tagged

from weth.addons.base.tests.common import BaseCommon


@tagged("post_install", "-at_install")
class TestDonationProductTemplate(BaseCommon):
    def test_donation_product_can_not_be_deleted(self):
        donation_product = self.env.ref("website_sale.product_donation")
        self.assertRaises(UserError, donation_product.unlink)
