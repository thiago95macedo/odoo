# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import models
from weth.addons.mail.tools.discuss import Store


class MailMessage(models.Model):
    _inherit = "mail.message"

    def _store_message_fields(self, res: Store.FieldList, **kwargs):
        super()._store_message_fields(res, **kwargs)
        slides = self._records_by_model_name().get("slide.slide")
        if not slides:
            return
        res.many(
            "records",
            ["comments_count"],
            as_thread=True,
            only_data=True,
            value=slides,
        )
