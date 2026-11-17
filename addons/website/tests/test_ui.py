# Part of WETH. See LICENSE file for full copyright and licensing details.

import json

from werkzeug.urls import url_encode

import weth.tests
from weth import http
from weth.addons.base.tests.common import HttpCaseWithUserDemo
from weth.addons.html_editor.controllers.main import HTML_Editor
from weth.addons.website.tests.common import HttpCaseWithWebsiteUser, set_url_code
from weth.fields import Command
from weth.tools import mute_logger


@weth.tests.tagged('-at_install', 'post_install')
class TestUiCustomizeTheme(weth.tests.HttpCase):
    def test_01_attachment_website_unlink(self):
        ''' Some ir.attachment needs to be unlinked when a website is unlink,
            otherwise some flows will just crash. That's the case when 2 website
            have their theme color customized. Removing a website will make its
            customized attachment generic, thus having 2 attachments with the
            same URL available for other websites, leading to singleton errors
            (among other).

            But no all attachment should be deleted, eg we don't want to delete
            a SO or invoice PDF coming from an ecommerce order.
        '''
        Website = self.env['website']
        Page = self.env['website.page']
        Attachment = self.env['ir.attachment']

        website_default = self.env.ref('base.default_website')
        website_test = Website.create({'name': 'Website Test'})

        # simulate attachment state when editing 2 theme through customize
        custom_url = '/_custom/web.assets_frontend/TEST/website/static/src/scss/options/colors/user_theme_color_palette.scss'
        scss_attachment = Attachment.create({
            'name': custom_url,
            'type': 'binary',
            'mimetype': 'text/scss',
            'url': custom_url,
            'website_id': website_default.id
        })
        scss_attachment.copy({'website_id': website_test.id})

        # simulate PDF from ecommerce order
        # Note: it will only have its website_id flag if the website has a domain
        # equal to the current URL.
        so_attachment = Attachment.create({
            'name': 'SO036.pdf',
            'type': 'binary',
            'mimetype': 'application/pdf',
            'website_id': website_test.id
        })

        # avoid sql error on page website_id restrict
        Page.search([('website_id', '=', website_test.id)]).unlink()
        website_test.unlink()
        self.assertEqual(Attachment.search_count([('url', '=', custom_url)]), 1, 'Should not left duplicates when deleting a website')
        self.assertTrue(so_attachment.exists(), 'Most attachment should not be deleted')
        self.assertFalse(so_attachment.website_id, 'Website should be removed')






@weth.tests.tagged('-at_install', 'post_install')
class TestUiTranslate(weth.tests.HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        set_url_code(cls.env.ref('base.lang_fr'))












@weth.tests.common.tagged('post_install', '-at_install')
class TestUi(HttpCaseWithWebsiteUser):



























































    def add_fr_language_to_website(self):
        lang_en = self.env.ref('base.lang_en')
        lang_fr = self.env.ref('base.lang_fr')
        self.env['res.lang']._activate_lang(lang_fr.code)
        self.env.ref('base.default_website').write({
            'default_lang_id': lang_en.id,
            'language_ids': [Command.link(lang_en.id), Command.link(lang_fr.id)],
        })










