# Part of WETH. See LICENSE file for full copyright and licensing details.

from werkzeug.exceptions import Forbidden

from weth.tests import tagged
from weth.tools import mute_logger

from weth.addons.payment import utils as payment_utils
from weth.addons.payment.tests.common import PaymentCommon


@tagged("post_install", "-at_install")
class TestUtils(PaymentCommon):
    def test_verify_signature_does_not_raise_if_valid_signature(self):
        self._assert_does_not_raise(
            Forbidden, payment_utils.verify_signature, "valid_signature", "valid_signature"
        )

    @mute_logger("weth.addons.payment.utils")
    def test_verify_signature_raises_if_invalid_signature(self):
        self.assertRaises(
            Forbidden, payment_utils.verify_signature, "invalid_signature", "valid_signature"
        )

    @mute_logger("weth.addons.payment.utils")
    def test_verify_signature_raises_if_missing_signature(self):
        self.assertRaises(Forbidden, payment_utils.verify_signature, None, "valid_signature")
        self.assertRaises(Forbidden, payment_utils.verify_signature, "valid_signature", None)
