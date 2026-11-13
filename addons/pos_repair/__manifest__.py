# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    'name': "POS - Repair",
    'category': "Technical",
    'summary': 'Link module between Point of Sale and Repair',
    'depends': ['pos_stock', 'repair'],
    'auto_install': True,
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_repair/static/src/**/*',
        ],
          'web.assets_tests': [
            'pos_repair/static/tests/tours/**/*',
        ],
    },
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
