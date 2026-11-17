# Part of WETH. See LICENSE file for full copyright and licensing details.

from unittest.mock import patch

from weth import Command
from weth.tests import tagged

from weth.addons.point_of_sale.tests.test_frontend import TestPointOfSaleHttpCommon


@tagged('post_install', '-at_install')
class TestLoyaltyMirror(TestPointOfSaleHttpCommon):
    """Golden comparison of the mirrored rule computations: the frontend
    (loyalty_rule.js) and the backend (loyalty_rule.py) must agree on a plain
    sale order. Refund and topup orders are out of scope on purpose: the two
    sides diverge by design there (the frontend never scores them)."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.env['loyalty.program'].search([]).write({'active': False})

        mirror_tax = cls.env['account.tax'].create({
            'name': 'Mirror Tax 15%',
            'amount': 15,
            'amount_type': 'percent',
            'type_tax_use': 'sale',
        })
        cls.mirror_product_a = cls.env['product.template'].create({
            'name': 'Mirror Product A',
            'available_in_pos': True,
            'list_price': 100.0,
        })
        cls.mirror_product_b = cls.env['product.template'].create({
            'name': 'Mirror Product B',
            'available_in_pos': True,
            'list_price': 50.0,
            'taxes_id': [Command.set(mirror_tax.ids)],
        })

        programs = cls.env['loyalty.program']
        # Auto loyalty: money rule over any product (counts other programs'
        # reward lines) + unit rule restricted to a product domain.
        programs |= cls.env['loyalty.program'].create({
            'name': 'Mirror Auto Program',
            'program_type': 'loyalty',
            'trigger': 'auto',
            'applies_on': 'both',
            'rule_ids': [
                Command.create({
                    'reward_point_mode': 'money',
                    'reward_point_amount': 1,
                    'minimum_amount': 200,
                }),
                Command.create({
                    'product_ids': cls.mirror_product_a.product_variant_id.ids,
                    'reward_point_mode': 'unit',
                    'reward_point_amount': 5,
                    'minimum_qty': 2,
                }),
            ],
            'reward_ids': [Command.create({
                'reward_type': 'product',
                'reward_product_id': cls.mirror_product_a.product_variant_id.id,
                'reward_product_qty': 1,
                'required_points': 1000,  # never claimed in the tour
            })],
        })
        # Code-activated promotion: order-mode points, min amount tax included.
        programs |= cls.env['loyalty.program'].create({
            'name': 'Mirror Code Program',
            'program_type': 'promotion',
            'trigger': 'with_code',
            'applies_on': 'current',
            'rule_ids': [Command.create({
                'mode': 'with_code',
                'code': 'MIRROR10',
                'reward_point_mode': 'order',
                'reward_point_amount': 7,
                'minimum_amount': 60,
                'minimum_amount_tax_mode': 'incl',
            })],
            'reward_ids': [Command.create({
                'reward_type': 'discount',
                'discount': 10,
                'discount_mode': 'percent',
                'discount_applicability': 'order',
                'required_points': 1000,  # never claimed in the tour
            })],
        })
        # Code-activated promotion whose code is never entered: never fulfilled.
        programs |= cls.env['loyalty.program'].create({
            'name': 'Mirror Unused Code Program',
            'program_type': 'promotion',
            'trigger': 'with_code',
            'applies_on': 'current',
            'rule_ids': [Command.create({
                'mode': 'with_code',
                'code': 'NEVERUSED',
            })],
            'reward_ids': [Command.create({
                'reward_type': 'discount',
                'discount': 10,
                'discount_mode': 'percent',
                'discount_applicability': 'order',
            })],
        })
        # Auto promotion whose reward is actually applied: its discount line must
        # be counted in the money rule of the auto loyalty program.
        programs |= cls.env['loyalty.program'].create({
            'name': 'Mirror Discount Program',
            'program_type': 'promotion',
            'trigger': 'auto',
            'applies_on': 'current',
            'rule_ids': [Command.create({
                'reward_point_mode': 'money',
                'reward_point_amount': 1,
            })],
            'reward_ids': [Command.create({
                'reward_type': 'discount',
                'discount': 10,
                'discount_mode': 'percent',
                'discount_applicability': 'order',
                'required_points': 1,
            })],
        })
        programs.write({'pos_config_ids': [Command.link(cls.main_pos_config.id)]})



@tagged('post_install', '-at_install')
class TestLoyaltyMirrorRewardCost(TestPointOfSaleHttpCommon):
    """Golden comparison of the reward point-cost mirror: the frontend
    (loyalty_reward.js getRewardLines) and the backend (loyalty_reward.py
    _get_pos_points_cost) must agree on the points_cost of a claimed reward."""

    _test_user_groups = None  # FIXME list needed groups

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.env['loyalty.program'].search([]).write({'active': False})

        cls.mirror_cost_product = cls.env['product.template'].create({
            'name': 'Mirror Cost Product',
            'available_in_pos': True,
            'list_price': 50.0,
        })
        # A promotion (applies_on 'current') is non-nominative, so its single discount
        # reward auto-applies without a customer (nominative programs are excluded from
        # the auto-applied set, see pos_order.js appliedPrograms). unit-mode earning keeps
        # the point total independent of the discount, so the per-point cost is
        # deterministic (no earn/discount feedback loop).
        program = cls.env['loyalty.program'].create({
            'name': 'Mirror Cost Program',
            'program_type': 'promotion',
            'trigger': 'auto',
            'applies_on': 'current',
            'rule_ids': [Command.create({
                'reward_point_mode': 'unit',
                'reward_point_amount': 10,
                'minimum_qty': 1,
            })],
            'reward_ids': [Command.create({
                'reward_type': 'discount',
                'discount': 1,
                'discount_mode': 'per_point',
                'discount_applicability': 'order',
                'required_points': 10,
            })],
        })
        program.rule_ids.product_ids = [Command.set(cls.mirror_cost_product.product_variant_id.ids)]
        program.write({'pos_config_ids': [Command.link(cls.main_pos_config.id)]})

        cls.overspend_product = cls.env['product.template'].create({
            'name': 'Mirror Overspend Product',
            'available_in_pos': True,
            'list_price': 10.0,
            'taxes_id': [Command.set([])],
        })
        overspend_program = cls.env['loyalty.program'].create({
            'name': 'Mirror Overspend Program',
            'program_type': 'promotion',
            'trigger': 'auto',
            'applies_on': 'current',
            'rule_ids': [Command.create({
                'reward_point_mode': 'unit',
                'reward_point_amount': 100,
                'minimum_qty': 1,
                'product_ids': [Command.set(cls.overspend_product.product_variant_id.ids)],
            })],
            'reward_ids': [Command.create({
                'reward_type': 'discount',
                'discount': 1,
                'discount_mode': 'per_point',
                'discount_applicability': 'order',
                'required_points': 10,
            })],
        })
        overspend_program.write({'pos_config_ids': [Command.link(cls.main_pos_config.id)]})


    def test_loyalty_mirror_reward_cost(self):
        self._run_reward_cost_mirror("test_loyalty_mirror_reward_cost")

    def test_loyalty_mirror_reward_cost_overspend(self):
        data = self._run_reward_cost_mirror("test_loyalty_mirror_reward_cost_overspend")
        # 100 points are earned but only a 10-point ($10) discount fits the order, so the
        # reward must cost the applied reduction, not every affordable point.
        self.assertEqual(
            [round(cost, 2) for cost in data['backend'].values()],
            [10.0],
            "Capped per-point reward should cost the applied reduction, not the available points",
        )


@tagged('post_install', '-at_install')
class TestLoyaltyMirrorRefund(TestPointOfSaleHttpCommon):
    """Golden comparison of the refund-reversal mirror: the frontend
    (loyalty_program.js _getRefundReversalPoints) and the backend
    (pos_order.py _get_refund_reversal_points) must agree on how many points a
    refund order reverses for each program."""

    _test_user_groups = None  # FIXME list needed groups

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.env['loyalty.program'].search([]).write({'active': False})

        cls.mirror_refund_product = cls.env['product.template'].create({
            'name': 'Mirror Refund Product',
            'available_in_pos': True,
            'list_price': 100.0,
        })
        # Earns points on the sale; its reward is never claimed (required_points too high),
        # so the sale is a plain earning order and the refund reverses the earned points.
        program = cls.env['loyalty.program'].create({
            'name': 'Mirror Refund Program',
            'program_type': 'loyalty',
            'trigger': 'auto',
            'applies_on': 'both',
            'rule_ids': [Command.create({
                'reward_point_mode': 'money',
                'reward_point_amount': 1,
            })],
            'reward_ids': [Command.create({
                'reward_type': 'discount',
                'discount': 10,
                'discount_mode': 'percent',
                'discount_applicability': 'order',
                'required_points': 1000,  # never claimed in the tour
            })],
        })
        program.write({'pos_config_ids': [Command.link(cls.main_pos_config.id)]})

