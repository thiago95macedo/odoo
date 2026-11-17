# Part of WETH. See LICENSE file for full copyright and licensing details.

from unittest.mock import patch

from weth.tests import tagged
from weth.tools import mute_logger

from weth.addons.payment.tests.http_common import PaymentHttpCommon
from weth.addons.payment_authorize import const
from weth.addons.payment_authorize.tests.common import AuthorizeCommon


@tagged("post_install", "-at_install")
class TestProcessingFlows(AuthorizeCommon, PaymentHttpCommon):
    @mute_logger("weth.addons.payment_authorize.controllers.main")
    def test_webhook_notification_triggers_processing(self):
        """Test that receiving a valid webhook notification triggers the processing of the
        payment data."""
        self._create_transaction("direct")
        url = self._build_url(const.WEBHOOK_ROUTE)

        with (
            patch("weth.addons.payment.utils.verify_signature"),
            patch(
                "weth.addons.payment.models.payment_transaction.PaymentTransaction._record"
            ) as record_mock,
        ):
            self._make_json_request(url, data=self.webhook_authcapture_data)
        self.assertEqual(record_mock.call_count, 1)

    @mute_logger("weth.addons.payment_authorize.controllers.main")
    def test_webhook_notification_triggers_signature_check(self):
        self._create_transaction("direct")
        url = self._build_url(const.WEBHOOK_ROUTE)

        with patch("weth.addons.payment.utils.verify_signature") as signature_check_mock:
            self.opener.headers["X-ANET-Signature"] = (
                f"sha512={self.webhook_authcapture_data_signature}"
            )
            self._make_json_request(url, data=self.webhook_authcapture_data)
            self.opener.headers.pop("X-ANET-Signature")

            self.assertEqual(
                signature_check_mock.call_args[0][0], self.webhook_authcapture_data_signature
            )
