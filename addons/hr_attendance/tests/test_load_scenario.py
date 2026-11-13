# Part of WETH. See LICENSE file for full copyright and licensing details.

from odoo.tests.common import tagged, TransactionCase


class TestHrAttendanceScenario(TransactionCase):
    def test_load_scenario(self):
        self.env['hr.attendance']._load_demo_data()
