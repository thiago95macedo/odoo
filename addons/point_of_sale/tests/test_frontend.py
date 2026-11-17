# Part of WETH. See LICENSE file for full copyright and licensing details.

import inspect
import logging
import io

from PIL import Image
from contextlib import contextmanager
from unittest.mock import patch
from unittest import skip
from weth import Command, api

from weth.tools import BinaryBytes, DEFAULT_SERVER_DATE_FORMAT
from weth.tests import tagged, loaded_demo_data
from weth.addons.account.tests.common import TestTaxCommon, AccountTestInvoicingHttpCommon
from weth.addons.point_of_sale.tests.common_setup_methods import setup_product_combo_items
from datetime import date, timedelta
from weth.addons.point_of_sale.tests.common import archive_products
from weth.exceptions import UserError
from freezegun import freeze_time

_logger = logging.getLogger(__name__)


def _create_image(color: int | str = 0, dims=(1920, 1080), format='JPEG'):
    f = io.BytesIO()
    Image.new('RGB', dims, color).save(f, format)
    f.seek(0)
    return BinaryBytes(f.read())


class TestPointOfSaleHttpCommon(AccountTestInvoicingHttpCommon):

    _test_user_groups = None  # FIXME list needed groups

    @classmethod
    def _get_main_company(cls):
        return cls.company_data['company']

    def _get_url(self, pos_config=None):
        pos_config = pos_config or self.main_pos_config
        return f"/pos/ui/{pos_config.id}"

    @contextmanager
    def with_new_session(self, config=None, user=None):
        config = config or self.main_pos_config
        user = user or self.pos_user
        config.with_user(user).open_ui()
        session = config.current_session_id
        yield session
        closing_data = session.get_closing_control_data()
        cash_details = closing_data['default_cash_details']
        expected_cashbox_amount = cash_details['payment_amount']
        cash_pm = self.main_pos_config._get_cash_payment_method()
        session.close_session_from_ui({
            cash_pm.id: expected_cashbox_amount,
        })

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        env = cls.env
        cls.env.user.group_ids += env.ref('point_of_sale.group_pos_manager')
        journal_obj = env['account.journal']
        account_obj = env['account.account']
        main_company = cls._get_main_company()

        cls.account_receivable = account_obj.create({'code': 'X1012',
                                                 'name': 'Account Receivable - Test',
                                                 'account_type': 'asset_receivable',
                                                })
        env.company.account_default_pos_receivable_account_id = cls.account_receivable
        env['ir.default'].set('res.partner', 'property_account_receivable_id', cls.account_receivable.id, company_id=main_company.id)
        # Pricelists are set below, do not take demo data into account
        env['res.partner'].sudo().invalidate_model(['property_product_pricelist', 'specific_property_product_pricelist'])
        # remove the all specific values for all companies only for test
        env.cr.execute('UPDATE res_partner SET specific_property_product_pricelist = NULL')

        # Create user.
        cls.pos_user = cls.env['res.users'].create({
            'name': 'A simple PoS man!',
            'login': 'pos_user',
            'password': 'pos_user',
            'group_ids': [
                (4, cls.env.ref('base.group_user').id),
                (4, cls.env.ref('point_of_sale.group_pos_user').id),
                (4, cls.env.ref('base.group_partner_manager').id),
            ],
            'tz': 'America/New_York',
        })
        cls.pos_admin = cls.env['res.users'].create({
            'name': 'A powerful PoS man!',
            'login': 'pos_admin',
            'password': 'pos_admin',
            'group_ids': [
                (4, cls.env.ref('point_of_sale.group_pos_manager').id),
            ],
            'tz': 'America/New_York',
        })

        cls.pos_user.partner_id.email = 'pos_user@test.com'
        cls.pos_admin.partner_id.email = 'pos_admin@test.com'

        cls.bank_journal = journal_obj.create({
            'name': 'Bank Test',
            'type': 'bank',
            'company_id': main_company.id,
            'code': 'BNK',
            'sequence': 10,
        })

        cls.bank_payment_method = env['pos.payment.method'].create({
            'name': 'Bank',
            'type': 'bank',
            'journal_id': cls.bank_journal.id,
            'outstanding_account_id': cls.inbound_payment_method_line.payment_account_id.id,
        })
        env['pos.config'].search([]).unlink()
        cls.main_pos_config = env['pos.config'].create({
            'name': 'Shop',
            'module_pos_restaurant': False,
        })

        env['res.partner'].create({
            'name': 'Acme Corporation',
        })

        if 'enforce_cities' in cls.env['res.country']._fields:
            cls.env.company.country_id.enforce_cities = False

        cash_journal = journal_obj.create({
            'name': 'Cash Test',
            'type': 'cash',
            'company_id': main_company.id,
            'code': 'CSH',
            'sequence': 10,
        })

        archive_products(env)

        cls.pos_desk_misc_test = env['pos.category'].create({
            'name': 'Misc test',
        })
        cls.pos_cat_chair_test = env['pos.category'].create({
            'name': 'Chair test',
        })
        cls.pos_cat_desk_test = env['pos.category'].create({
            'name': 'Desk test',
        })

        # test an extra price on an attribute
        cls.whiteboard_pen = env['product.template'].create({
            'name': 'Whiteboard Pen',
            'available_in_pos': True,
            'list_price': 1.20,
            'taxes_id': False,
            'weight': 0.01,
            'pos_categ_ids': [(4, cls.pos_desk_misc_test.id)],
        })
        cls.wall_shelf = env['product.template'].create({
            'name': 'Wall Shelf Unit',
            'available_in_pos': True,
            'list_price': 1.98,
            'taxes_id': False,
            'barcode': '2100005000000',
        })
        cls.small_shelf = env['product.template'].create({
            'name': 'Small Shelf',
            'available_in_pos': True,
            'list_price': 2.83,
            'taxes_id': False,
        })
        cls.magnetic_board = env['product.template'].create({
            'name': 'Magnetic Board',
            'available_in_pos': True,
            'list_price': 1.98,
            'taxes_id': False,
            'barcode': '2305000000004',
        })
        cls.monitor_stand = env['product.template'].create({
            'name': 'Monitor Stand',
            'available_in_pos': True,
            'list_price': 3.19,
            'taxes_id': False,
            'barcode': '0123456789',  # No pattern in barcode nomenclature
        })
        cls.desk_pad = env['product.template'].create({
            'name': 'Desk Pad',
            'available_in_pos': True,
            'list_price': 1.98,
            'taxes_id': False,
            'pos_categ_ids': [(4, cls.pos_cat_desk_test.id)],
        })
        cls.letter_tray = env['product.template'].create({
            'name': 'Letter Tray',
            'available_in_pos': True,
            'list_price': 4.80,
            'taxes_id': False,
            'categ_id': env.ref('product.product_category_services').id,
            'pos_categ_ids': [(4, cls.pos_cat_chair_test.id)],
        })
        cls.desk_organizer = env['product.template'].create({
            'name': 'Desk Organizer',
            'available_in_pos': True,
            'list_price': 5.10,
            'taxes_id': False,
            'barcode': '2300002000007',
        })
        cls.configurable_chair = env['product.template'].create({
            'name': 'Configurable Chair',
            'available_in_pos': True,
            'list_price': 10,
            'taxes_id': False,
        })
        cls.vanela_gathiya = env['product.template'].create({
            'name': 'Vanela Gathiya',
            'available_in_pos': True,
            'list_price': 10,
            'taxes_id': False,
            'to_weight': True,
        })

        attribute = env['product.attribute'].create({
            'name': 'add 2',
        })
        attribute_value = env['product.attribute.value'].create({
            'name': 'add 2',
            'attribute_id': attribute.id,
        })
        line = env['product.template.attribute.line'].create({
            'product_tmpl_id': cls.whiteboard_pen.id,
            'attribute_id': attribute.id,
            'value_ids': [(6, 0, attribute_value.ids)]
        })
        line.product_template_value_ids[0].price_extra = 2

        cls.chair_color_attribute = env['product.attribute'].create({
            'name': 'Color',
            'display_type': 'color',
            'create_variant': 'no_variant',
        })
        cls.chair_color_red = env['product.attribute.value'].create({
            'name': 'Red',
            'attribute_id': cls.chair_color_attribute.id,
            'html_color': '#ff0000',
        })
        chair_color_blue = env['product.attribute.value'].create({
            'name': 'Blue',
            'attribute_id': cls.chair_color_attribute.id,
            'html_color': '#0000ff',
        })
        chair_color_line = env['product.template.attribute.line'].create({
            'product_tmpl_id': cls.configurable_chair.id,
            'attribute_id': cls.chair_color_attribute.id,
            'value_ids': [(6, 0, [cls.chair_color_red.id, chair_color_blue.id])]
        })
        chair_color_line.product_template_value_ids[0].price_extra = 1

        chair_legs_attribute = env['product.attribute'].create({
            'name': 'Chair Legs',
            'display_type': 'select',
            'create_variant': 'no_variant',
        })
        chair_legs_metal = env['product.attribute.value'].create({
            'name': 'Metal',
            'attribute_id': chair_legs_attribute.id,
        })
        chair_legs_wood = env['product.attribute.value'].create({
            'name': 'Wood',
            'attribute_id': chair_legs_attribute.id,
        })
        env['product.template.attribute.line'].create({
            'product_tmpl_id': cls.configurable_chair.id,
            'attribute_id': chair_legs_attribute.id,
            'value_ids': [(6, 0, [chair_legs_metal.id, chair_legs_wood.id])]
        })

        cls.chair_fabrics_attribute = env['product.attribute'].create({
            'name': 'Fabrics',
            'display_type': 'radio',
            'create_variant': 'no_variant',
        })
        chair_fabrics_leather = env['product.attribute.value'].create({
            'name': 'Leather',
            'attribute_id': cls.chair_fabrics_attribute.id,
        })
        cls.chair_fabrics_wool = env['product.attribute.value'].create({
            'name': 'wool',
            'attribute_id': cls.chair_fabrics_attribute.id,
        })
        cls.chair_fabrics_other = env['product.attribute.value'].create({
            'name': 'Other',
            'attribute_id': cls.chair_fabrics_attribute.id,
            'is_custom': True,
        })
        env['product.template.attribute.line'].create({
            'product_tmpl_id': cls.configurable_chair.id,
            'attribute_id': cls.chair_fabrics_attribute.id,
            'value_ids': [(6, 0, [chair_fabrics_leather.id, cls.chair_fabrics_wool.id, cls.chair_fabrics_other.id])]
        })
        chair_color_line.product_template_value_ids[1].is_custom = True

        cls.chair_addons_attribute = env['product.attribute'].create({
            'name': 'Add-ons',
            'display_type': 'multi',
            'create_variant': 'no_variant',
        })
        cls.chair_addon_cushion = env['product.attribute.value'].create({
            'name': 'Cushion',
            'attribute_id': cls.chair_addons_attribute.id,
        })
        cls.chair_addon_cupholder = env['product.attribute.value'].create({
            'name': 'Cup Holder',
            'attribute_id': cls.chair_addons_attribute.id,
        })
        cls.chair_addon_headrest = env['product.attribute.value'].create({
            'name': 'Headrest',
            'attribute_id': cls.chair_addons_attribute.id,
        })
        env['product.template.attribute.line'].create({
            'product_tmpl_id': cls.configurable_chair.id,
            'attribute_id': cls.chair_addons_attribute.id,
            'value_ids': [(6, 0, [cls.chair_addon_cushion.id, cls.chair_addon_cupholder.id, cls.chair_addon_headrest.id])]
        })

        fixed_pricelist = env['product.pricelist'].create({
            'name': 'Fixed',
            'item_ids': [(0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 1,
            }), (0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 2,
                'applied_on': '0_product_variant',
                'product_id': cls.wall_shelf.product_variant_id.id,
            }), (0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 13.95,  # test for issues like in 7f260ab517ebde634fc274e928eb062463f0d88f
                'applied_on': '0_product_variant',
                'product_id': cls.small_shelf.product_variant_id.id,
            })],
        })

        env['product.pricelist'].create({
            'name': 'Percentage',
            'item_ids': [(0, 0, {
                'compute_price': 'discount',
                'price_discount': 100,
                'applied_on': '0_product_variant',
                'product_id': cls.wall_shelf.product_variant_id.id,
            }), (0, 0, {
                'compute_price': 'discount',
                'price_discount': 99,
                'applied_on': '0_product_variant',
                'product_id': cls.small_shelf.product_variant_id.id,
            }), (0, 0, {
                'compute_price': 'discount',
                'price_discount': 0,
                'applied_on': '0_product_variant',
                'product_id': cls.magnetic_board.product_variant_id.id,
            })],
        })

        env['product.pricelist'].create({
            'name': 'Formula',
            'item_ids': [(0, 0, {
                'compute_price': 'discount',
                'price_discount': 6,
                'price_surcharge': 5,
                'applied_on': '0_product_variant',
                'product_id': cls.wall_shelf.product_variant_id.id,
            }), (0, 0, {
                # .99 prices
                'compute_price': 'discount',
                'price_surcharge': -0.01,
                'price_round': 1,
                'applied_on': '0_product_variant',
                'product_id': cls.small_shelf.product_variant_id.id,
            }), (0, 0, {
                'compute_price': 'discount',
                'price_min_margin': 10,
                'price_max_margin': 100,
                'applied_on': '0_product_variant',
                'product_id': cls.magnetic_board.product_variant_id.id,
            }), (0, 0, {
                'compute_price': 'discount',
                'price_surcharge': 10,
                'price_max_margin': 5,
                'applied_on': '0_product_variant',
                'product_id': cls.monitor_stand.product_variant_id.id,
            }), (0, 0, {
                'compute_price': 'discount',
                'price_discount': -100,
                'price_min_margin': 5,
                'price_max_margin': 20,
                'applied_on': '0_product_variant',
                'product_id': cls.desk_pad.product_variant_id.id,
            })],
        })

        env['product.pricelist'].create({
            'name': 'min_quantity ordering',
            'item_ids': [(0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 1,
                'applied_on': '0_product_variant',
                'min_quantity': 2,
                'product_id': cls.wall_shelf.product_variant_id.id,
            }), (0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 2,
                'applied_on': '0_product_variant',
                'min_quantity': 1,
                'product_id': cls.wall_shelf.product_variant_id.id,
            }), (0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 1,
                'applied_on': '0_product_variant',
                'min_quantity': 5,
                'product_id': cls.monitor_stand.product_variant_id.id,
            })],
        })

        env['product.pricelist'].create({
            'name': 'Product template',
            'item_ids': [(0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 1,
                'applied_on': '1_product',
                'product_tmpl_id': cls.wall_shelf.id,
            }), (0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 2,
            })],
        })

        product_category_3 = env['product.category'].create({
            'name': 'Services',
            'parent_id': env.ref('product.product_category_services').id,
        })

        env['product.pricelist'].create({
            # no category has precedence over category
            'name': 'Category vs no category',
            'item_ids': [(0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 1,
                'applied_on': '2_product_category',
                'categ_id': product_category_3.id,
            }), (0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 2,
            })],
        })

        env['product.pricelist'].create({
            'name': 'Category',
            'item_ids': [(0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 2,
                'applied_on': '2_product_category',
                'categ_id': env.ref('product.product_category_services').id,
            }), (0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 1,
                'applied_on': '2_product_category',
                'categ_id': product_category_3.id,
            })],
        })

        today = date.today()
        one_week_ago = today - timedelta(weeks=1)
        two_weeks_ago = today - timedelta(weeks=2)
        one_week_from_now = today + timedelta(weeks=1)
        two_weeks_from_now = today + timedelta(weeks=2)

        public_pricelist = env['product.pricelist'].create({
            'name': 'Public Pricelist',
        })

        env['product.pricelist'].create({
            'name': 'Dates',
            'item_ids': [(0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 1,
                'date_start': two_weeks_ago.strftime(DEFAULT_SERVER_DATE_FORMAT),
                'date_end': one_week_ago.strftime(DEFAULT_SERVER_DATE_FORMAT),
            }), (0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 2,
                'date_start': today.strftime(DEFAULT_SERVER_DATE_FORMAT),
                'date_end': one_week_from_now.strftime(DEFAULT_SERVER_DATE_FORMAT),
            }), (0, 0, {
                'compute_price': 'fixed',
                'fixed_price': 3,
                'date_start': one_week_from_now.strftime(DEFAULT_SERVER_DATE_FORMAT),
                'date_end': two_weeks_from_now.strftime(DEFAULT_SERVER_DATE_FORMAT),
            })],
        })

        cost_base_pricelist = env['product.pricelist'].create({
            'name': 'Cost base',
            'item_ids': [(0, 0, {
                'base': 'standard_price',
                'compute_price': 'discount',
                'price_discount': 55,
            })],
        })

        pricelist_base_pricelist = env['product.pricelist'].create({
            'name': 'Pricelist base',
            'item_ids': [(0, 0, {
                'base': 'pricelist',
                'base_pricelist_id': cost_base_pricelist.id,
                'compute_price': 'discount',
                'price_discount': 15,
            })],
        })

        env['product.pricelist'].create({
            'name': 'Pricelist base 2',
            'item_ids': [(0, 0, {
                'base': 'pricelist',
                'base_pricelist_id': pricelist_base_pricelist.id,
                'compute_price': 'discount',
                'price_discount': 3,
            })],
        })

        env['product.pricelist'].create({
            'name': 'Pricelist base rounding',
            'item_ids': [(0, 0, {
                'base': 'pricelist',
                'base_pricelist_id': fixed_pricelist.id,
                'compute_price': 'discount',
                'price_discount': 0.01,
            })],
        })

        excluded_pricelist = env['product.pricelist'].create({
            'name': 'Not loaded'
        })
        res_partner_18 = env['res.partner'].create({
            'name': 'Lumber Inc',
        })
        res_partner_18.property_product_pricelist = excluded_pricelist

        test_sale_journal = journal_obj.create({'name': 'Sales Journal - Test',
                                                'code': 'TSJ',
                                                'type': 'sale',
                                                'company_id': main_company.id})

        all_pricelists = env['product.pricelist'].search([
            ('id', '!=', excluded_pricelist.id),
            '|', ('company_id', '=', main_company.id), ('company_id', '=', False)
        ])
        all_pricelists.write(dict(currency_id=main_company.currency_id.id))

        FP_POS_2M = env['account.fiscal.position'].create({
            'name': "FP-POS-2M",
        })

        src_tax = env['account.tax'].create({
            'name': "SRC",
            'amount': 10,
            'fiscal_position_ids': main_company.domestic_fiscal_position_id,
        })
        env['account.tax'].create({'name': "DST", 'amount': 5, 'fiscal_position_ids': [Command.link(FP_POS_2M.id)], 'original_tax_ids': [Command.link(src_tax.id)]})
        env['account.tax'].create({'name': "DST2", 'amount': 10, 'fiscal_position_ids': [Command.link(FP_POS_2M.id)], 'original_tax_ids': [Command.link(src_tax.id)]})

        cls.letter_tray.taxes_id = [(6, 0, [src_tax.id])]

        cash_pm = cls.main_pos_config._get_cash_payment_method() or env['pos.payment.method'].create({
            'name': 'Cash',
            'type': 'cash',
            'journal_id': cash_journal.id,
            'receivable_account_id': cls.account_receivable.id,
        })
        cls.main_pos_config.write({
            'tax_regime_selection': True,
            'fiscal_position_ids': FP_POS_2M,
            'journal_id': test_sale_journal.id,
            'payment_method_ids': [(4, cash_pm.id)],
            'use_pricelist': True,
            'pricelist_id': public_pricelist.id,
            'available_pricelist_ids': [(4, pricelist.id) for pricelist in all_pricelists],
        })

        cls.printer = cls.env['pos.printer'].create({
            'name': 'Printer',
            'printer_type': 'epson_epos',
            'printer_ip': '0.0.0.0',
            'use_type': 'receipt',
        })

        # Set customers
        # Remove payroll data partners that interfere with the customer tours.
        cls.env['res.partner'].browse(
            partner.id
            for xmlid in [
                "l10n_us_hr_payroll.res_partner_taxation_va",
                "l10n_us_hr_payroll.res_partner_revenue_dc",
                "l10n_us_hr_payroll.res_partner_pfl_dc",
                "l10n_us_hr_payroll.res_partner_revenue_or",
                "l10n_us_hr_payroll.res_partner_dcbs_or",
                "l10n_us_hr_payroll.res_partner_employment_or",
                "l10n_us_hr_payroll.res_partner_revenue_nc",
                "l10n_us_hr_payroll.res_partner_state_tax_commission_id",
                "l10n_us_hr_payroll.res_partner_department_taxes_vt",
                "l10n_us_hr_payroll.res_partner_department_revenue_il",
                "l10n_us_hr_payroll.res_partner_department_revenue_az",
            ]
            if (partner := cls.env.ref(xmlid, raise_if_not_found=False)) is not None
        ).unlink()

        partners = cls.env['res.partner'].create([
            {'name': 'Partner Test 1'},
            {'name': 'Partner Test 2'},
            {'name': 'Partner Test 3'},
            {
                'name': 'APartner Full',
                'email': 'partner.full@example.com',
                'street': '77 Santa Barbara Rd',
                'city': 'Pleasant Hill',
                'state_id': cls.env.ref('base.state_us_5').id,
                'zip': '94523',
                'country_id': cls.env.ref('base.us').id,
            }
        ])
        cls.partner_test_1 = partners[0]
        cls.partner_test_2 = partners[1]
        cls.partner_test_3 = partners[2]
        cls.partner_full = partners[3]

        # Change the default sale pricelist of customers,
        # so the js tests can expect deterministically this pricelist when selecting a customer.
        # bad hack only for test
        env['ir.default'].set("res.partner", "specific_property_product_pricelist", public_pricelist.id, company_id=main_company.id)


