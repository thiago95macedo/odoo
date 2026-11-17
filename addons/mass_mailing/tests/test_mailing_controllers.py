# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.

from freezegun import freeze_time
from requests import Session, PreparedRequest, Response

import datetime
import json
import base64

from weth import tools
from weth.addons.mail.tests.common import mail_new_test_user
from weth.addons.mass_mailing.tests.common import MassMailCommon
from weth.tests import HttpCase, tagged
from weth.tools import mute_logger


class TestMailingControllersCommon(MassMailCommon, HttpCase):

    @classmethod
    def setUpClass(cls):
        super(TestMailingControllersCommon, cls).setUpClass()

        # cleanup lists
        cls.env['mailing.list'].search([]).unlink()

        cls._create_mailing_list()
        cls.test_mailing_on_contacts = cls.env['mailing.mailing'].create({
            'body_html': '<p>Hello <t t-out="object.name"/><br />Go to <a id="url" href="https://www.example.com/foo/bar?baz=qux">this link</a></p>',
            'mailing_domain': [],
            'mailing_model_id': cls.env['ir.model']._get_id('mailing.contact'),
            'mailing_type': 'mail',
            'subject': 'TestMailing on Contacts',
        })
        cls.test_mailing_on_documents = cls.env['mailing.mailing'].create({
            'body_html': '<p>Hello <t t-out="object.name"/><br />Go to <a id="url" href="https://www.example.com/foo/bar?baz=qux">this link</a></p>',
            'mailing_domain': [],
            'mailing_model_id': cls.env['ir.model']._get_id('res.partner'),
            'mailing_type': 'mail',
            'subject': 'TestMailing on Documents',
        })
        cls.test_mailing_on_lists = cls.env['mailing.mailing'].create({
            'body_html': '<p>Hello <t t-out="object.name"/><br />Go to <a id="url" href="https://www.example.com/foo/bar?baz=qux">this link</a></p>',
            'contact_list_ids': [(4, cls.mailing_list_1.id), (4, cls.mailing_list_2.id)],
            'mailing_model_id': cls.env['ir.model']._get_id('mailing.list'),
            'mailing_type': 'mail',
            'reply_to': cls.email_reply_to,
            'subject': 'TestMailing on Lists',
        })

        cls.test_contact = cls.mailing_list_1.contact_ids[0]

        # freeze time base value
        cls._reference_now = datetime.datetime(2022, 6, 14, 10, 0, 0)

    @classmethod
    def _request_handler(cls, s: Session, r: PreparedRequest, /, **kw):
        if r.url.startswith('https://www.example.com/foo/bar'):
            r = Response()
            r.status_code = 200
            return r
        return super()._request_handler(s, r, **kw)


