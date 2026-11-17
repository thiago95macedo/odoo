# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.

import re

from weth.addons.mail.tests.common import MailCommon
from weth.exceptions import AccessError
from weth.tests import Form, HttpCase, tagged, users
from weth.tools import mute_logger


@tagged('mail_composer')
class TestMailComposer(MailCommon):

    @classmethod
    def setUpClass(cls):
        super(TestMailComposer, cls).setUpClass()
        cls.env['ir.config_parameter'].set_bool('mail.restrict.template.rendering', True)
        cls.user_employee.group_ids -= cls.env.ref('mail.group_mail_template_editor')
        cls.test_record = cls.env['res.partner'].create({
            'name': 'Test',
        })
        cls.body_html = """<h1>Hello sir!</h1>
    <p>Here! <a href="https://www.example.com">
        <!--[if mso]>
            <i style="letter-spacing: 25px; mso-font-width: -100%; mso-text-raise: 30pt;">&nbsp;</i>
        <![endif]-->
        A link for you! <!-- my favorite example -->
        <!--[if mso]>
            <i style="letter-spacing: 25px; mso-font-width: -100%;">&nbsp;</i>
        <![endif]-->
    </a> Make good use of it.</p>"""

        cls.mail_template = cls.env['mail.template'].create({
            'auto_delete': True,
            'body_html': cls.body_html,
            'lang': '{{ object.lang }}',
            'model_id': cls.env['ir.model']._get_id('res.partner'),
            'name': 'Test template with mso conditionals',
            'use_default_to': True,
            'subject': 'MSO FTW',
        })

