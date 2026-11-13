{
    'name': "OdooBot - HR",
    'summary': """Bridge module between hr and mailbot.""",
    'description': """This module adds the OdooBot state and notifications in the user form modified by hr.""",
    'website': "https://www.weth.com.br/app/discuss",
    'category': 'Productivity/Discuss',
    'depends': ['mail_bot', 'hr'],
    'auto_install': True,
    'data': [
        'views/res_users_views.xml',
    ],
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
