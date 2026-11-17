# Part of WETH. See LICENSE file for full copyright and licensing details.

import logging

from dateutil.relativedelta import relativedelta
from unittest.mock import patch

from weth import tests
from weth.addons.base.tests.common import HttpCaseWithUserPortal
from weth.addons.base.tests.files import JPG_RAW, PDF_RAW
from weth.addons.gamification.tests.common import HttpCaseGamification
from weth.addons.mail.models.mail_message import MailMessage
from weth.fields import Command, Datetime
from weth.tools import BinaryBytes, mute_logger

_logger = logging.getLogger(__name__)


class TestUICommon(HttpCaseGamification, HttpCaseWithUserPortal):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # remove demo data
        cls.env["slide.channel"].search([]).unlink()

    def setUp(self):
        super().setUp()
        self.env.ref('gamification.rank_student').description_motivational = """
            <div class="d-flex align-items-center">
                <div class="flex-grow-1">Reach the next rank and gain a very nice mug!</div>
                <img class="ms-3 img img-fluid" style="max-height: 72px;" src="/gamification/static/img/rank_misc_mug.png"/>
            </div>"""

        self.channel = self.env['slide.channel'].create({
            'name': 'Basics of Gardening - Test',
            'user_id': self.env.ref('base.user_admin').id,
            'enroll': 'public',
            'channel_type': 'training',
            'allow_comment': True,
            'promote_strategy': 'most_voted',
            'is_published': True,
            'description': 'Learn the basics of gardening !',
            'create_date': Datetime.now() - relativedelta(days=8),
            'slide_ids': [
                (0, 0, {
                    'name': 'Gardening: The Know-How',
                    'sequence': 1,
                    'binary_content': BinaryBytes(PDF_RAW),
                    'slide_category': 'document',
                    'is_published': True,
                    'is_preview': True,
                }), (0, 0, {
                    'name': 'Home Gardening',
                    'sequence': 2,
                    'image_1920': BinaryBytes(JPG_RAW),
                    'slide_category': 'infographic',
                    'is_published': True,
                }), (0, 0, {
                    'name': 'Mighty Carrots',
                    'sequence': 3,
                    'image_1920': BinaryBytes(JPG_RAW),
                    'slide_category': 'infographic',
                    'is_published': True,
                }), (0, 0, {
                    'name': 'How to Grow and Harvest The Best Strawberries | Basics',
                    'sequence': 4,
                    'binary_content': BinaryBytes(PDF_RAW),
                    'slide_category': 'document',
                    'is_published': True,
                }), (0, 0, {
                    'name': 'Test your knowledge',
                    'sequence': 5,
                    'slide_category': 'quiz',
                    'is_published': True,
                    'question_ids': [
                        (0, 0, {
                            'question': 'What is a strawberry ?',
                            'answer_ids': [
                                (0, 0, {
                                    'text_value': 'A fruit',
                                    'is_correct': True,
                                    'sequence': 1,
                                }), (0, 0, {
                                    'text_value': 'A vegetable',
                                    'sequence': 2,
                                }), (0, 0, {
                                    'text_value': 'A table',
                                    'sequence': 3,
                                })
                            ]
                        }), (0, 0, {
                            'question': 'What is the best tool to dig a hole for your plants ?',
                            'answer_ids': [
                                (0, 0, {
                                    'text_value': 'A shovel',
                                    'is_correct': True,
                                    'sequence': 1,
                                }), (0, 0, {
                                    'text_value': 'A spoon',
                                    'sequence': 2,
                                })
                            ]
                        })
                    ]
                })
            ]
        })


@tests.common.tagged('post_install', '-at_install')
class TestUi(TestUICommon):

    @mute_logger("weth.http", "weth.addons.base.models.ir_access", "werkzeug")
    def test_course_access_fail_redirection(self):
        """Test that the user is redirected to /slides with en error displayed instead of the standard error page."""
        self.channel.visibility = "members"
        urls = (
            f"/slides/aaa-{self.channel.id}",
            f"/slides/{self.channel.id}",
            f"/slides/{self.channel.id}/page/1",
            f"/slides/aaa-{self.channel.id}/page/1",
            f"/slides/slide/{self.channel.slide_ids[0].id}",
            f"/slides/slide/aaa-{self.channel.slide_ids[0].id}",
            f"/slides/slide/{self.channel.slide_ids[0].id}/pdf_content",
            f"/slides/slide/aaa-{self.channel.slide_ids[0].id}/pdf_content",
        )
        for url in urls:
            response = self.url_open(url, allow_redirects=False)
            self.assertURLEqual(response.headers.get("Location"), "/slides?invite_error=no_rights")

        # auth="user" has priority
        urls = (
            f"/slides/slide/aaa-{self.channel.slide_ids[0].id}/set_completed",
            f"/slides/slide/{self.channel.slide_ids[0].id}/set_completed",
        )
        for url in urls:
            response = self.url_open(url, allow_redirects=False)
            location = self.parse_http_location(response.headers.get("Location"))
            self.assertEqual(location.path, "/web/login")

    def test_review_link_redirection(self):
        message = self.env["mail.message"].create(
            {
                "author_id": self.user_admin.partner_id.id,
                "body": "Test",
                "model": self.channel._name,
                "res_id": self.channel.id,
                "subtype_id": self.ref("mail.mt_comment"),
            }
        )
        cases = [
            ("admin", rf"^/weth/slide.channel/.*highlight_message_id={message.id}"),
            ("portal", rf"^/slides/.*highlight_message_id={message.id}"),
            (None, rf"^/slides/.*highlight_message_id={message.id}"),
        ]
        for login, url_pattern in cases:
            with self.subTest(user=login):
                self.authenticate(login, login)
                res = self.url_open(f"/mail/message/{message.id}")
                self.assertEqual(res.status_code, 200)
                self.assertRegex(res.request.path_url, url_pattern)








    def _add_reaction(self, message, reaction):
        self.make_jsonrpc_request(
            "/mail/message/reaction",
            {
                "action": "add",
                "content": reaction,
                "message_id": message.id,
            },
        )






@tests.common.tagged('post_install', '-at_install')
class TestUiPublisher(HttpCaseGamification):

    def fetch_proxy(self, url):
        if url.endswith('ThreeTimeAKCGoldWinnerPembrookeWelshCorgi.jpg'):
            _logger.info('External chrome request during tests: Sending dummy image for %s', url)
            return self.make_fetch_proxy_response(JPG_RAW)
        return super().fetch_proxy(url)



@tests.common.tagged('post_install', '-at_install')
class TestUiMemberInvited(TestUICommon):

    def setUp(self):
        super(TestUiMemberInvited, self).setUp()
        self.channel_partner_portal = self.env['slide.channel.partner'].create({
            'channel_id': self.channel.id,
            'partner_id': self.user_portal.partner_id.id,
            'member_status': 'invited',
            'last_invitation_date': Datetime.now(),
        })
        self.portal_invite_url = self.channel_partner_portal.invitation_link








