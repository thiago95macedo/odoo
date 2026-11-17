# Part of WETH. See LICENSE file for full copyright and licensing details.

import io

from PIL import Image

from weth.fields import Command
from weth.tests import HttpCase, tagged
from weth.tools import BinaryBytes
from weth.tools.image import binary_to_image

from weth.addons.website.tests.common import HttpCaseWithWebsiteUser


def _create_image(color="black", dims=(1920, 1080), format="JPEG"):
    f = io.BytesIO()
    Image.new("RGB", dims, color).save(f, format)  # type: ignore
    f.seek(0)
    return BinaryBytes(f.read())


@tagged("post_install", "-at_install")
class TestWebsiteSaleImage(HttpCaseWithWebsiteUser):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        color_red = "#CD5C5C"
        name_red = "Indian Red"

        color_green = "#228B22"
        name_green = "Forest Green"

        color_blue = "#4169E1"
        name_blue = "Royal Blue"

        # create the color attribute
        cls.product_attribute = cls.env["product.attribute"].create({
            "name": "Beautiful Color",
            "display_type": "color",
            "value_ids": [
                Command.create({"name": name_red, "html_color": color_red, "sequence": 1}),
                Command.create({"name": name_green, "html_color": color_green, "sequence": 2}),
                Command.create({"name": name_blue, "html_color": color_blue, "sequence": 3}),
            ],
        })

        cls.blue_image = _create_image(color=color_blue)
        cls.red_image = _create_image(color=color_red, dims=(800, 500))
        cls.green_image = _create_image(color=color_green)

        cls.template = cls.env["product.template"].create({
            "name": "A Colorful Image",
            "attribute_line_ids": [
                Command.create({
                    "attribute_id": cls.product_attribute.id,
                    "value_ids": [Command.set(cls.product_attribute.value_ids.ids)],
                })
            ],
            "image_1920": cls.blue_image,
        })

        line = cls.template.attribute_line_ids
        cls.value_red = line.product_template_value_ids[0]
        cls.value_green = line.product_template_value_ids[1]
        cls.value_blue = line.product_template_value_ids[2]

        cls.product_red = cls.template._get_variant_for_combination(cls.value_red)
        cls.product_green = cls.template._get_variant_for_combination(cls.value_green)
        cls.product_blue = cls.template._get_variant_for_combination(cls.value_blue)


    def test_02_image_holder(self):
        image = _create_image(color="#FF0000", dims=(800, 500))

        # create the template, without creating the variants
        template = (
            self
            .env["product.template"]
            .with_context(create_product_product=False)
            .create({"name": "Test subject"})
        )

        # when there are no variants, the image must be obtained from the template
        self.assertEqual(template, template._get_image_holder())

        # set the color attribute and values on the template
        line = self.env["product.template.attribute.line"].create([
            {
                "attribute_id": self.product_attribute.id,
                "product_tmpl_id": template.id,
                "value_ids": [Command.set(self.product_attribute.value_ids.ids)],
            }
        ])
        value_red = line.product_template_value_ids[0]
        product_red = template._get_variant_for_combination(value_red)
        product_red.image_variant_1920 = image

        value_green = line.product_template_value_ids[1]
        product_green = template._get_variant_for_combination(value_green)
        product_green.image_variant_1920 = image

        # when there are no template image but there are variants, the image must be obtained from
        # the first variant
        self.assertEqual(product_red, template._get_image_holder())

        product_red.action_archive()

        # but when some variants are not available, the image must be obtained from the first
        # available variant
        self.assertEqual(product_green, template._get_image_holder())

        template.image_1920 = image

        # when there is a template image, the image must be obtained from the template
        self.assertEqual(template, template._get_image_holder())


    def test_04_assign_image_to_variants(self):
        self.template.write({
            "product_template_image_ids": [
                Command.create({
                    "name": "green",
                    "image_1920": self.green_image,
                    "attribute_value_ids": [Command.set([self.value_green.id, self.value_blue.id])],
                })
            ]
        })

        self.assertEqual(
            self.product_green.variant_image_ids[0].image_1920.content, self.green_image.content
        )

        self.assertEqual(
            self.product_blue.variant_image_ids[0].image_1920.content, self.green_image.content
        )

    def test_05_remove_main_image_fallback_to_extra_image(self):
        self.template.write({
            "product_template_image_ids": [
                Command.create({"name": "green", "image_1920": self.green_image})
            ]
        })

        self.template.image_1920 = False

        self.assertEqual(self.template.image_1920.content, self.green_image.content)

        # If we remove the main image which is same as first extra image then it will remove extra
        # image also.
        self.template.image_1920 = False
        self.assertFalse(self.template.product_template_image_ids)

    def test_06_remove_main_image_fallback_to_variant_extra_image(self):
        self.template.write({
            "product_template_image_ids": [
                Command.create({
                    "name": "red",
                    "image_1920": self.red_image,
                    "attribute_value_ids": [Command.link(self.value_red.id)],
                })
            ]
        })
        self.template.image_1920 = False

        self.assertEqual(self.template.image_1920.content, self.red_image.content)

    def test_07_remove_main_variant_image_fallback_to_extra_image(self):
        self.product_red.image_1920 = self.green_image

        self.product_red.write({
            "product_template_image_ids": [
                Command.create({
                    "name": "red",
                    "image_1920": self.red_image,
                    "attribute_value_ids": [Command.link(self.value_red.id)],
                })
            ]
        })

        self.product_red.image_1920 = False

        self.assertEqual(self.product_red.image_1920.content, self.red_image.content)


@tagged("post_install", "-at_install")
class TestWebsiteSaleRemoveImage(HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # First image (blue) for the template.
        color_blue = "#4169E1"
        name_blue = "Royal Blue"
        # Red for the variant.
        color_red = "#CD5C5C"
        name_red = "Indian Red"
        # Green for the replacement
        color_green = "#228B22"

        # Attachment needed for the replacement of images
        cls.env["ir.attachment"].create({
            "public": True,
            "name": "green.jpg",
            "type": "binary",
            "raw": _create_image(color=color_green),
        })

        # Create the color attribute.
        cls.product_attribute = cls.env["product.attribute"].create({
            "name": "Beautiful Color",
            "display_type": "color",
        })

        # create the color attribute values
        cls.attr_values = cls.env["product.attribute.value"].create([
            {
                "name": name_blue,
                "attribute_id": cls.product_attribute.id,
                "html_color": color_blue,
                "sequence": 1,
            },
            {
                "name": name_red,
                "attribute_id": cls.product_attribute.id,
                "html_color": color_red,
                "sequence": 2,
            },
        ])

        cls.template = (
            cls
            .env["product.template"]
            .with_context(create_product_product=False)
            .create({"name": "Test Remove Image", "image_1920": _create_image(color=color_blue)})
        )


