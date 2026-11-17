# Part of WETH. See LICENSE file for full copyright and licensing details.

import weth.tests
from weth import http
from weth.addons.mail.tests.common import mail_new_test_user

from weth.addons.point_of_sale.models.pos_bus_mixin import PosBusMixin
from weth.addons.pos_self_order.tests.self_order_common_test import SelfOrderCommonTest
from weth.addons.pos_self_order.controllers.orders import PosSelfOrderController
from unittest.mock import patch
from datetime import datetime, timedelta


@weth.tests.tagged("post_install", "-at_install")
class TestSelfOrderMobile(SelfOrderCommonTest):

    def test_self_order_mobile_0_price_order(self):
        self.pos_config.write({
            'self_ordering_mode': 'mobile',
            'self_ordering_pay_after': 'each',
            'self_ordering_service_mode': 'table',
        })

        floor = self.env["restaurant.floor"].create({
            "name": 'Main Floor',
            "table_ids": [(0, 0, {
                "table_number": 1,
            }), (0, 0, {
                "table_number": 2,
            }), (0, 0, {
                "table_number": 3,
            })],
        })

        # Only set one floor to the pos_config, otherwise it can have two table with the same name
        # which will cause the test to fail
        self.pos_config.write({
            "floor_ids": [(6, 0, [floor.id])],
        })

        self.pos_config.with_user(self.pos_user).open_ui()
        self.pos_config.current_session_id.set_opening_control(0, "")

        # Zero priced order with a note
        order = self.process_self_order(
            [{'product': self.ketchup, 'qty': 1, 'price_unit': self.ketchup.lst_price}],
            general_customer_note='test',
            table=floor.table_ids[0],
        )

        self.assertEqual(order.general_customer_note, "test")









    def test_self_order_availability_toggle(self):
        """Verify that toggling self_order_available is correctly reflected in the data loaded for the self-order interface."""
        self.pos_config.write({
            'self_ordering_mode': 'mobile',
        })
        desk_organizer = self.env['product.template'].search([('name', '=', 'Desk Organizer')], limit=1)
        desk_organizer.write({'self_order_available': False})

        self.pos_config.with_user(self.pos_user).open_ui()

        result = self.env['product.template'].load_product_from_pos(self.pos_config.id, [('id', '=', desk_organizer.id)])
        product_data = result['product.template'][0]
        self.assertEqual(product_data['self_order_available'], desk_organizer.self_order_available)

    def test_self_order_availability_toggle_from_other_company(self):
        """Toggling self_order_available from another company notifies the open self-order configs."""
        self.pos_config.write({'self_ordering_mode': 'mobile'})
        self.pos_config.with_user(self.pos_user).open_ui()
        company_b = self.env['res.company'].create({'name': 'Company B'})
        self.pos_admin.write({
            'company_ids': [(4, company_b.id)],
            'group_ids': [(4, self.env.ref('product.group_product_manager').id)],
        })
        desk_organizer = self.desk_organizer.product_tmpl_id

        notifications = []

        def _notify(config, *args):
            notifications.append((config, args))

        with patch.object(PosBusMixin, '_notify', _notify):
            desk_organizer.with_user(self.pos_admin).with_context(
                allowed_company_ids=company_b.ids,
            ).write({'self_order_available': False})

        # The writer has no access at all to the config's company
        company_b_user = mail_new_test_user(
            self.env,
            groups="base.group_user,point_of_sale.group_pos_manager,product.group_product_manager",
            login="company_b_user",
            company_id=company_b.id,
            company_ids=[(6, 0, company_b.ids)],
        )
        with patch.object(PosBusMixin, '_notify', _notify):
            desk_organizer.with_user(company_b_user).write({'self_order_available': True})

        config_notifications = [args for config, args in notifications if config == self.pos_config]
        self.assertEqual(len(config_notifications), 2)
        for (event, payload), available in zip(config_notifications, [False, True]):
            self.assertEqual(event, 'PRODUCT_CHANGED')
            self.assertEqual([p['id'] for p in payload['product.template']], desk_organizer.ids)
            self.assertEqual(payload['product.template'][0]['self_order_available'], available)
