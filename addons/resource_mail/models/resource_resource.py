# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import models
from weth.addons.mail.tools.discuss import Store


class ResourceResource(models.Model):
    _inherit = 'resource.resource'

    def _store_avatar_card_fields(self, res: Store.FieldList):
        res.one("user_id", "_store_avatar_card_fields")
        res.extend(["name", "resource_type"])
