# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import models

from weth.addons.bus.models.bus import SKIP_NOTIFICATION
from weth.addons.mail.tools.discuss import Store


class BusBus(models.Model):
    _inherit = "bus.bus"

    def _prepare_payload(self, payload):
        if isinstance(payload, Store):
            if not payload._auto_send:
                return SKIP_NOTIFICATION
            return payload.as_dict() or SKIP_NOTIFICATION
        return super()._prepare_payload(payload)