@tagged('post_install', '-at_install')
class TestUi(TestPointOfSaleHttpCommon):
    _test_user_groups = None  # FIXME list needed groups











        # In the future we might want to test also if:
        #   - the combo lines are correctly stored in and restored from local storage
        #   - the combo lines are correctly shared between the pos configs ( in cross ordering )













    def test_customer_display_as_public(self):
        self.main_pos_config.customer_display_bg_img = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC'
        response = self.url_open(f"/web/image/pos.config/{self.main_pos_config.id}/customer_display_bg_img")
        self.assertEqual(response.status_code, 200)
        self.assertTrue('Shop.png' in response.headers['Content-Disposition'])





















    def test_available_children_categories(self):
        parent_categ = self.env['pos.category'].create({
            'name': 'Parent Category',
        })
        children_categs = self.env['pos.category'].create([{
            'name': 'Child Category 1',
            'parent_id': parent_categ.id,
        }, {
            'name': 'Child Category 2',
            'parent_id': parent_categ.id,
        }])
        self.env['product.product'].create([{
            'name': 'parent product',
            'pos_categ_ids': [(6, 0, [parent_categ.id])],
            'available_in_pos': True,
        }, {
            'name': 'child product 1',
            'pos_categ_ids': [(6, 0, [parent_categ.id, children_categs[0].id])],
            'available_in_pos': True,
        }, {
            'name': 'child product 2',
            'pos_categ_ids': [(6, 0, [parent_categ.id, children_categs[1].id])],
            'available_in_pos': True,
        }])
        self.main_pos_config.write({
            'limit_categories': True,
            'iface_available_categ_ids': [(6, 0, [parent_categ.id, children_categs[1].id])],
        })
        self.main_pos_config.open_ui()
        loaded_data = self.main_pos_config.current_session_id.load_data({'only_records': True})
        category_id = [category['id'] for category in loaded_data['pos.category']]
        self.assertNotIn(children_categs[0].id, category_id, "Child category is unavailable and shouldn't appear in the POS")
        self.assertIn(children_categs[1].id, category_id, "Child category is available and should appear in the POS")

    def test_available_product_uom_ids(self):
        # Making sure that all of the non-special products that are included in the `load_data` are the ones created in this method.
        self.env['product.template'].search([]).write({'is_favorite': False})

        self.env['ir.config_parameter'].sudo().set_str('point_of_sale.limited_product_count', '2')
        uom = self.env['uom.uom'].create({
            'name': 'Random UOM',
            'relative_uom_id': self.env.ref('uom.product_uom_unit').id,
        })
        product_one, product_two, product_three = self.env['product.product'].create([{
            'name': "product_one",
            'available_in_pos': True,
            'is_favorite': True,
        },
        {
            'name': "product_two",
            'available_in_pos': True,
            'is_favorite': True,
        },
        {
            'name': "product_three",
            'available_in_pos': True,
        }])

        _, _, product_uom_three = self.env['product.uom'].create([{
            'barcode': "product_one_barcode",
            'uom_id': uom.id,
            'product_id': product_one.id,
        },
        {
            'barcode': "product_two_barcode",
            'uom_id': uom.id,
            'product_id': product_two.id,
        },
        {
            'barcode': "product_three_barcode",
            'uom_id': uom.id,
            'product_id': product_three.id,
        },
        ])

        self.env['product.template'].flush_model()
        self.main_pos_config.open_ui()
        loaded_data = self.main_pos_config.current_session_id.load_data({'only_records': True})
        loaded_product_uoms = [loaded_product_uom['id'] for loaded_product_uom in loaded_data['product.uom']]

        self.assertNotIn(product_uom_three.id, loaded_product_uoms, f"Product UOM {product_uom_three} shouldn't be loaded as its product {product_three} is not included in the results")






















