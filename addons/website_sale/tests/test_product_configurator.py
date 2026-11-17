# Part of WETH. See LICENSE file for full copyright and licensing details.

from datetime import datetime

from weth.fields import Command
from weth.tests import HttpCase, tagged

from weth.addons.website_sale.controllers.product_configurator import (
    WebsiteSaleProductConfiguratorController,
)
from weth.addons.website_sale.tests.common import MockRequest, WebsiteSaleCommon


@tagged("post_install", "-at_install")
class TestWebsiteSaleProductConfigurator(HttpCase, WebsiteSaleCommon):
    _test_user_groups = (
        'base.group_user',
        'product.group_product_manager',
        'sales_team.group_sale_manager',  # FIXME: use sales_team.group_sale_salesman
        'website.group_website_designer',  # website create/config
    )

    _test_user_name = 'Test Sales & Product Manager'

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls.pc_controller = WebsiteSaleProductConfiguratorController()


    def test_product_configurator_optional_products(self):
        """Test that the product configurator is shown if the product has optional products."""
        main_product = self.env["product.template"].create({
            "name": "Main product",
            "website_published": True,
            "optional_product_ids": [
                Command.create({"name": "Optional product", "website_published": True})
            ],
        })

        single_product_variant_dict = main_product.get_single_product_variant()

        with self.mock_request():
            show_configurator = self.pc_controller.should_show_product_configurator(
                single_product_variant_dict, main_product, is_product_configured=False
            )

        self.assertTrue(show_configurator)

    def test_optional_products_not_visible_on_other_websites(self):
        """Optional products assigned to a different website should not be shown."""
        second_website = self.env["website"].sudo().create({"name": "second website"})
        optional_product = self.env["product.template"].create({
            "name": "Optional product",
            "website_published": True,
            "website_id": second_website.id,
        })

        main_product = self.env["product.template"].create({
            "name": "Main product",
            "website_published": True,
            "optional_product_ids": [Command.set(optional_product.ids)],
        })

        single_product_variant_dict = main_product.get_single_product_variant()

        with self.mock_request():
            show_configurator = self.pc_controller.should_show_product_configurator(
                single_product_variant_dict, main_product, is_product_configured=False
            )

        self.assertFalse(show_configurator)

    def test_product_configurator_single_variant(self):
        """Test that the product configurator isn't shown if the product has a single variant."""
        attribute = self.env["product.attribute"].create({
            "name": "Attribute",
            "value_ids": [Command.create({"name": "A"})],
        })
        main_product = self.env["product.template"].create({
            "name": "Main product",
            "website_published": True,
            "attribute_line_ids": [
                Command.create({
                    "attribute_id": attribute.id,
                    "value_ids": [Command.set(attribute.value_ids.ids)],
                })
            ],
        })

        single_product_variant_dict = main_product.get_single_product_variant()

        with self.mock_request():
            show_configurator = self.pc_controller.should_show_product_configurator(
                single_product_variant_dict, main_product, is_product_configured=False
            )

        self.assertFalse(show_configurator)

    def test_product_configurator_configured_with_empty_multi_checkbox(self):
        """Test that the product configurator isn't shown if the product is configured and has a
        multi-checkbox attribute with no selected values.
        """
        multi_attribute = self.env["product.attribute"].create({
            "name": "Multi-checkbox attribute",
            "display_type": "multi",
            "create_variant": "no_variant",
            "value_ids": [Command.create({"name": "A"}), Command.create({"name": "B"})],
        })
        main_product = self.env["product.template"].create({
            "name": "Main product",
            "website_published": True,
            "attribute_line_ids": [
                Command.create({
                    "attribute_id": multi_attribute.id,
                    "value_ids": [Command.set(multi_attribute.value_ids.ids)],
                })
            ],
        })

        single_product_variant_dict = main_product.get_single_product_variant()

        with self.mock_request():
            show_configurator = self.pc_controller.should_show_product_configurator(
                single_product_variant_dict, main_product, is_product_configured=True
            )

        self.assertFalse(show_configurator)

    def test_product_configurator_only_no_variant_attributes(self):
        """Test that the product configurator is shown if the product isn't configured and has only
        no_variant attributes.
        """
        no_variant_attribute = self.env["product.attribute"].create({
            "name": "No variant attribute",
            "create_variant": "no_variant",
            "value_ids": [Command.create({"name": "A"}), Command.create({"name": "B"})],
        })
        main_product = self.env["product.template"].create({
            "name": "Main product",
            "website_published": True,
            "attribute_line_ids": [
                Command.create({
                    "attribute_id": no_variant_attribute.id,
                    "value_ids": [Command.set(no_variant_attribute.value_ids.ids)],
                })
            ],
        })

        single_product_variant_dict = main_product.get_single_product_variant()

        with self.mock_request():
            show_configurator = self.pc_controller.should_show_product_configurator(
                single_product_variant_dict, main_product, is_product_configured=False
            )

        self.assertTrue(show_configurator)

    def test_product_configurator_only_dynamic_attributes(self):
        """Test that the product configurator is shown if the product isn't configured and has only
        dynamic attributes.
        """
        dynamic_attribute = self.env["product.attribute"].create({
            "name": "Dynamic attribute",
            "create_variant": "dynamic",
            "value_ids": [Command.create({"name": "A"}), Command.create({"name": "B"})],
        })
        main_product = self.env["product.template"].create({
            "name": "Main product",
            "website_published": True,
            "attribute_line_ids": [
                Command.create({
                    "attribute_id": dynamic_attribute.id,
                    "value_ids": [Command.set(dynamic_attribute.value_ids.ids)],
                })
            ],
        })

        single_product_variant_dict = main_product.get_single_product_variant()

        with self.mock_request():
            show_configurator = self.pc_controller.should_show_product_configurator(
                single_product_variant_dict, main_product, is_product_configured=False
            )

        self.assertTrue(show_configurator)

    def test_product_configurator_single_custom_attribute(self):
        """Test that the product configurator is shown if the product isn't configured and has a
        single custom attribute.
        """
        custom_attribute = self.env["product.attribute"].create({
            "name": "Custom attribute",
            "value_ids": [Command.create({"name": "Custom value", "is_custom": True})],
        })
        main_product = self.env["product.template"].create({
            "name": "Main product",
            "website_published": True,
            "attribute_line_ids": [
                Command.create({
                    "attribute_id": custom_attribute.id,
                    "value_ids": [Command.set(custom_attribute.value_ids.ids)],
                })
            ],
        })

        single_product_variant_dict = main_product.get_single_product_variant()

        with self.mock_request():
            show_configurator = self.pc_controller.should_show_product_configurator(
                single_product_variant_dict, main_product, is_product_configured=False
            )

        self.assertTrue(show_configurator)

    def test_product_configurator_sale_not_ok(self):
        """Test that the product configurator skips optional products which aren't `sale_ok`."""
        optional_product = self.env["product.template"].create({
            "name": "Optional product",
            "website_published": True,
            "sale_ok": False,
        })
        main_product = self.env["product.template"].create({
            "name": "Main product",
            "website_published": True,
            "optional_product_ids": [Command.set(optional_product.ids)],
        })

        single_product_variant_dict = main_product.get_single_product_variant()

        with self.mock_request():
            show_configurator = self.pc_controller.should_show_product_configurator(
                single_product_variant_dict, main_product, is_product_configured=False
            )
            configurator_values = self.pc_controller.website_sale_product_configurator_get_values(
                product_template_id=main_product.id,
                quantity=1,
                currency_id=self.currency.id,
                so_date="2000-01-01",
                pricelist_id=None,
            )

        self.assertFalse(show_configurator)
        self.assertFalse(configurator_values["has_optional_products"])
        self.assertNotIn("products", configurator_values)
        self.assertNotIn("optional_products", configurator_values)

    def test_product_configurator_extra_price_taxes(self):
        """Test that the product configurator applies taxes to PTAV extra prices."""
        self.website.show_line_subtotals_tax_selection = "tax_included"
        tax = self.env["account.tax"].sudo().create({"name": "Tax", "amount": 10})
        attribute = (
            self
            .env["product.attribute"]
            .sudo()
            .create({
                "name": "Attribute",
                "value_ids": [Command.create({"name": "A", "default_extra_price": 1})],
            })
        )
        product = self.env["product.template"].create({
            "name": "Product",
            "website_published": True,
            "attribute_line_ids": [
                Command.create({
                    "attribute_id": attribute.id,
                    "value_ids": [Command.set(attribute.value_ids.ids)],
                })
            ],
            "taxes_id": tax,
        })

        with self.mock_request():
            ptav_price_extra = self.pc_controller._get_ptav_price_extra(
                product.attribute_line_ids.product_template_value_ids,
                self.currency,
                datetime(2000, 1, 1),
                product,
            )

        self.assertEqual(ptav_price_extra, 1.1)




    def test_get_product_combination_multi_attribute_with_archived_variant_and_inactive_ptav(self):
        """
        This test covers a case where a product has multiple attributes and one
        of the attribute values corresponds to an archived variant, with its
        ptav_active set to False.

        In this scenario, a valid combination should still be possible, and the
        resulting combination product must not be the archived variant.
        """
        attribute_single = self.env["product.attribute"].create({
            "name": "attribute single",
            "value_ids": [Command.create({"name": "single"})],
        })
        attribute_multi = self.env["product.attribute"].create({
            "name": "attribute multi",
            "value_ids": [
                Command.create({"name": "first"}),
                Command.create({"name": "second"}),
                Command.create({"name": "third"}),
            ],
        })
        main_product = self.env["product.template"].create({
            "name": "Main product",
            "website_published": True,
            "attribute_line_ids": [
                Command.create({
                    "attribute_id": attribute_single.id,
                    "value_ids": [Command.set(attribute_single.value_ids.ids)],
                }),
                Command.create({
                    "attribute_id": attribute_multi.id,
                    "value_ids": [Command.set(attribute_multi.value_ids.ids)],
                }),
            ],
        })
        main_product.product_variant_ids.filtered(
            lambda product: product.product_template_attribute_value_ids[1].name == "first"
        ).action_archive()
        main_product.attribute_line_ids[1].product_template_value_ids[0].ptav_active = False
        with self.mock_request() as request:
            product_values = self.pc_controller._prepare_product_values(
                main_product.with_context(request.env.context),
                **{str(attribute_single.id): str(attribute_single.value_ids.id)},
            )
        is_combination_possible = product_values["combination_info"]["is_combination_possible"]
        combination_product_id = product_values["combination_info"]["product_id"]
        self.assertTrue(is_combination_possible)
        self.assertTrue(self.env["product.product"].browse(combination_product_id).active)

    def test_product_page_category_respects_current_website(self):
        """When two categories share the same name but belong to different websites, the product
        page breadcrumb should show the category accessible from the current website, not the one
        from another website.
        """
        second_website = self.env["website"].sudo().create({"name": "Second Website"})

        categ_website_1 = self.env["product.public.category"].create({
            "name": "My Category",
            "website_id": self.website.id,
        })
        categ_website_2 = self.env["product.public.category"].create({
            "name": "My Category",
            "website_id": second_website.id,
        })

        product_tmpl = self.env["product.template"].create({
            "name": "Multi Website Product",
            "website_published": True,
            "public_categ_ids": [Command.set([categ_website_1.id, categ_website_2.id])],
        })

        # On website 1, the category from website 1 should be selected.
        with MockRequest(self.website.env, website=self.website) as request:
            values = self.pc_controller._prepare_product_values(
                product_tmpl.with_context(request.env.context)
            )
        self.assertEqual(values["category"], categ_website_1)

        # On website 2, the category from website 2 should be selected.
        with MockRequest(self.website.env, website=second_website) as request:
            values = self.pc_controller._prepare_product_values(
                product_tmpl.with_context(request.env.context)
            )
        self.assertEqual(values["category"], categ_website_2)

