# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    'name': 'Privacy',
    'category': 'Hidden',
    'depends': ['mail'],
    'data': [
        'wizard/privacy_lookup_wizard_views.xml',
        'views/privacy_log_views.xml',
        'data/ir_actions_server_data.xml',
        'security/ir.access.csv',
    ],
    'auto_install': True,
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
