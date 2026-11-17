# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.

from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

from weth import fields
from weth.addons.base.tests.common import HttpCaseWithUserDemo, HttpCaseWithUserPortal
from weth.addons.http_routing.tests.common import MockRequest
from weth.addons.mail.tests.common import mail_new_test_user
from weth.addons.website_event.tests.common import TestEventOnlineCommon, OnlineEventCase
from weth.exceptions import AccessError
from weth.tests import HttpCase, tagged
from weth.tools import mute_logger
from weth.tests.common import users


class TestEventRegisterUTM(HttpCase, TestEventOnlineCommon):
    def test_event_registration_utm_values(self):
        self.event_0.registration_ids.unlink()
        self.event_0.write({
            'event_ticket_ids': [
                (5, 0),
                (0, 0, {
                    'name': 'First Ticket',
                }),
            ],
            'is_published': True
        })
        event_campaign = self.env['utm.campaign'].create({'name': 'utm event test'})

        self.authenticate(None, None)
        self.opener.cookies.update({
            'odoo_utm_campaign': event_campaign.name,
            'odoo_utm_source': self.env.ref('utm.utm_source_newsletter').name,
            'odoo_utm_medium': self.env.ref('utm.utm_medium_email').name
        })
        event_questions = self.event_0.question_ids
        name_question = event_questions.filtered(lambda q: q.question_type == 'name')
        email_question = event_questions.filtered(lambda q: q.question_type == 'email')
        self.assertTrue(name_question and email_question)
        # get 1 free ticket
        self.url_open(f'/event/{self.event_0.id}/registration/confirm', data={
            f'1-name-{name_question.id}': 'Bob',
            f'1-email-{email_question.id}': 'bob@test.lan',
            '1-event_ticket_id': self.event_0.event_ticket_ids[0].id,
            'csrf_token': self.csrf_token(),
        })
        new_registration = self.event_0.registration_ids
        self.assertEqual(len(new_registration), 1)
        self.assertEqual(new_registration.utm_campaign_id, event_campaign)
        self.assertEqual(new_registration.utm_source_id, self.env.ref('utm.utm_source_newsletter'))
        self.assertEqual(new_registration.utm_medium_id, self.env.ref('utm.utm_medium_email'))


@tagged('post_install', '-at_install')
class TestUi(HttpCaseWithUserDemo, HttpCaseWithUserPortal):





    def test_website_event_social_image(self):
        event = self.env['event.event'].create({
            'name': 'Event With Menu',
            'website_menu': True,
            'website_id': self.env.ref('base.default_website').id,
        })
        with MockRequest(self.env, website=self.env.ref('base.default_website'), url_root='http://example.com'):
            event.cover_properties = """{"background-image": "url('/1.jpg')"}"""
            meta = event.get_website_meta()
            self.assertEqual(meta['opengraph_meta']['og:image'], 'http://example.com/1.jpg')
            event.cover_properties = """{"background-image": "url(\\"/2.jpg\\")"}"""
            meta = event.get_website_meta()
            self.assertEqual(meta['opengraph_meta']['og:image'], 'http://example.com/2.jpg')
            event.cover_properties = """{"background-image": "url(/3.jpg)"}"""
            meta = event.get_website_meta()
            self.assertEqual(meta['opengraph_meta']['og:image'], 'http://example.com/3.jpg')



