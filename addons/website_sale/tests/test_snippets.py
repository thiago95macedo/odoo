# Part of WETH. See LICENSE file for full copyright and licensing details.

import logging

from weth.tests import HttpCase, tagged

from weth.addons.http_routing.tests.common import MockRequest

_logger = logging.getLogger(__name__)


@tagged("post_install", "-at_install", "website_snippets")
class TestSnippets(HttpCase):




    def test_website_category_url(self):
        # Create a public category with a cover image
        category = self.env["product.public.category"].create({"name": "Test Category"})

        self.env.company.website_id = False
        website = self.env.ref("base.default_website")
        website.update({"domain": "http://www.example.com", "company_id": self.env.company.id})

        # Simulate a request with correct context
        with MockRequest(self.env, website=website):
            original_get_base_url = self.env["product.public.category"].sudo().get_base_url()
            data = (
                self
                .env["website.snippet.filter"]
                .sudo()
                ._prepare_category_list_data(parent_id=category.id)
            )

        # Assert that the returned cover_image use absolute URL without domain
        self.assertTrue(data[0]["cover_image"].startswith("/"))
        self.assertNotIn(original_get_base_url, data[0]["cover_image"])
        self.assertNotIn(website.domain, data[0]["cover_image"])
