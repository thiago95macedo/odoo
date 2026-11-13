# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    'name': 'Mass mailing on attendees',
    'category': 'Marketing/Email Marketing',
    'description':
        """
Mass mail event attendees
=========================

Bridge module adding UX requirements to ease mass mailing of event attendees.
        """,
    'depends': ['event', 'mass_mailing'],
    'data': [
        'views/event_views.xml'
    ],
    'auto_install': True,
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
