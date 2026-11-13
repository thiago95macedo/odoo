# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    'name': 'Event Attendees SMS Marketing',
    'category': 'Marketing/Email Marketing',
    'description':
        """
SMS Marketing on event attendees
================================

Bridge module adding UX requirements to ease SMS marketing o, event attendees.
        """,
    'depends': [
        'event',
        'mass_mailing',
        'mass_mailing_event',
        'mass_mailing_sms',
        'sms',
    ],
    'auto_install': True,
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