@tagged('post_install', '-at_install')
class TestWebsiteAccess(HttpCaseWithUserDemo, OnlineEventCase):

    def setUp(self):
        super(TestWebsiteAccess, self).setUp()

        self.website = self.env['website'].create({'name': 'Website Test'})
        self.partner = self.env['res.partner'].create([{
            'name': 'Test Partner1',
            'email': 'test@example.com',
            'city': 'Turlock',
            'state_id': self.env.ref('base.state_us_5').id,
            'country_id': self.env.ref('base.us').id,
        }])
        self.events = self.env['event.event'].create([{
            'name': 'Event 0 - Sitemap test',
            'website_published': True,
            'date_begin': datetime.today() - timedelta(days=1),
            'date_end': datetime.today() + timedelta(days=1),
            'address_id': self.partner.id,
        }, {
            'name': 'Event 1 - Sitemap test',
            'website_published': True,
            'date_begin': datetime.today() - timedelta(days=1),
            'date_end': datetime.today() + timedelta(days=1),
        }, {
            'name': 'Event 2 - Sitemap test',
            'date_begin': datetime.today() - timedelta(days=1),
            'date_end': datetime.today() + timedelta(days=1),
        }])

        self.portal_user = mail_new_test_user(
            self.env, name='Smeagol', login='user_portal', password='user_portal', email='portal@example.com',
            groups='base.group_portal'
        )

    def test_website_access_event_manager(self):
        """ Event managers are allowed to access both published and unpublished events """
        self.authenticate('user_eventmanager', 'user_eventmanager')
        published_events = self.events.filtered(lambda event: event.website_published)
        resp = self.url_open('/event/%i' % published_events[0].id)
        self.assertEqual(resp.status_code, 200, 'Managers must have access to published event.')

        unpublished_events = self.events.filtered(lambda event: not event.website_published)
        resp = self.url_open('/event/%i' % unpublished_events[0].id)
        self.assertEqual(resp.status_code, 200, 'Managers must have access to unpublished event.')

        resp = self.url_open('/event')
        self.assertTrue(published_events[0].name in resp.text, 'Managers must see the unpublished events.')
        self.assertTrue(unpublished_events[0].name in resp.text, 'Managers must see the published events.')

    def test_website_access_event_uer(self):
        """ Event users are allowed to access both published and unpublished events """
        self.authenticate('user_eventuser', 'user_eventuser')
        published_events = self.events.filtered(lambda event: event.website_published)
        resp = self.url_open('/event/%i' % published_events[0].id)
        self.assertEqual(resp.status_code, 200, 'Event user must have access to published event.')

        unpublished_events = self.events.filtered(lambda event: not event.website_published)
        resp = self.url_open('/event/%i' % unpublished_events[0].id)
        self.assertEqual(resp.status_code, 200, 'Event user must have access to unpublished event.')

        resp = self.url_open('/event')
        self.assertTrue(published_events[0].name in resp.text, 'Event user must see the unpublished events.')
        self.assertTrue(unpublished_events[0].name in resp.text, 'Event user must see the published events.')

    @mute_logger('weth.http')
    def test_website_access_portal(self):
        """ Portal users access only published events """
        self.authenticate('user_portal', 'user_portal')
        published_events = self.events.filtered(lambda event: event.website_published)
        resp = self.url_open('/event/%i' % published_events[0].id)
        self.assertEqual(resp.status_code, 200, 'Portal user must have access to published event.')

        unpublished_events = self.events.filtered(lambda event: not event.website_published)
        resp = self.url_open('/event/%i' % unpublished_events[0].id)
        self.assertEqual(resp.status_code, 403, 'Portal user must not have access to unpublished event.')

        resp = self.url_open('/event')
        self.assertTrue(published_events[0].name in resp.text, 'Portal must see the published events.')
        self.assertFalse(unpublished_events[0].name in resp.text, 'Portal should not see the unpublished events.')

    @mute_logger('weth.http')
    def test_website_access_public(self):
        """ Public users access only published events """
        published_events = self.events.filtered(lambda event: event.website_published)
        resp = self.url_open('/event/%i' % published_events[0].id)
        self.assertEqual(resp.status_code, 200, 'Public must have access to published event')

        unpublished_events = self.events.filtered(lambda event: not event.website_published)
        resp = self.url_open('/event/%i' % unpublished_events[0].id)
        self.assertEqual(resp.status_code, 404, 'Public must not have access to unpublished event')

        resp = self.url_open('/event')
        self.assertTrue(published_events[0].name in resp.text, 'Public must see the published events.')
        self.assertFalse(unpublished_events[0].name in resp.text, 'Public should not see the unpublished events.')

    def test_sitemap(self):
        resp = self.url_open('/sitemap.xml')
        self.assertTrue('/event/event-0' in resp.text, 'Published events must be present in the sitemap')
        self.assertTrue('/event/event-1' in resp.text, 'Published events must be present in the sitemap')
        self.assertFalse('/event/event-2' in resp.text, 'Unpublished events must not be present in the sitemap')

    @users('user_portal')
    def test_check_search_in_address(self):
        ret = self.env['event.event']._search_get_detail(
            self.website, order=None, options={}
        )
        result = ret['search_extra'](self.env, 'Turlock')[0][-1].get_result_ids()
        self.assertEqual(*result, self.events[0].id, 'Event should exist for the searched term')

        with self.assertRaises(AccessError):
            self.env['res.partner'].browse(self.partner.id).read()