@tagged('mailing_portal', 'mail_track', 'post_install', '-at_install')
class TestMailingControllers(TestMailingControllersCommon):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.test_email = tools.formataddr(('Déboulonneur', '<fleurus@example.com>'))
        cls.test_email_normalized = 'fleurus@example.com'

    def test_assert_initial_values(self):
        """ Ensure test base data to ease test understanding. Globally test_email
        is member of 2 mailing public lists. """
        memberships = self.env['mailing.subscription'].search([
            ('contact_id.email_normalized', '=', self.test_email_normalized)]
        )
        self.assertEqual(memberships.list_id, self.mailing_list_1 + self.mailing_list_3)
        self.assertEqual(memberships.mapped('opt_out'), [False, True])

        contact_l1 = self.mailing_list_1.contact_ids.filtered(
            lambda contact: contact.email == self.test_email_normalized
        )
        self.assertTrue(contact_l1)
        self.assertFalse(contact_l1.is_blacklisted)
        subscription_l1 = self.mailing_list_1.subscription_ids.filtered(
            lambda subscription: subscription.contact_id == contact_l1
        )
        self.assertTrue(subscription_l1)
        self.assertFalse(subscription_l1.is_blacklisted)
        self.assertFalse(subscription_l1.opt_out)
        self.assertFalse(subscription_l1.opt_out_datetime)

        contact_l2 = self.mailing_list_2.contact_ids.filtered(
            lambda contact: contact.email == self.test_email_normalized
        )
        self.assertFalse(contact_l2)

        contact_l3 = self.mailing_list_3.contact_ids.filtered(
            lambda contact: contact.email == self.test_email_normalized
        )
        self.assertTrue(contact_l3)
        self.assertTrue(contact_l3 != contact_l1)
        self.assertFalse(contact_l3.is_blacklisted)
        subscription_l3 = self.mailing_list_3.subscription_ids.filtered(
            lambda subscription: subscription.contact_id == contact_l3
        )
        self.assertFalse(subscription_l3.is_blacklisted)
        self.assertTrue(subscription_l3.opt_out)

        contact_l4 = self.mailing_list_4.contact_ids.filtered(
            lambda contact: contact.email == self.test_email_normalized
        )
        self.assertFalse(contact_l4)

        self.assertFalse(self.env['mail.blacklist'].search([('email', '=', self.test_email_normalized)]))

    @mute_logger('weth.http', 'weth.addons.website.models.ir_ui_view')
    def test_mailing_report_unsubscribe(self):
        """ Test deactivation of mailing report sending. It requires usage of
        a hash token. """
        test_mailing = self.test_mailing_on_lists.with_env(self.env)
        self.env['ir.config_parameter'].sudo().set_bool(
            'mass_mailing.mass_mailing_reports', True
        )
        hash_token = test_mailing._generate_mailing_report_token(self.user_marketing.id)
        self.authenticate('user_marketing', 'user_marketing')

        # TEST: various invalid cases
        for test_user_id, test_token, error_code in [
            (self.user_marketing.id, '', 400),  # no token
            (self.user_marketing.id, 'zboobs', 401),  # invalid token
            (self.env.uid, hash_token, 401),  # invalid credentials
        ]:
            with self.subTest(test_user_id=test_user_id, test_token=test_token):
                res = self.url_open(
                    tools.urls.urljoin(
                        test_mailing.get_base_url(),
                        f'mailing/report/unsubscribe?user_id={test_user_id}&token={test_token}',
                    )
                )
                self.assertEqual(res.status_code, error_code)
                self.assertTrue(self.env['ir.config_parameter'].sudo().get_bool('mass_mailing.mass_mailing_reports'))

        # TEST: not mailing user
        self.user_marketing.write({
            'group_ids': [(3, self.env.ref('mass_mailing.group_mass_mailing_user').id)],
        })
        res = self.url_open(
            tools.urls.urljoin(
                test_mailing.get_base_url(),
                f'mailing/report/unsubscribe?user_id={self.user_marketing.id}&token={hash_token}',
            )
        )
        self.assertEqual(res.status_code, 401)
        self.assertTrue(self.env['ir.config_parameter'].sudo().get_bool('mass_mailing.mass_mailing_reports'))

        # TEST: finally valid call
        self.user_marketing.write({
            'group_ids': [(4, self.env.ref('mass_mailing.group_mass_mailing_user').id)],
        })
        res = self.url_open(
            tools.urls.urljoin(
                test_mailing.get_base_url(),
                f'mailing/report/unsubscribe?user_id={self.user_marketing.id}&token={hash_token}',
            )
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(self.env['ir.config_parameter'].sudo().get_bool('mass_mailing.mass_mailing_reports'))






    @mute_logger('weth.http', 'weth.addons.website.models.ir_ui_view')
    def test_mailing_view(self):
        """ Test preview of mailing. It requires either a token, either being
        mailing user. """
        test_mailing = self.test_mailing_on_documents.with_env(self.env)
        shadow_mailing = test_mailing.copy()
        doc_id, email_normalized = self.user_marketing.partner_id.id, self.user_marketing.email_normalized
        hash_token = test_mailing._generate_mailing_recipient_token(doc_id, email_normalized)
        self.user_marketing.write({
            'group_ids': [(3, self.env.ref('mass_mailing.group_mass_mailing_user').id)],
        })
        self.authenticate('user_marketing', 'user_marketing')

        # TEST: various invalid cases
        for test_mid, test_doc_id, test_email, test_token, error_code in [
            (test_mailing.id, doc_id, email_normalized, '', 400),  # no token
            (test_mailing.id, doc_id, email_normalized, 'zboobs', 401),  # wrong token
            (test_mailing.id, self.env.user.partner_id.id, email_normalized, hash_token, 401),  # mismatch
            (test_mailing.id, doc_id, 'not.email@example.com', hash_token, 401),  # mismatch
            (shadow_mailing.id, doc_id, email_normalized, hash_token, 401),  # valid credentials but wrong mailing_id
            (0, doc_id, email_normalized, hash_token, 400),  # valid credentials but missing mailing_id
        ]:
            with self.subTest(test_mid=test_mid, test_email=test_email, test_doc_id=test_doc_id, test_token=test_token):
                res = self.url_open(
                    tools.urls.urljoin(
                        test_mailing.get_base_url(),
                        f'mailing/{test_mid}/view?email={test_email}&document_id={test_doc_id}&hash_token={test_token}',
                    )
                )
                self.assertEqual(res.status_code, error_code)

        # TEST: valid call using credentials
        res = self.url_open(
            tools.urls.urljoin(
                test_mailing.get_base_url(),
                f'mailing/{test_mailing.id}/view?email={email_normalized}&document_id={doc_id}&hash_token={hash_token}',
            )
        )
        self.assertEqual(res.status_code, 200)

        # TEST: invalid credentials but mailing user
        self.user_marketing.write({
            'group_ids': [(4, self.env.ref('mass_mailing.group_mass_mailing_user').id)],
        })
        res = self.url_open(
            tools.urls.urljoin(
                test_mailing.get_base_url(),
                f'mailing/{test_mailing.id}/view',
            )
        )
        self.assertEqual(res.status_code, 200)

    def test_modify_image_non_admin(self):
        """ Test that a non-admin user can modify an image on a non-view model """
        self.authenticate(self.user_marketing.login, self.user_marketing.login)

        # 1x1 transparent PNG base64
        pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

        # Create a dummy image attachment on a non-view model (res.partner)
        attachment = self.env['ir.attachment'].create({
            'name': 'test_image.png',
            'type': 'binary',
            'raw': base64.b64decode(pixel),
            'res_model': 'res.partner',
            'res_id': self.user_marketing.partner_id.id,
            'mimetype': 'image/png',
        })

        # Build the JSON-RPC payload inline
        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                'res_model': 'res.partner',
                'res_id': self.user_marketing.partner_id.id,
                'name': 'modified_test_image.png',
                'data': pixel,
                'mimetype': 'image/png',
            },
            "id": 1,
        }

        # Simulate the JSON-RPC call using url_open and standard json
        response = self.url_open(
            f'/web_editor/modify_image/{attachment.id}',
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload)
        ).json()

        # The controller returns an 'error' key if an AccessError is caught by the RPC layer.
        self.assertNotIn('error', response, 'Modify image failed: %s' % response.get('error', {}).get('message'))
        self.assertTrue(isinstance(response.get('result', {}).get('original'), str), "The response dict should contain the 'original' URL string.")


