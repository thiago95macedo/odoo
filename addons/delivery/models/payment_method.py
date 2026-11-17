# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import api, models


class PaymentMethod(models.Model):
    _inherit = "payment.method"

    @api.model
    def _get_pay_on_delivery_method_codes(self):
        """Return the technical codes of "Pay on Delivery" payment methods."""
        return {"cash_on_delivery"}
