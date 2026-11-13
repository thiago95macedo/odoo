# Part of WETH. See LICENSE file for full copyright and licensing details.
{
    'name': "Spreadsheet dashboard for point of sale",
    'category': 'Productivity/Dashboard',
    'summary': 'Spreadsheet',
    'description': 'Spreadsheet',
    'depends': ['spreadsheet_dashboard', 'pos_hr'],
    'data': [
        "data/dashboards.xml",
    ],
    'auto_install': ['pos_hr'],
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
