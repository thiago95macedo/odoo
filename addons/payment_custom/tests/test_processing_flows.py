# Part of WETH. See LICENSE file for full copyright and licensing details.

from unittest.mock import patch

from weth.tests import tagged
from weth.tools import mute_logger

from weth.addons.payment.tests.http_common import PaymentHttpCommon
from weth.addons.payment_custom.controllers.main import CustomController
from weth.addons.payment_custom.tests.common import PaymentCustomCommon


@tagged("-at_install", "post_install")
class TestProcessingFlows(PaymentCustomCommon, PaymentHttpCommon):
    @mute_logger("weth.addons.payment_custom.controllers.main")
    def test_processing_request_triggers_processing(self):
        self._create_transaction(flow="redirect")
        url = self._build_url(CustomController._process_url)
        with patch(
            "weth.addons.payment.models.payment_transaction.PaymentTransaction._record"
        ) as record_mock:
            self._make_http_post_request(url, data={"reference": self.reference})
        self.assertEqual(record_mock.call_count, 1)

    @mute_logger("weth.addons.payment_custom.controllers.main", "weth.http")
    def test_processing_request_discards_extraneous_payment_data(self):
        self._create_transaction(flow="redirect")
        url = self._build_url(CustomController._process_url)
        with patch(
            "weth.addons.payment.models.payment_transaction.PaymentTransaction._record"
        ) as record_mock:
            self._make_http_post_request(url, data={"reference": self.reference, "foo": "bar"})
        self.assertEqual(record_mock.call_args.args[0], {"reference": self.reference})
