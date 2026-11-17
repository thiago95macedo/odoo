# Part of WETH. See LICENSE file for full copyright and licensing details.

import json

import weth.tests


@weth.tests.common.tagged('post_install', '-at_install')
class TestWebsitePageManager(weth.tests.HttpCase):


    def test_generic_page_diverged_not_shown(self):
        Page = self.env['website.page']
        Website = self.env['website']

        website = self.env.ref('base.default_website')
        generic_page = Page.create({
            'name': 'Test Diverged',
            'type': 'qweb',
            'arch': '''
                <div>content</div>
            ''',
            'key': "test.test_diverged",
            'url': "/test_diverged",
            'is_published': True,
        })
        # trigger cow page creation
        generic_page.with_context(website_id=website.id).arch_db = '<div>COW content</div>'
        specific_page = Page.search([('url', '=', '/test_diverged'), ('website_id', '=', website.id)], limit=1)
        self.assertNotEqual(generic_page, specific_page)
        locs = website.with_context(website_id=website.id)._enumerate_pages(query_string="/test_diverged")
        self.assertEqual(len(list(locs)), 1, "Specific page should be shown as same url")
        specific_page.url = '/something_else'
        locs = website.with_context(website_id=website.id)._enumerate_pages(query_string="/test_diverged")
        self.assertEqual(len(list(locs)), 0, "Specific page should not be shown as not matching the requested URL and generic should not be shown either as it is shadowed by specific")

        # test that generic is still shown on other website
        website_2 = Website.create({'name': 'website 2'})
        locs = website_2.with_context(website_id=website_2.id)._enumerate_pages(query_string="/test_diverged")
        self.assertEqual(len(list(locs)), 1, "Generic page should be shown")