@tagged('mail_composer')
@tagged('at_install', '-post_install')  # LEGACY at_install
class TestMailComposerForm(TestMailComposer):
    """ Test mail composer form view usage. """

    @classmethod
    def setUpClass(cls):
        super(TestMailComposerForm, cls).setUpClass()
        cls.other_company = cls.env['res.company'].create({'name': 'Other Company'})
        cls.user_employee.write({
            'company_ids': [(4, cls.other_company.id)]
        })
        cls.partner_private, cls.partner_private_2, cls.partner_classic = cls.env['res.partner'].create([
            {
                'email': 'private.customer@text.example.com',
                'phone': '0032455112233',
                'name': 'Private Customer',
                'company_id': cls.other_company.id,
            },
            {
                'email': 'private.customer.2@test.example.com',
                'phone': '0032455445566',
                'name': 'Private Customer 2',
                'company_id': cls.other_company.id,
            },
            {
                'email': 'not.private@test.example.com',
                'phone': '0032455778899',
                'name': 'Classic Customer',
                'type': 'contact',
            }
        ])

    @mute_logger('weth.addons.mail.models.mail_mail')
    @users('employee')
    def test_composer_default_recipients(self):
        """ Test usage of a private partner in composer, as default value """
        partner_classic = self.partner_classic.with_env(self.env)
        test_record = self.test_record.with_env(self.env)

        form = Form(self.env['mail.compose.message'].with_context({
            'default_partner_ids': partner_classic.ids,
            'default_model': test_record._name,
            'default_res_ids': test_record.ids,
        }))
        form.body = '<p>Hello</p>'
        self.assertEqual(
            form.partner_ids.ids, partner_classic.ids,
            'Default populates the field'
        )
        saved_form = form.save()
        self.assertEqual(
            saved_form.partner_ids, partner_classic,
            'Default value is kept at save'
        )

        with self.mock_mail_gateway():
            saved_form._action_send_mail()

        message = self.test_record.message_ids[0]
        self.assertEqual(message.body, '<p>Hello</p>')
        self.assertEqual(message.partner_ids, partner_classic)
        self.assertEqual(message.subject, f'{test_record.name}')

    @mute_logger('weth.addons.mail.models.mail_mail')
    @users('employee')
    def test_composer_default_recipients_private(self):
        """ Test usage of a private partner in composer, as default value """
        partner_private = self.partner_private.with_env(self.env)
        partner_classic = self.partner_classic.with_env(self.env)
        test_record = self.test_record.with_env(self.env)

        form = Form(self.env['mail.compose.message'].with_context({
            'default_partner_ids': (partner_private + partner_classic).ids,
            'default_model': test_record._name,
            'default_res_ids': test_record.ids,
        }))
        form.body = '<p>Hello</p>'
        self.assertEqual(
            sorted(form.partner_ids.ids),
            sorted((partner_private + partner_classic).ids),
            'Default populates the field'
        )
        saved_form = form.save()
        self.assertEqual(
            saved_form.partner_ids, partner_private + partner_classic,
            'Default value is kept at save'
        )

        with self.mock_mail_gateway():
            saved_form._action_send_mail()

        message = self.test_record.message_ids[0]
        self.assertEqual(message.body, '<p>Hello</p>')
        self.assertEqual(message.partner_ids, partner_private + partner_classic)
        self.assertEqual(message.subject, f'{test_record.name}')

    @mute_logger('weth.addons.base.models.ir_access', 'weth.addons.mail.models.mail_mail')
    @users('employee')
    def test_composer_default_recipients_private_norights(self):
        """ Test usage of a private partner in composer when not having the
        rights to see them, as default value """
        self.user_employee.write({'company_ids': [
            (3, self.other_company.id),
        ]})
        with self.assertRaises(AccessError):
            _name = self.partner_private.with_env(self.env).name

        partner_classic = self.partner_classic.with_env(self.env)
        test_record = self.test_record.with_env(self.env)

        form = Form(self.env['mail.compose.message'].with_context({
            'default_partner_ids': (self.partner_private + partner_classic).ids,
            'default_model': test_record._name,
            'default_res_ids': test_record.ids,
        }))
        msg = form.save()
        self.assertEqual(partner_classic, msg.sudo().partner_ids, 'partner_private must not be saved')

    @mute_logger('weth.addons.mail.models.mail_mail')
    @users('employee')
    def test_composer_template_change_recipients_update(self):
        """Check that recipients only change when coming or going to a template with specific recipients."""
        self.mail_template.write({
            'email_to': self.partner_private.email_formatted,
            'partner_to': False,
            'use_default_to': False,
        })
        specific_recipient_template = self.mail_template
        specific_recipient_template_copy = specific_recipient_template.copy(default={
            'email_to': False,
            'partner_to': f'{self.partner_private_2.id}',
        })
        default_recipient_template = specific_recipient_template.copy(default={
            'email_to': False, 'partner_to': False, 'use_default_to': True,
        })
        default_recipient_template_copy = default_recipient_template.copy()
        test_record = self.test_record.with_env(self.env)
        default_recipient = test_record
        self.assertTrue(default_recipient, self.env.registry['res.partner'])

        cases = [
            (self.partner_classic, False, specific_recipient_template, self.partner_private, 'No template -> Specific recipients'),
            (self.partner_classic, specific_recipient_template, specific_recipient_template_copy, self.partner_private_2, 'Specific recipients -> Specific recipients'),
            (self.partner_classic, specific_recipient_template_copy, default_recipient_template, self.partner_classic, 'Specific recipients -> Default recipients'),
            (None, default_recipient_template, default_recipient_template_copy, default_recipient, 'Default recipients -> Default recipients'),
            (self.partner_classic, default_recipient_template, default_recipient_template_copy, self.partner_classic, 'Default recipients -> Default recipients'),
            (self.partner_classic, default_recipient_template_copy, specific_recipient_template, self.partner_private, 'Default recipients -> Specific recipients'),
            (None, specific_recipient_template, False, False, 'Specific recipients -> No template'),
            (None, default_recipient_template, False, False, 'Default recipients -> No template'),
        ]
        for previous_partners, previous_template, new_template, expected_partners, case_name in cases:
            with self.subTest(case=case_name):
                composer_form = Form(self.env['mail.compose.message'].with_context({
                    'default_model': test_record._name,
                    'default_res_ids': test_record.ids,
                    'default_template_id': previous_template and previous_template.id,
                } | ({'default_partner_ids': previous_partners.ids} if previous_partners is not None else {})
                ))
                composer_form.template_id = new_template or self.env['mail.template']
                self.assertEqual(sorted(composer_form.partner_ids.ids), sorted(expected_partners.ids if expected_partners else []))

    @mute_logger('weth.addons.mail.models.mail_mail')
    @users('employee')
    def test_composer_template_recipients_private(self):
        """ Test usage of a private partner in composer, coming from template
        value """
        email_to_new = 'new.customer@test.example.com'
        self.mail_template.write({
            'email_to': f'{self.partner_private_2.email_formatted}, {email_to_new}',
            'partner_to': f'{self.partner_private.id},{self.partner_classic.id}',
            'use_default_to': False,
        })
        template = self.mail_template.with_env(self.env)
        partner_private = self.partner_private.with_env(self.env)
        partner_private_2 = self.partner_private_2.with_env(self.env)
        partner_classic = self.partner_classic.with_env(self.env)
        test_record = self.test_record.with_env(self.env)

        form = Form(self.env['mail.compose.message'].with_context({
            'default_model': test_record._name,
            'default_res_ids': test_record.ids,
            'default_template_id': template.id,
        }))

        # transformation from email_to into partner_ids: find or create
        existing_partner = self.env['res.partner'].search(
            [('email_normalized', '=', self.partner_private_2.email_normalized)]
        )
        self.assertEqual(existing_partner, partner_private_2, 'Should find existing private contact')
        new_partner = self.env['res.partner'].search(
            [('email_normalized', '=', email_to_new)]
        )
        self.assertEqual(new_partner.type, 'contact', 'Should create a new contact')

        self.assertEqual(
            sorted(form.partner_ids.ids),
            sorted((partner_private + partner_classic + partner_private_2 + new_partner).ids),
            'Template populates the field with both email_to and partner_to'
        )
        saved_form = form.save()
        self.assertEqual(
            saved_form.partner_ids, partner_private + partner_classic + partner_private_2 + new_partner,
            'Template value is kept at save'
        )

        with self.mock_mail_gateway():
            saved_form._action_send_mail()

        message = self.test_record.message_ids[0]
        self.assertIn('<h1>Hello sir!</h1>', message.body)
        # self.assertEqual(message.partner_ids, partner_private + partner_classic + partner_private_2 + new_partner)
        self.assertEqual(
            message.partner_ids, partner_private + partner_classic + partner_private_2 + new_partner,
            'Should not loosing unreadable partners'
        )
        self.assertEqual(message.subject, 'MSO FTW')


