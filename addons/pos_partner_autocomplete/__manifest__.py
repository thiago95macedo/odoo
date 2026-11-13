# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    'name': 'POS Partner Autocomplete',
    'category': 'Sales/Point of Sale',
    'summary': 'Link module between Partner Autocomplete and Point of Sale',
    'description': """
This module links Partner Autocomplete with the Point of Sale, allowing partner data to be auto-completed from the POS frontend.
This module ensures that the Point of Sale remains independent of Partner Autocomplete.
    """,
    'depends': ['partner_autocomplete', 'point_of_sale'],
    'assets': {
        'point_of_sale._assets_pos': [
            'partner_autocomplete/static/src/**/*',
        ],
    },
    'auto_install': True,
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
