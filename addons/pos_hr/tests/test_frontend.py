# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import Command
from weth.tests import tagged, new_test_user, users
from weth.addons.point_of_sale.tests.test_frontend import TestPointOfSaleHttpCommon


class TestPosHrHttpCommon(TestPointOfSaleHttpCommon):
    _test_user_groups = None  # FIXME list needed groups

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls.env.user.group_ids += cls.env.ref('hr.group_hr_user')
        cls.env.user.group_ids |= cls.env.ref('hr.group_hr_manager')
        payroll_user_group = cls.env.ref("hr_payroll.group_hr_payroll_user", raise_if_not_found=False)
        if payroll_user_group:
            cls.env.user.group_ids |= payroll_user_group

        # Admin employee
        cls.pos_admin.employee_id.name = "Mitchell Admin"
        cls.pos_admin.group_ids |= cls.env.ref('hr.group_hr_manager')
        cls.admin = cls.pos_admin.employee_id

        cls.main_pos_config.write({"module_pos_hr": True})

        # Managers
        cls.manager_user = new_test_user(
            cls.env,
            login="manager_user",
            groups="point_of_sale.group_pos_manager",
            name="Pos Manager",
            email="manager_user@pos.com",
        )
        cls.manager1 = cls.env['hr.employee'].create({
            'name': 'Test Manager 1',
            "company_id": cls.env.company.id,
            "user_id": cls.manager_user.id,
            "pin": "5651"
        })
        cls.manager2 = cls.env['hr.employee'].create({
            'name': 'Test Manager 2',
            "company_id": cls.env.company.id,
            "pin": "5652"
        })

        # User employee
        cls.emp1 = cls.env['hr.employee'].create({
            'name': 'Test Employee 1',
            "company_id": cls.env.company.id,
        })
        emp1_user = new_test_user(
            cls.env,
            login="emp1_user",
            groups="base.group_user, point_of_sale.group_pos_user, account.group_account_invoice",
            name="Pos Employee1",
            email="emp1_user@pos.com",
        )
        cls.emp1.write({"name": "Pos Employee1", "pin": "2580", "user_id": emp1_user.id})

        # Non-user employee
        cls.emp2 = cls.env['hr.employee'].create({
            'name': 'Test Employee 2',
            "company_id": cls.env.company.id,
        })
        cls.emp2.write({"name": "Pos Employee2", "pin": "1234"})
        (cls.admin + cls.emp1 + cls.emp2).company_id = cls.env.company

        cls.emp3 = cls.env['hr.employee'].create({
            'name': 'Test Employee 3',
            "user_id": cls.pos_user.id,
            "company_id": cls.env.company.id,
        })

        cls.emp4 = cls.env['hr.employee'].create({
            'name': 'Test Employee 4',
            "company_id": cls.env.company.id,
        })

        cls.main_pos_config.write({
            'cashier_employee_ids': [Command.link(cls.emp1.id), Command.link(cls.emp2.id), Command.link(cls.emp3.id)],
            'restrictive_employee_ids': [Command.link(cls.emp4.id)],
            'manager_employee_ids': [Command.link(cls.manager1.id), Command.link(cls.manager2.id)]
        })


@tagged("post_install", "-at_install")
class TestUi(TestPosHrHttpCommon):
    _test_user_groups = None  # FIXME list needed groups










    @users('pos_admin')
    def test_create_pos_config_without_hr_right(self):
        self.pos_admin.write({
                    'group_ids': [
                        (4, self.env.ref('product.group_product_manager').id),
                        (4, self.env.ref('account.group_account_manager').id),
                    ]
                })
        self.env['pos.config'].create({
            'name': 'My cute pos config',
            'module_pos_hr': True,
            'manager_employee_ids': [(6, 0, self.emp2.ids)]
        })





