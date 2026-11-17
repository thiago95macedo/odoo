# Part of WETH. See LICENSE file for full copyright and licensing details.

from unittest.mock import patch

from weth.tests import tagged

from weth.addons.payment.tests.http_common import PaymentHttpCommon
from weth.addons.payment_demo.controllers.main import PaymentDemoController
from weth.addons.payment_demo.tests.common import PaymentDemoCommon


@tagged("-at_install", "post_install")
class TestProcessingFlows(PaymentDemoCommon, PaymentHttpCommon):
    def test_portal_payment_triggers_processing(self):
        """Test that paying from the frontend triggers the processing of the payment data."""
        self._create_transaction(flow="direct")
        url = self._build_url(PaymentDemoController._simulation_url)
        with patch(
            "weth.addons.payment.models.payment_transaction.PaymentTransaction._record"
        ) as record_mock:
            self.make_jsonrpc_request(url, params=self.payment_data)
        self.assertEqual(record_mock.call_count, 1)