@tagged('mail_composer')
@tagged('at_install', '-post_install')  # LEGACY at_install
class TestMailComposerRendering(TestMailComposer):
    """ Test rendering and support of various html tweaks in composer """

    @users('employee')
    def test_mail_mass_mode_template_with_mso(self):
        mail_compose_message = self.env['mail.compose.message'].create({
            'composition_mode': 'mass_mail',
            'model': 'res.partner',
            'template_id': self.mail_template.id,
            'subject': 'MSO FTW',
        })

        values = mail_compose_message._prepare_mail_values(self.partner_employee.ids)

        self.assertIn(
            self.body_html,
            values[self.partner_employee.id]['body_html'],
            'We must preserve (mso) comments in email html'
        )

    @mute_logger('weth.addons.mail.models.mail_mail')
    @users('employee')
    def test_mail_mass_mode_compose_with_mso(self):
        composer = self.env['mail.compose.message'].with_context({
            'default_model': self.test_record._name,
            'default_composition_mode': 'mass_mail',
            'active_ids': [self.test_record.id],
            'active_model': self.test_record._name,
            'active_id': self.test_record.id
        }).create({
            'body': self.body_html,
            'partner_ids': [(4, self.partner_employee.id)],
            'composition_mode': 'mass_mail',
        })
        with self.mock_mail_gateway(mail_unlink_sent=True):
            composer._action_send_mail()

        values = composer._prepare_mail_values(self.partner_employee.ids)

        self.assertIn(
            self.body_html,
            values[self.partner_employee.id]['body_html'],
            'We must preserve (mso) comments in email html'
        )

        notification = self.env["mail.notification"].search(
            [('mail_email_address', '=', self.partner_employee.email)])
        self.assertEqual(len(notification), 1)

    @users('employee')
    def test_prevent_sudo_rendering(self):
        test_template = self.env['mail.template'].sudo().create({
            'body_html': '<t t-if="not object.env.su">1</t>',
            'model_id': self.env['ir.model']._get_id('res.partner'),
        })
        partner = self.test_record.with_env(self.env)
        composer = self.env['mail.compose.message'].create({
            'model': partner._name,
            'res_ids': f'{[partner.id]}',
            'template_id': test_template.id,
            'composition_mode': 'mass_mail',
        })
        result = composer._render_field('body', partner.ids)[partner.id]
        self.assertEqual(result, '1')

