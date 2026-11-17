# Part of WETH. See LICENSE file for full copyright and licensing details.
import logging

from lxml import html
from werkzeug.urls import url_encode

from weth.tests import HttpCase, tagged
from weth.addons.http_routing.tests.common import MockRequest
from weth.addons.website.tools import create_image_attachment

_logger = logging.getLogger(__name__)


@tagged('post_install', '-at_install', 'website_snippets')
class TestSnippets(HttpCase):

    def fetch_proxy(self, url):
        if 'twitter.com' in url or 'youtube.com' in url:
            _logger.info('External chrome request during tests: Sending dummy page for %s', url)
            return self.make_fetch_proxy_response('<body>Dummy page</body>')
        return super().fetch_proxy(url)


























    def test_snippet_pill_shape(self):
        res = self.url_open('/html_editor/image_shape/website.portrait_lg_1/html_builder/geometric_round/geo_round_pill.svg')
        svg = html.fromstring(res.text)
        self.assertEqual(float(svg.attrib['width']), 1000, "SVG should have the width of the original image")
        self.assertEqual(float(svg.attrib['height']), 2000, "SVG height should be double the width because the pill shape has a default aspect ratio of 1/2")
        image_elem = svg.find('.//image')
        self.assertEqual(image_elem.attrib['width'], '100%')
        self.assertEqual(image_elem.attrib['height'], '100%')
        self.assertEqual(image_elem.attrib['preserveaspectratio'], 'xMidYMid slice')

    def test_change_cookie_policy_page(self):
        website = self.env.ref('base.default_website')
        website.cookies_bar = True
        cookie_page = self.env["website.page"].create({
            "name": "Test Cookie Policy",
            "type": "qweb",
            "url": "/test-cookie-policy",
            "website_id": website.id,
        })
        website.cookie_policy_id = cookie_page
        # Verify /website/cookie-policy redirects to the configured policy page
        res = self.url_open('/website/cookie-policy', allow_redirects=False)
        self.assertEqual(res.status_code, 303)
        self.assertTrue(res.headers['Location'].endswith('/test-cookie-policy'))

        # Explicitly remove custom policy if any
        website.cookie_policy_id = False
        # The default policy page must be restored: the policy should never be
        # left empty while the cookies bar is enabled.
        self.assertEqual(website.cookie_policy_id.url, '/cookie-policy')
        res = self.url_open('/website/cookie-policy', allow_redirects=False)

        # Should redirect to default /cookie-policy page
        self.assertEqual(res.status_code, 303)
        self.assertTrue(res.headers['Location'].endswith('/cookie-policy'))