@tagged('link_tracker', 'mailing_portal')
@tagged('at_install', '-post_install')  # LEGACY at_install
class TestMailingTracking(TestMailingControllersCommon):

    @mute_logger('weth.addons.mail.models.mail_mail', 'weth.addons.mass_mailing.models.mailing')
    def test_tracking_short_code(self):
        """ Test opening short code linked to a mailing trace: should set the
        trace as opened and clicked, create a click record.
        Mailing contact's stats (eg: last_opened_datetime, etc..) should also be
        updated."""
        mailing = self.test_mailing_on_lists.with_env(self.env)
        with self.mock_mail_gateway(mail_unlink_sent=False):
            mailing.action_send_mail()

        mail = self._find_mail_mail_wrecord(self.test_contact)
        mailing_trace = mail.mailing_trace_ids
        link_tracker_code = self._get_code_from_short_url(
            self._get_href_from_anchor_id(mail.body, 'url')
        )
        self.assertEqual(len(link_tracker_code), 1)
        self.assertEqual(link_tracker_code.link_id.count, 0)
        self.assertEqual(mail.state, 'sent')
        self.assertEqual(len(mailing_trace), 1)
        self.assertFalse(mailing_trace.links_click_datetime)
        self.assertFalse(mailing_trace.open_datetime)
        self.assertEqual(mailing_trace.trace_status, 'sent')

        # Mailing Contact
        self.assertFalse(self.test_contact.last_opened_datetime)
        self.assertFalse(self.test_contact.last_clicked_datetime)

        short_link_url = tools.urls.urljoin(
            mail.get_base_url(),
            f'r/{link_tracker_code.code}/m/{mailing_trace.id}'
        )
        with freeze_time(self._reference_now):
            response = self.url_open(short_link_url, allow_redirects=False)
            self.assertTrue(response.headers['Location'].startswith('https://www.example.com/foo/bar?baz=qux'))

        self.assertEqual(link_tracker_code.link_id.count, 1)
        self.assertEqual(mailing_trace.links_click_datetime, self._reference_now)
        self.assertEqual(mailing_trace.open_datetime, self._reference_now)
        self.assertEqual(mailing_trace.trace_status, 'open')

        # Mailing Contact
        self.assertEqual(self._reference_now, self.test_contact.last_opened_datetime)
        self.assertEqual(self._reference_now, self.test_contact.last_clicked_datetime)

    @mute_logger('weth.addons.mail.models.mail_mail', 'weth.addons.mass_mailing.models.mailing')
    def test_tracking_url_token(self):
        """ Test tracking of mails linked to a mailing trace: should set the
        trace as opened. """
        mailing = self.test_mailing_on_lists.with_env(self.env)
        with self.mock_mail_gateway(mail_unlink_sent=False):
            mailing.action_send_mail()

        mail = self._find_mail_mail_wrecord(self.test_contact)
        mail_id_int = mail.id
        mail_tracking_url = mail._get_tracking_url()
        mailing_trace = mail.mailing_trace_ids
        self.assertEqual(mail.state, 'sent')
        self.assertEqual(len(mailing_trace), 1)
        self.assertFalse(mailing_trace.open_datetime)
        self.assertEqual(mailing_trace.trace_status, 'sent')
        mail.unlink()  # the mail might be removed during the email sending
        self.env.flush_all()

        with freeze_time(self._reference_now):
            response = self.url_open(mail_tracking_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(mailing_trace.open_datetime, self._reference_now)
        self.assertEqual(mailing_trace.trace_status, 'open')

        track_url = tools.urls.urljoin(
            mailing.get_base_url(),
            f'mail/track/{mail_id_int}/fake_token/blank.gif'
        )
        response = self.url_open(track_url)
        self.assertEqual(response.status_code, 401)
