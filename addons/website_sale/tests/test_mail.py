# Part of WETH. See LICENSE file for full copyright and licensing details.

from unittest.mock import patch

import weth
from weth import SUPERUSER_ID, fields
from weth.tests import tagged

from weth.addons.base.tests.common import HttpCaseWithUserPortal
from weth.addons.mail.tests.common import MailCommon
from weth.addons.website_sale.tests.common import WebsiteSaleCommon


@tagged("post_install", "-at_install", "mail_thread")
class TestWebsiteSaleMail(HttpCaseWithUserPortal):

    def test_shop_product_mail_action_redirection(self):
        product_template = self.env["product.template"].create({
            "name": "test product template",
            "sale_ok": True,
            "website_published": True,
        })
        url = f"/mail/view?model=product.template&res_id={product_template.id}"
        shop_url = f"/shop/test-product-template-{product_template.id}"

        with self.subTest(user="admin"):
            self.authenticate("admin", "admin")
            res = self.url_open(url)
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.request.path_url.startswith("/weth/product.template"))

        with self.subTest(user="portal"):
            self.authenticate("portal", "portal")
            res = self.url_open(url)
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.request.path_url, shop_url)

        with self.subTest(user=None):
            self.authenticate(None, None)
            res = self.url_open(url)
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.request.path_url, shop_url)



@tagged("post_install", "-at_install", "mail_thread")
class TestWebsiteSaleMails(MailCommon, WebsiteSaleCommon):
    _test_user_groups = (
        'base.group_user',
        'product.group_product_manager',
        'sales_team.group_sale_manager',  # FIXME: use sales_team.group_sale_salesman
        'website.group_website_designer',  # website config (salesperson_id, confirmation_email_template_id)
    )

    _test_user_name = 'Test Sales & Product Manager'

    def test_salesman_assignation(self):
        self.website.salesperson_id = self.user_admin
        MailThread = weth.addons.mail.models.mail_thread.MailThread
        base_method = MailThread._message_create
        superuser = self.env["res.users"].browse(SUPERUSER_ID)

        # Public user
        with patch.object(
            MailThread, "_message_create", autospec=True, side_effect=base_method
        ) as patcher:
            self.cart.with_user(self.public_user).sudo().action_confirm()
            patcher.assert_called()

            order, msg_values = None, {}
            for (record, call_args), _whatever in patcher.call_args_list:
                if record._name == "sale.order":
                    order = record
                    msg_values = call_args[0]
                    break

            self.assertEqual(order, self.cart)
            self.assertEqual(msg_values["author_id"], superuser.partner_id.id)
            self.assertEqual(msg_values["partner_ids"], self.partner_admin.ids)
            self.assertEqual(msg_values["subject"], f"You have been assigned to {order.name}")

        # Portal user
        user_portal = self._create_portal_user()
        portal_partner = user_portal.partner_id
        portal_user_cart = self.cart.copy({"partner_id": portal_partner.id, "user_id": False})
        with patch.object(
            MailThread, "_message_create", autospec=True, side_effect=base_method
        ) as patcher:
            portal_user_cart.with_user(user_portal).sudo().action_confirm()
            patcher.assert_called()

            order, msg_values = None, {}
            for (record, call_args), _whatever in patcher.call_args_list:
                if record._name == "sale.order":
                    order = record
                    msg_values = call_args[0]
                    break

            self.assertEqual(order, portal_user_cart)
            self.assertEqual(msg_values["author_id"], superuser.partner_id.id)
            self.assertEqual(msg_values["partner_ids"], self.partner_admin.ids)
            self.assertEqual(msg_values["subject"], f"You have been assigned to {order.name}")

    def test_website_specific_confirmation_template_is_used(self):
        """Ensure website-specific confirmation template is used."""
        template = self.env["mail.template"].sudo().create({
            "name": "Website Custom Confirmation Template",
            "model_id": self.env.ref("sale.model_sale_order").id,
            "subject": "Website Confirmation",
            "body_html": "<p>Hello</p>",
        })
        self.website.confirmation_email_template_id = template

        with patch.object(self.env.registry["sale.order"], "_send_order_notification_mail") as mock:
            self.cart._send_order_confirmation_mail()
            mock.assert_called_once()
            returned_confirmation_template = mock.call_args[0][0]
            self.assertEqual(returned_confirmation_template, template)