# This class just runs the same tests as above but with mobile emulation
class MobileTestUi(TestUi):
    _test_user_groups = None  # FIXME list needed groups

    browser_size = '375x667'
    touch_enabled = True
    allow_inherited_tests_method = True


class TestTaxCommonPOS(TestPointOfSaleHttpCommon, TestTaxCommon):
    _test_user_groups = None  # FIXME list needed groups

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.partner_a.name = "AAAAAA"  # The POS only load the first 100 partners

    def create_base_line_product(self, base_line, **kwargs):
        return self.env['product.product'].create({
            **kwargs,
            'available_in_pos': True,
            'list_price': base_line['price_unit'],
            'taxes_id': [Command.set(base_line['tax_ids'].ids)],
            'pos_categ_ids': [Command.set(self.pos_desk_misc_test.ids)],
            'company_id': self.env.company.id,
        })

    def ensure_products_on_document(self, document, product_prefix):
        for i, base_line in enumerate(document['lines'], start=1):
            base_line['product_id'] = self.create_base_line_product(base_line, name=f'{product_prefix}_{i}')

    def assert_pos_order_totals(self, order, expected_values):
        expected_amounts = {}
        if 'tax_amount_currency' in expected_values:
            expected_amounts['amount_tax'] = expected_values['tax_amount_currency']
        if 'total_amount_currency' in expected_values:
            expected_amounts['amount_total'] = expected_values['total_amount_currency']
        self.assertRecordValues(order, [expected_amounts])

    def _close_pos_session(self):
        session = self.main_pos_config.current_session_id
        if session and session.state != 'closed':
            draft_orders = session.order_ids.filtered(lambda o: o.state == 'draft')
            if draft_orders:
                draft_orders.action_pos_order_cancel()
            cash_pm = self.main_pos_config._get_cash_payment_method()
            session.close_session_from_ui({
                cash_pm.id: 0,
            })

    def assert_pos_orders_and_invoices(self, tour, tests_with_orders):
        if self.main_pos_config.current_session_id:
            cash_pm = self.main_pos_config._get_cash_payment_method()
            self.main_pos_config.current_session_id.close_session_from_ui({
                cash_pm.id: 0,
            })

        self.start_pos_tour(tour)
        orders = self.env['pos.order'].search([('session_id', '=', self.main_pos_config.current_session_id.id)], limit=len(tests_with_orders))
        for index, (order, (test_code, _document, _soft_checking, _amount_type, _amount, expected_values)) in enumerate(zip(orders, tests_with_orders)):
            with self.subTest(test_code=test_code, index=index):
                self.assert_pos_order_totals(order, expected_values)
                if order.account_move:
                    self.assert_invoice_totals(order.account_move, expected_values)

        self._close_pos_session()
