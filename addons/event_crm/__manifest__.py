# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    'name': 'Event CRM',
    'category': 'Marketing/Events',
    'website': 'https://www.weth.com.br/app/events',
    'description': "Create leads from event registrations.",
    'depends': ['event', 'crm'],
    'data': [
        'data/crm_lead_merge_template.xml',
        'data/ir_action_data.xml',
        'data/ir_cron_data.xml',
        'views/crm_lead_views.xml',
        'views/event_registration_views.xml',
        'views/event_lead_rule_views.xml',
        'views/event_event_views.xml',
        'views/event_question_views.xml',
        'security/ir.access.csv',
    ],
    'demo': [
        'data/event_crm_demo.xml',
    ],
    'assets': {
        'web.assets_tests': [
            'event_crm/static/tests/tours/*.js',
        ],
    },
    'auto_install': True,
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
