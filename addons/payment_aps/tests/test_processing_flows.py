# Part of WETH. See LICENSE file for full copyright and licensing details.

from unittest.mock import patch

from weth.tests import tagged
from weth.tools import mute_logger

from weth.addons.payment_aps.controllers.main import APSController
from weth.addons.payment_aps.tests.common import APSCommon


@tagged("post_install", "-at_install")
class TestProcessingFlows(APSCommon):
    @mute_logger("weth.addons.payment_aps.controllers.main")
    def test_redirect_notification_triggers_processing(self):
        """Test that receiving a redirect notification triggers the processing of the notification
        data."""
        self._create_transaction(flow="redirect")
        url = self._build_url(APSController._return_url)
        with (
            patch("weth.addons.payment.utils.verify_signature"),
            patch(
                "weth.addons.payment_aps.models.payment_provider.PaymentProvider"
                "._aps_calculate_signature"
            ),
            patch(
                "weth.addons.payment.models.payment_transaction.PaymentTransaction._record"
            ) as record_mock,
        ):
            self._make_http_post_request(url, data=self.payment_data)
            self.assertEqual(record_mock.call_count, 1)

    @mute_logger("weth.addons.payment_aps.controllers.main")
    def test_webhook_notification_triggers_processing(self):
        """Test that receiving a valid webhook notification triggers the processing of the
        payment data."""
        self._create_transaction("redirect")
        url = self._build_url(APSController._webhook_url)
        with (
            patch("weth.addons.payment.utils.verify_signature"),
            patch(
                "weth.addons.payment_aps.models.payment_provider.PaymentProvider"
                "._aps_calculate_signature"
            ),
            patch(
                "weth.addons.payment.models.payment_transaction.PaymentTransaction._record"
            ) as record_mock,
        ):
            self._make_http_post_request(url, data=self.payment_data)
            self.assertEqual(record_mock.call_count, 1)

    @mute_logger("weth.addons.payment_aps.controllers.main")
    def test_redirect_notification_triggers_signature_check(self):
        self._create_transaction("redirect")
        url = self._build_url(APSController._return_url)
        with (
            patch("weth.addons.payment.utils.verify_signature") as signature_check_mock,
            patch(
                "weth.addons.payment_aps.models.payment_provider.PaymentProvider"
                "._aps_calculate_signature"
            ),
        ):
            self._make_http_post_request(url, data=self.payment_data)
            self.assertEqual(signature_check_mock.call_args[0][0], self.payment_data_signature)

    @mute_logger("weth.addons.payment_aps.controllers.main")
    def test_webhook_notification_triggers_signature_check(self):
        self._create_transaction("redirect")
        url = self._build_url(APSController._webhook_url)
        with (
            patch("weth.addons.payment.utils.verify_signature") as signature_check_mock,
            patch(
                "weth.addons.payment_aps.models.payment_provider.PaymentProvider"
                "._aps_calculate_signature"
            ),
        ):
            self._make_http_post_request(url, data=self.payment_data)
            self.assertEqual(signature_check_mock.call_args[0][0], self.payment_data_signature)

    def test_compute_signature_returns_correct_signature(self):
        signature = self.provider._aps_calculate_signature(self.payment_data, incoming=True)
        self.assertEqual(signature, self.payment_data_signature)
