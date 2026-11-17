# Part of WETH. See LICENSE file for full copyright and licensing details

from weth import Command
from weth.tests import tagged

from weth.addons.point_of_sale.tests.test_frontend import TestPointOfSaleHttpCommon


@tagged('post_install', '-at_install')
class TestPOSLoyaltyHistory(TestPointOfSaleHttpCommon):

    _test_user_groups = None  # FIXME list needed groups


    def test_duplicate_coupon_confirm(self):
        """ Test that duplicate coupon confirm calls do not affect the coupon."""
        test_partner = self.env['res.partner'].create({'name': 'Test Partner'})
        ewallet_program = self.env['loyalty.program'].create({
            'name': 'eWallet Program',
            'program_type': 'ewallet',
            'trigger': 'auto',
            'applies_on': 'future',
            'reward_ids': [Command.create({
                'reward_type': 'discount',
                'discount_mode': 'per_point',
                'discount': 1,
            })],
            'rule_ids': [Command.create({
                'reward_point_amount': '1',
                'reward_point_mode': 'money',
                'product_ids': self.env.ref('loyalty.ewallet_product_50'),
            })],
            'trigger_product_ids': self.env.ref('loyalty.ewallet_product_50'),
        })

        self.main_pos_config.open_ui()
        ewallet_product = self.env.ref('loyalty.ewallet_product_50')

        def check_coupon(points, history_count):
            created_card = self.env['loyalty.card'].search([('program_id', '=', ewallet_program.id), ('partner_id', '=', test_partner.id)])
            self.assertEqual(created_card.points, points, "The coupon should have %s points, got %s." % (points, created_card.points))
            self.assertEqual(len(created_card.history_ids), history_count, "The history should have %s entrie(s), got %s." % (history_count, len(created_card.history_ids)))

        card_id = self.env['loyalty.card']._get_or_create_pos_card(
            ewallet_program, test_partner.id,
        ).id
        pos_order = self.env['pos.order'].create({
            'config_id': self.main_pos_config.id,
            'session_id': self.main_pos_config.current_session_id.id,
            'partner_id': test_partner.id,
            'lines': [Command.create({
                'product_id': ewallet_product.id,
                'price_unit': 50,
                'qty': 1,
                'price_subtotal': 50.0,
                'price_subtotal_incl': 50.0,
                'card_id': card_id,
            })],
            'amount_paid': 50,
            'amount_return': 0,
            'amount_tax': 0,
            'amount_total': 50,
        })
        pos_order._process_loyalty()

        check_coupon(50, 1)
        # Re-processing the same order must not credit the card again.
        pos_order._process_loyalty()
        check_coupon(50, 1)

        # Spend 10 points: a reward line references the eWallet card and _process_loyalty
        # debits its points_cost.
        reward = ewallet_program.reward_ids[:1]
        new_pos_order = self.env['pos.order'].create({
            'config_id': self.main_pos_config.id,
            'session_id': self.main_pos_config.current_session_id.id,
            'partner_id': test_partner.id,
            'lines': [Command.create({
                'product_id': reward.discount_line_product_id.id,
                'price_unit': -10,
                'qty': 1,
                'price_subtotal': -10.0,
                'price_subtotal_incl': -10.0,
                'is_reward_line': True,
                'reward_id': reward.id,
                'card_id': card_id,
                'points_cost': 10,
            })],
            'amount_paid': 0,
            'amount_return': 0,
            'amount_tax': 0,
            'amount_total': 0,
        })
        new_pos_order._process_loyalty()
        # Check that the coupon points are reduced correctly
        check_coupon(40, 2)
        # Re-processing the same order must not debit the card again.
        new_pos_order._process_loyalty()
        check_coupon(40, 2)

    def test_programs_loaded(self):
        eur_currency = self.setup_other_currency('EUR')
        usd_loyalty = self.env['loyalty.program'].create({'name': "USD program"})
        eur_loyalty = self.env['loyalty.program'].create({'name': "EUR program", 'currency_id': eur_currency.id})
        loaded_programs = self.main_pos_config._get_program_ids()
        self.assertIn(usd_loyalty, loaded_programs)
        self.assertNotIn(eur_loyalty, loaded_programs)


    def test_gift_card_partner(self):
        """ Test that the gift card's partner is correctly set as the customer who bought it."""
        test_partner = self.env['res.partner'].create({'name': 'Test Partner'})
        LoyaltyProgram = self.env['loyalty.program']
        self.env.ref('loyalty.gift_card_product_50').write({'active': True})
        gift_card_program = LoyaltyProgram.browse(
            LoyaltyProgram.create_from_template('gift_card')['res_id']
        )
        gift_card_program.pos_report_print_id = self.env.ref('loyalty.report_gift_card')
        self.main_pos_config.open_ui()
        self.env['loyalty.card']._get_or_create_pos_card(
            gift_card_program, test_partner.id, 'test-code',
        )
        loyalty_card = self.env['loyalty.card'].search([('code', '=', 'test-code')])
        self.assertEqual(loyalty_card.partner_id, test_partner)
