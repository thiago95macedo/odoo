# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.

import weth.tests

from weth.tests import Form

from weth.addons.product_matrix.tests.common import TestMatrixCommon


@weth.tests.tagged('post_install', '-at_install')
class TestPurchaseMatrixUi(TestMatrixCommon):


    def test_translate_never_variant_attributes_on_pol(self):
        """ Check that the attribute values set on a pol for never variant attribute are translated according to the seller language.
        """
        self.env['res.lang']._activate_lang('fr_BE')
        french_partner = self.env['res.partner'].create({
            'name': 'French Partner',
            'lang': 'fr_BE',
            'email': 'french.partner@test.com',
        })
        product_template = self.matrix_template
        product_template.with_context(lang='fr_BE').name = 'matrixFR'
        attribute_never = product_template.attribute_line_ids.attribute_id[-1]
        attribute_never.with_context(lang='fr_BE').name = 'PA4FR'
        attribute_never.value_ids[0].with_context(lang='fr_BE').name = 'PAV41FR'
        product_template.product_variant_ids = self.env['product.product'].create({'name': product_template.name})
        purchase_order = self.env['purchase.order'].create({
            'partner_id': french_partner.id,
        })
        with Form(purchase_order) as po_form:
            with po_form.order_line.new() as line:
                line.product_no_variant_attribute_value_ids = attribute_never.template_value_ids[0]
                line.product_id = product_template.product_variant_id
        self.assertEqual(
            purchase_order.order_line.label, "matrixFR\nPA4FR: PAV41FR"
        )
