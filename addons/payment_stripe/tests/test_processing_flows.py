# Part of WETH. See LICENSE file for full copyright and licensing details.

import copy
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

from werkzeug.exceptions import Forbidden

from weth.tests import freeze_time, tagged
from weth.tools import mute_logger

from weth.addons.payment.tests.http_common import PaymentHttpCommon
from weth.addons.payment_stripe.controllers.main import StripeController
from weth.addons.payment_stripe.tests.common import StripeCommon


@tagged("post_install", "-at_install")
class TestProcessingFlows(StripeCommon, PaymentHttpCommon):
    @mute_logger("weth.addons.payment_stripe.controllers.main")
    def test_redirect_notification_triggers_processing(self):
        self._create_transaction("redirect")
        url = self._build_url(StripeController._return_url)
        with (
            patch(
                "weth.addons.payment.models.payment_transaction.PaymentTransaction._send_api_request",
                self._mock_setup_intent_request,
            ),
            patch(
                "weth.addons.payment.models.payment_transaction.PaymentTransaction._record"
            ) as record_mock,
        ):
            self._make_http_get_request(url, params={"reference": self.reference})
            self.assertEqual(record_mock.call_count, 1)

    @mute_logger("weth.addons.payment_stripe.controllers.main")
    def test_webhook_notification_triggers_processing(self):
        self._create_transaction("redirect")
        url = self._build_url(StripeController._webhook_url)
        with (
            patch("weth.addons.payment_stripe.controllers.main.StripeController._verify_signature"),
            patch(
                "weth.addons.payment.models.payment_transaction.PaymentTransaction._record"
            ) as record_mock,
        ):
            self._make_json_request(url, data=self.payment_data)
            self.assertEqual(record_mock.call_count, 1)

    @mute_logger("weth.addons.payment_stripe.controllers.main")
    def test_webhook_notification_triggers_signature_check(self):
        self._create_transaction("redirect")
        url = self._build_url(StripeController._webhook_url)
        with patch(
            "weth.addons.payment_stripe.controllers.main.StripeController._verify_signature"
        ) as signature_check_mock:
            self._make_json_request(url, data=self.payment_data)
            self.assertEqual(signature_check_mock.call_count, 1)

    @mute_logger("weth.addons.payment_stripe.controllers.main")
    @mute_logger("weth.addons.payment_stripe.models.payment_transaction")
    def test_webhook_notification_skips_signature_verification_for_missing_transactions(self):
        url = self._build_url(StripeController._webhook_url)
        payload = copy.deepcopy(self.payment_data)
        payload["data"]["object"]["description"] = None
        with patch(
            "weth.addons.payment_stripe.controllers.main.StripeController._verify_signature"
        ) as signature_check_mock:
            self._make_json_request(url, data=payload)
            self.assertEqual(signature_check_mock.call_count, 0)

    @freeze_time("2026-02-13 15:08:21")
    def test_accept_notification_with_valid_signature(self):
        tx = self._create_transaction("redirect")
        timestamp = int((datetime.now(UTC) - timedelta(minutes=1)).timestamp())
        signature_data = {
            "v1": "784393e05d0740e61283ff81eb3738b3355a67e031bf465e92ebd0f424478a26",
            "t": timestamp,
        }
        signature_header = ",".join(f"{k}={v}" for k, v in signature_data.items())
        mock_request = MagicMock()
        mock_request.httprequest.data = b""
        mock_request.httprequest.headers = {"Stripe-Signature": signature_header}
        controller = StripeController()
        with patch("weth.addons.payment_stripe.controllers.main.request", new=mock_request):
            self._assert_does_not_raise(Forbidden, controller._verify_signature, tx)

    @mute_logger("weth.addons.payment_stripe.controllers.main")
    def test_reject_notification_when_missing_secret(self):
        self.stripe.stripe_webhook_secret = False
        tx = self._create_transaction("redirect")
        controller = StripeController()
        self.assertRaises(Forbidden, controller._verify_signature, tx)

    @mute_logger("weth.addons.payment_stripe.controllers.main", "weth.addons.payment.utils")
    def test_reject_notification_with_missing_timestamp(self):
        tx = self._create_transaction("redirect")
        signature_header = "v1=Test_Signature"
        mock_request = MagicMock()
        mock_request.httprequest.data = b""
        mock_request.httprequest.headers = {"Stripe-Signature": signature_header}
        controller = StripeController()
        with patch("weth.addons.payment_stripe.controllers.main.request", new=mock_request):
            self.assertRaises(Forbidden, controller._verify_signature, tx)

    @freeze_time("2026-02-13 15:08:21")
    @mute_logger("weth.addons.payment_stripe.controllers.main", "weth.addons.payment.utils")
    def test_reject_notification_with_missing_signature(self):
        tx = self._create_transaction("redirect")
        timestamp = int((datetime.now(UTC) - timedelta(minutes=1)).timestamp())
        signature_data = {"t": timestamp}
        signature_header = ",".join(f"{k}={v}" for k, v in signature_data.items())
        mock_request = MagicMock()
        mock_request.httprequest.data = b""
        mock_request.httprequest.headers = {"Stripe-Signature": signature_header}
        controller = StripeController()
        with patch("weth.addons.payment_stripe.controllers.main.request", new=mock_request):
            self.assertRaises(Forbidden, controller._verify_signature, tx)

    @freeze_time("2026-02-13 15:08:21")
    @mute_logger("weth.addons.payment_stripe.controllers.main", "weth.addons.payment.utils")
    def test_reject_notification_with_invalid_signature(self):
        tx = self._create_transaction("redirect")
        timestamp = int((datetime.now(UTC) - timedelta(minutes=1)).timestamp())
        signature_data = {"v1": "Wrong", "t": timestamp}
        signature_header = ",".join(f"{k}={v}" for k, v in signature_data.items())
        mock_request = MagicMock()
        mock_request.httprequest.data = b""
        mock_request.httprequest.headers = {"Stripe-Signature": signature_header}
        controller = StripeController()
        with patch("weth.addons.payment_stripe.controllers.main.request", new=mock_request):
            self.assertRaises(Forbidden, controller._verify_signature, tx)

    @freeze_time("2026-02-13 15:08:21")
    @mute_logger("weth.addons.payment_stripe.controllers.main", "weth.addons.payment.utils")
    def test_reject_notification_with_outdated_signature(self):
        tx = self._create_transaction("redirect")
        timestamp = int(
            (datetime.now(UTC) - timedelta(minutes=1)).timestamp()
            - StripeController.WEBHOOK_AGE_TOLERANCE
        )
        signature_data = {"v1": "Test Signature", "t": timestamp}
        signature_header = ",".join(f"{k}={v}" for k, v in signature_data.items())
        mock_request = MagicMock()
        mock_request.httprequest.data = b""
        mock_request.httprequest.headers = {"Stripe-Signature": signature_header}
        controller = StripeController()
        with patch("weth.addons.payment_stripe.controllers.main.request", new=mock_request):
            self.assertRaises(Forbidden, controller._verify_signature, tx)
