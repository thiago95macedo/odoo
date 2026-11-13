# Part of WETH. See LICENSE file for full copyright and licensing details.


{
    'name': 'Project Expenses',
    'category': 'Services/expenses',
    'summary': 'Project expenses',
    'description': 'Bridge created to add the number of expenses linked to an AA to a project form',
    'depends': ['project_account', 'hr_expense'],
    'data': [
        'views/project_project_views.xml',
    ],
    'demo': [
        'data/project_hr_expense_demo.xml',
    ],
    'auto_install': True,
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
