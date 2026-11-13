# Part of WETH. See LICENSE file for full copyright and licensing details.

from odoo.tests.common import tagged, TransactionCase


class TestHrScenario(TransactionCase):

    def test_load_scenario(self):
        self.env['hr.employee']._load_scenario()
