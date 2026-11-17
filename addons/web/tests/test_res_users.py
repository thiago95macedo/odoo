# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.fields import Command
from weth.tests import TransactionCase
from weth.addons.base.tests.common import HttpCaseWithUserDemo
from weth.tests.common import tagged


@tagged('at_install', '-post_install')  # LEGACY at_install
class TestResUsers(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.users = cls.env["res.users"].create([
            {'name': 'Jean', 'login': 'jean@mail.com', 'password': 'jean@mail.com'},
            {'name': 'Jean-Paul', 'login': 'jean-paul@mail.com', 'password': 'jean-paul@mail.com'},
            {'name': 'Jean-Jacques', 'login': 'jean-jacques@mail.com', 'password': 'jean-jacques@mail.com'},
            {'name': 'Georges', 'login': 'georges@mail.com', 'password': 'georges@mail.com'},
            {'name': 'Claude', 'login': 'claude@mail.com', 'password': 'claude@mail.com'},
            {'name': 'Pascal', 'login': 'pascal@mail.com', 'password': 'pascal@mail.com'},
        ])

    def test_name_search(self):
        """
        Test name search with self assign feature
        The self assign feature is present only when a limit is present,
        which is the case with the public name_search by default
        """
        ResUsers = self.env['res.users']
        jean = self.users[0]
        user_ids = [id_ for id_, __ in ResUsers.with_user(jean).name_search('')]
        self.assertEqual(jean.id, user_ids[0], "The current user, Jean, should be the first in the result.")
        user_ids = [id_ for id_, __ in ResUsers.with_user(jean).name_search('Claude')]
        self.assertNotIn(jean.id, user_ids, "The current user, Jean, should not be in the result because his name does not fit the condition.")
        pascal = self.users[-1]
        user_ids = [id_ for id_, __ in ResUsers.with_user(pascal).name_search('')]
        self.assertEqual(pascal.id, user_ids[0], "The current user, Pascal, should be the first in the result.")
        user_ids = [id_ for id_, __ in ResUsers.with_user(pascal).name_search('', limit=3)]
        self.assertEqual(pascal.id, user_ids[0], "The current user, Pascal, should be the first in the result.")
        self.assertEqual(len(user_ids), 3, "The number of results found should still respect the limit set.")
        jean_paul = self.users[1]
        user_ids = [id_ for id_, __ in ResUsers.with_user(jean_paul).name_search('Jean')]
        self.assertEqual(jean_paul.id, user_ids[0], "The current user, Jean-Paul, should be the first in the result")
        claude = self.users[4]
        user_ids = [id_ for id_, __ in ResUsers.with_user(claude).name_search('', limit=2)]
        self.assertEqual(claude.id, user_ids[0], "The current user, Claude, should be the first in the result.")
        self.assertNotEqual(claude.id, user_ids[1], "The current user, Claude, should not appear twice in the result")
        user_ids = [id_ for id_, __ in ResUsers.with_user(claude).name_search('', limit=5)]
        self.assertEqual(len(user_ids), len(set(user_ids)), "Some user(s), appear multiple times in the result")




@tagged('post_install', '-at_install')
class TestUserRoleGroupSync(HttpCaseWithUserDemo):
    """ Drives the real web client (not Form()/onchange()) to check that
    res.users' `role` <-> `group_ids` stay in sync in both directions:
    changing the "Role" radio must persist the regular-user marker group,
    and toggling a plain access-right group must be reflected back onto
    `role` (via _compute_role). This complements the pure-backend repro
    attempts in base/tests/test_res_users.py, which cannot catch a desync
    specific to the real widgets/dirty-tracking of the web client --
    Form()/onchange() always faithfully applies whatever the onchange
    returns, it doesn't simulate how the browser tracks/commits modified
    fields.

    debug mode is required in the URL: the "Extra Rights" section (groups
    without a privilege_id, where our test group lives) is only rendered
    when debug mode is active -- see ResUserGroupIdsField.setup() in
    res_user_group_ids_field.js (`this.debugMode.isActive() ? ... : ""`).
    """

    def setUp(self):
        super().setUp()
        self.extra_group = self.env['res.groups'].create({
            'name': 'Test Role Sync Extra Group',
        })
        # A 2nd company on the target user is the actual trigger condition
        # for the bug: UsersMultiCompany.new() only mutates group_ids when
        # company_count > 1 -- a single-company user never hits that code
        # path at all, so the tours below would pass identically with or
        # without the res_users.py fix unless the user has multiple
        # companies (matching the real-world report: Marc Demo has
        # company_count > 1).
        self.company2 = self.env['res.company'].create({'name': 'Role Sync Test Company 2'})
        self.test_user = self.env['res.users'].create({
            'name': 'Role Sync Test User',
            'login': 'role_sync_test_user',
            'group_ids': [Command.set(self.env.ref('base.group_user').ids)],
        })
        self.group_regular = self.env.ref('base.group_user_regular')
        # Give the user a 2nd company *without* going through write()/
        # create() (both have their own correct group_multi_company sync,
        # same idea as the new() override, so a plain write() here would
        # immediately self-correct group_ids and mask what we want to set
        # up: a user whose company_ids already say "multi-company" while
        # group_ids/role still say "light", matching Marc Demo's actual
        # starting state in the original bug report). This is exactly the
        # inconsistent starting state the bug needs to be observable.
        self.env.cr.execute(
            "INSERT INTO res_company_users_rel (cid, user_id) VALUES (%s, %s)",
            [self.company2.id, self.test_user.id],
        )
        self.test_user.invalidate_recordset()

    def _user_url(self):
        # Not /weth/res.users/<id>: with hr installed, that bare model URL
        # resolves to the *simplified* HR form (base.view_users_simple_form,
        # no Access Rights notebook, no role field) instead of the real
        # Settings > Users form (base.view_users_form) that
        # base.action_res_users explicitly uses -- going through the
        # action's own path is what makes the correct view get picked.
        return f"/weth/users/{self.test_user.id}?debug=1"

    def _assert_state(self, role, marker_expected, msg):
        self.test_user.invalidate_recordset()
        self.assertEqual(self.test_user.role, role, msg)
        if marker_expected:
            self.assertIn(self.group_regular, self.test_user.all_group_ids, msg)
        else:
            self.assertNotIn(self.group_regular, self.test_user.all_group_ids, msg)




