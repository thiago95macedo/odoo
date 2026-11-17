# -*- coding: utf-8 -*-

from weth.http import request
from weth.addons.portal.controllers.portal import CustomerPortal

class CustomerPortalPasswordPolicy(CustomerPortal):
    def _prepare_portal_layout_values(self):
        d = super()._prepare_portal_layout_values()
        d['password_minimum_length'] = request.env['ir.config_parameter'].sudo().get_int('auth_password_policy.minlength')
        return d
