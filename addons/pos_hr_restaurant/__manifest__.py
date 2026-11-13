# Part of WETH. See LICENSE file for full copyright and licensing details.


{
    'name': 'POS HR Restaurant',
    'category': 'Sales/Point of Sale',
    'summary': 'Link module between pos_hr and pos_restaurant',
    'description': """
This module adapts the behavior of the PoS when the pos_hr and pos_restaurant are installed.
""",
    'depends': ['pos_hr', 'pos_restaurant'],
    'auto_install': True,
    'assets': {
        'web.assets_tests': [
            'pos_hr_restaurant/static/tests/**/*',
        ],
    },
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
