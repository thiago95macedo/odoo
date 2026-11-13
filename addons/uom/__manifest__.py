# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    'name': 'Units of measure',
    'category': 'Sales/Sales',
    'depends': ['base'],
    'description': """
This is the base module for managing Units of measure.
========================================================================
    """,
    'data': [
        'data/uom_data.xml',
        'security/uom_security.xml',
        'views/uom_uom_views.xml',
        'security/ir.access.csv',
    ],
    'assets': {
        'web.assets_backend': [
            'uom/static/src/components/**/*',
        ],
    },
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
