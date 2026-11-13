# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    'name': 'SMS gateway',
    'version': '3.0',
    'category': 'Sales/Sales',
    'summary': 'SMS Text Messaging',
    'description': """
This module gives a framework for SMS text messaging
----------------------------------------------------

The service is provided by the In App Purchase Odoo platform.
""",
    'depends': [
        'base',
        'mail',
        'phone_validation'
    ],
    'data': [
        'data/ir_cron_data.xml',
        'wizard/sms_composer_views.xml',
        'wizard/sms_template_preview_views.xml',
        'wizard/sms_template_reset_views.xml',
        'views/ir_actions_server_views.xml',
        'views/mail_notification_views.xml',
        'views/res_partner_views.xml',
        'views/sms_sms_views.xml',
        'views/sms_template_views.xml',
        'security/ir.access.csv',
    ],
    'demo': [
        'data/sms_demo.xml',
        'data/mail_demo.xml',
    ],
    'auto_install': True,
    'assets': {
        'web.assets_backend': [
            'sms/static/src/**/*',
        ],
        'web.assets_unit_tests': [
            'sms/static/tests/**/*',
        ],
    },
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
