# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import Command
from weth.tests import HttpCase, new_test_user, tagged
from weth.tools import file_open

from weth.addons.product.tests.common import ProductVariantsCommon
from weth.addons.website_sale.tests.common import WebsiteSaleCommon


@tagged("post_install", "-at_install")
class TestWebsiteSaleProductPage(HttpCase, ProductVariantsCommon, WebsiteSaleCommon):
    _test_user_groups = (
        'base.group_user',
        'product.group_product_manager',
        'sales_team.group_sale_manager',  # product.public.category setup
        'website.group_website_designer',  # website config + qweb view activation
    )

    _test_user_name = 'Test Product Manager'

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls.product_template_sofa.website_published = True



    def test_portal_user_can_upload_attachment_on_product_review(self):
        """
        A portal user must be able to attach a file when posting a
        product review once reviews are enabled for the current website.
        """
        portal_user = new_test_user(
            self.env, login='product_review_portal', groups='base.group_portal',
            password='product_review_portal',
        )
        generic_view = self.env['ir.ui.view'].with_context(active_test=False).search([
            ('key', '=', 'website_sale.product_comment'),
        ], limit=1)
        generic_view.with_context(website_id=self.website.id).write({'active': True})

        self.product_template_sofa.website_published = True

        self.authenticate(portal_user.login, 'product_review_portal')
        with file_open("addons/web/__init__.py") as file:
            response = self.url_open(
                url="/mail/attachment/upload",
                data={
                    "csrf_token": self.csrf_token(),
                    "thread_id": self.product_template_sofa.id,
                    "thread_model": "product.template",
                },
                files={"ufile": file},
            )

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertNotIn('error', result, result.get('error'))
        attachment_id = result['data']['attachment_id']
        self.assertTrue(self.env['ir.attachment'].sudo().browse(attachment_id).exists())




    def test_open_shop_on_product_with_no_variants(self):
        self.env['res.config.settings'].sudo().create({
            "group_show_uom_price": True,
        }).execute()
        self.product_template_sofa.product_variant_ids.unlink()
        response = self.url_open("/shop")
        self.assertEqual(response.status_code, 200)
