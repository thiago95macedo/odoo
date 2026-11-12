from datetime import datetime

from odoo import models, api, fields


class MySubscription(models.AbstractModel):
    _name = 'mysubscription.mysubscription'
    _description = 'Subscription Dashboard Helper'

    @api.model
    def get_dashboard_data(self):
        is_system = self.env.is_system()
        icp_sudo = self.env['ir.config_parameter'].sudo()

        enterprise_code = icp_sudo.get_str('database.enterprise_code')
        expiration_date = icp_sudo.get_str('database.expiration_date')
        show_database_action = icp_sudo.get_bool('mysubscription.database', default=True)

        return {
            'base_url': icp_sudo.get_str('web.base.url'),
            'has_subscription': self._has_subscription(enterprise_code, expiration_date),
            'enterprise_code': enterprise_code if is_system else '',
            'show_database_action': show_database_action,
        }

    def _has_subscription(self, enterprise_code, expiration_date):
        """ We need both an enterprise_code and a future expiration_date to
        consider the database as having an active subscription. """
        if not enterprise_code or not expiration_date:
            return False
        expiration_datetime = fields.Datetime.from_string(expiration_date)
        return bool(expiration_datetime) and expiration_datetime > datetime.utcnow()

