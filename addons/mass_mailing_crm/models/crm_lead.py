# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import models


class CrmLead(models.Model):
    _inherit = 'crm.lead'
    _mailing_enabled = True
