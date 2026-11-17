from weth import Command
from weth.exceptions import AccessError
from weth.tests import tagged
from weth.tools import SQL
from weth.addons.auth_passkey.tests.test_passkey_demo import PasskeyTest


@tagged('post_install', '-at_install')
class PasskeyTestPortal(PasskeyTest):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        login = 'passkey_portal'
        self.portal_user = self.env['res.users'].create({
            'name': login,
            'login': login,
            'password': login,
            'group_ids': [Command.set([self.env.ref('base.group_portal').id])],
        })




    def test_portal_permissions(self):
        admin_passkey = self.env['auth.passkey.key'].search([('name', '=', 'test-yubikey-nano')])
        with self.assertRaises(AccessError):
            admin_passkey.with_user(self.portal_user).write({'name': 'test'})
