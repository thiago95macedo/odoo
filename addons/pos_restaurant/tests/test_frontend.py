# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.
from unittest.mock import patch
from freezegun import freeze_time

import weth.tests
from weth.addons.point_of_sale.tests.common_setup_methods import setup_product_combo_items
from weth.addons.point_of_sale.tests.common import archive_products
from weth.addons.point_of_sale.tests.common import CommonPosTest
from weth.addons.point_of_sale.tests.test_frontend import TestPointOfSaleHttpCommon
from weth import Command, fields
import json
from datetime import datetime, timedelta

@weth.tests.tagged('post_install', '-at_install')
class TestFrontendCommon(TestPointOfSaleHttpCommon, CommonPosTest):

    _test_user_groups = None  # FIXME list needed groups

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        archive_products(cls.env)

        food_category = cls.env['pos.category'].create({'name': 'Food', 'sequence': 1})
        drinks_category = cls.env['pos.category'].create({'name': 'Drinks', 'sequence': 2})
        breads_category = cls.env['pos.category'].create({'name': 'Breads', 'sequence': 3})

        printer = cls.env['pos.printer'].create({
            'name': 'Preparation Printer',
            'printer_ip': '127.0.0.1',
            'printer_type': 'epson_epos',
            'product_categories_ids': [drinks_category.id],
            'use_type': 'preparation',
        })

        main_company = cls.env.company
        test_sale_journal_2 = cls.env['account.journal'].create({
            'name': 'Sales Journal - Test2',
            'code': 'TSJ2',
            'type': 'sale',
            'company_id': main_company.id
            })
        cash_journal_2 = cls.env['account.journal'].create({
            'name': 'Cash 2',
            'type': 'cash',
            'company_id': main_company.id,
        })
        cls.pos_config = cls.env['pos.config'].create({
            'name': 'Bar Prout',
            'module_pos_restaurant': True,
            'iface_printbill': True,
            'use_order_printer': True,
            'preparation_printer_ids': [(4, printer.id)],
            'iface_tipproduct': False,
            'company_id': cls.env.company.id,
            'journal_id': test_sale_journal_2.id,
            'payment_method_ids': [
                (4, cls.bank_payment_method.id),
                (0, 0, {
                    'name': 'Cash',
                    'receivable_account_id': cls.account_receivable.id,
                    'journal_id': cash_journal_2.id,
                    'type': 'cash',
                }),
            ],
        })
        cls.main_pos_config = cls.pos_config

        cls.pos_config.floor_ids.unlink()

        cls.main_floor = cls.env['restaurant.floor'].create({
            'name': 'Main Floor',
            'pos_config_ids': [(4, cls.pos_config.id)],
        })
        cls.second_floor = cls.env['restaurant.floor'].create({
            'name': 'Second Floor',
            'pos_config_ids': [(4, cls.pos_config.id)],
        })

        cls.main_floor_table_5 = cls.env['restaurant.table'].create([{
            'table_number': 5,
            'floor_id': cls.main_floor.id,
            'seats': 4,
            'floor_plan_layout': {'top': 100, 'left': 100, 'width': 100, 'height': 100, 'color': 'green'},
        }])
        cls.env['restaurant.table'].create([{
            'table_number': 4,
            'floor_id': cls.main_floor.id,
            'seats': 4,
            'floor_plan_layout': {'top': 100, 'left': 350, 'width': 100, 'height': 100, 'color': 'green'},
        },
        {
            'table_number': 2,
            'floor_id': cls.main_floor.id,
            'seats': 4,
            'floor_plan_layout': {'top': 100, 'left': 250, 'width': 100, 'height': 100, 'color': 'green'},
        },
        {

            'table_number': 1,
            'floor_id': cls.second_floor.id,
            'seats': 4,
            'floor_plan_layout': {'top': 150, 'left': 100, 'width': 100, 'height': 100, 'color': 'green'},
        },
        {
            'table_number': 3,
            'floor_id': cls.second_floor.id,
            'seats': 4,
            'floor_plan_layout': {'top': 250, 'left': 100, 'width': 100, 'height': 100, 'color': 'green'},
        }])

        cls.env['ir.default'].set(
            'res.partner',
            'property_account_receivable_id',
            cls.account_receivable.id,
            company_id=main_company.id,
        )

        cls.coca_cola_test = cls.env['product.product'].create({
            'available_in_pos': True,
            'list_price': 2.20,
            'name': 'Coca-Cola',
            'weight': 0.01,
            'pos_categ_ids': [(4, drinks_category.id)],
            'taxes_id': [(6, 0, [])],
        })

        cls.water_test = cls.env['product.product'].create({
            'available_in_pos': True,
            'list_price': 2.20,
            'name': 'Water',
            'weight': 0.01,
            'pos_categ_ids': [(4, drinks_category.id)],
            'taxes_id': [(6, 0, [])],
        })

        cls.minute_maid_test = cls.env['product.product'].create({
            'available_in_pos': True,
            'list_price': 2.20,
            'name': 'Minute Maid',
            'weight': 0.01,
            'pos_categ_ids': [(4, drinks_category.id)],
            'taxes_id': [(6, 0, [])],
        })

        cls.bruschetta = cls.env['product.product'].create({
            'available_in_pos': True,
            'list_price': 8.50,
            'name': 'Bruschetta',
            'pos_categ_ids': [(4, food_category.id)],
            'taxes_id': [(6, 0, [])],
        })

        cls.wholemeal_loaf = cls.env['product.product'].create({
            'available_in_pos': True,
            'list_price': 2.99,
            'name': 'Wholemeal loaf',
            'pos_categ_ids': [(4, breads_category.id)],
            'taxes_id': [(6, 0, [])],
        })

        # multiple categories product
        cls.env['product.product'].create({
            'available_in_pos': True,
            'list_price': 2.20,
            'name': 'Test Multi Category Product',
            'weight': 0.01,
            'pos_categ_ids': [(4, drinks_category.id), (4, food_category.id)],
            'taxes_id': [(6, 0, [])],
        })

        # desk organizer (variant product)
        cls.desk_organizer = cls.env['product.product'].create({
            'name': 'Desk Organizer',
            'available_in_pos': True,
            'list_price': 5.10,
            'pos_categ_ids': [(4, drinks_category.id)],  # will put it as a drink for convenience
        })
        desk_size_attribute = cls.env['product.attribute'].create({
            'name': 'Size',
            'display_type': 'radio',
            'create_variant': 'no_variant',
        })
        desk_size_s = cls.env['product.attribute.value'].create({
            'name': 'S',
            'attribute_id': desk_size_attribute.id,
        })
        desk_size_m = cls.env['product.attribute.value'].create({
            'name': 'M',
            'attribute_id': desk_size_attribute.id,
        })
        desk_size_l = cls.env['product.attribute.value'].create({
            'name': 'L',
            'attribute_id': desk_size_attribute.id,
        })
        cls.env['product.template.attribute.line'].create({
            'product_tmpl_id': cls.desk_organizer.product_tmpl_id.id,
            'attribute_id': desk_size_attribute.id,
            'value_ids': [(6, 0, [desk_size_s.id, desk_size_m.id, desk_size_l.id])]
        })
        desk_fabrics_attribute = cls.env['product.attribute'].create({
            'name': 'Fabric',
            'display_type': 'select',
            'create_variant': 'no_variant',
        })
        desk_fabrics_leather = cls.env['product.attribute.value'].create({
            'name': 'Leather',
            'attribute_id': desk_fabrics_attribute.id,
        })
        desk_fabrics_other = cls.env['product.attribute.value'].create({
            'name': 'Custom',
            'attribute_id': desk_fabrics_attribute.id,
            'is_custom': True,
        })
        cls.env['product.template.attribute.line'].create({
            'product_tmpl_id': cls.desk_organizer.product_tmpl_id.id,
            'attribute_id': desk_fabrics_attribute.id,
            'value_ids': [(6, 0, [desk_fabrics_leather.id, desk_fabrics_other.id])]
        })

        pricelist = cls.env['product.pricelist'].create({'name': 'Restaurant Pricelist'})
        second_pricelist = cls.env['product.pricelist'].create({'name': 'Second Pricelist'})
        cls.pos_config.write({'pricelist_id': pricelist.id})
        cls.pos_config.write({'available_pricelist_ids': [(6, 0, [pricelist.id, second_pricelist.id])]})

        cls.starter_course = cls.env['pos.course'].create({
            'name': 'Test - Starter',
            'category_ids': [(4, drinks_category.id)],
        })

        cls.main_course = cls.env['pos.course'].create({
            'name': 'Test - Main',
            'category_ids': [(4, food_category.id)],
        })


class TestFrontend(TestFrontendCommon):

    _test_user_groups = None  # FIXME list needed groups














    def test_close_with_planned_order_later_today(self):
        """
        This test ensures that an order planned for later today is not cancelled when the PoS session is closed,
        and that the session can be closed successfully.
        """
        self.main_pos_config.with_user(self.pos_user).open_ui()
        session = self.main_pos_config.current_session_id
        product = self.env['product.product'].search([('available_in_pos', '=', True)], limit=1)

        planned_order = self.env['pos.order'].create({
            'company_id': self.env.company.id,
            'session_id': session.id,
            'lines': [(0, 0, {
                'name': "OL/0001",
                'product_id': product.id,
                'price_unit': 10.0,
                'qty': 1.0,
                'price_subtotal': 10.0,
                'price_subtotal_incl': 10.0,
            })],
            'amount_tax': 0.0,
            'amount_total': 10.0,
            'amount_paid': 0.0,
            'amount_return': 0.0,
            'preset_time': fields.Datetime.now() + timedelta(hours=4),
        })

        session.close_session_from_ui()

        self.assertEqual(session.state, 'closed')
        self.assertEqual(planned_order.state, 'draft')
        self.assertFalse(planned_order.session_id)
























