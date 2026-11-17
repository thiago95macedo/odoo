# Part of WETH. See LICENSE file for full copyright and licensing details.

from unittest.mock import patch

import weth
from weth import Command
from weth.tests import tagged
from weth.tests.common import HttpCase


@tagged('post_install', '-at_install')
class TestWebsiteResetPassword(HttpCase):


    def test_02_multi_user_login(self):
        # In case Specific User Account is activated on a website, the same login can be used for
        # several users. Make sure we can still log in if 2 users exist.
        self.env.ref('base.default_website').ensure_one()
        internal_group = self.env.ref('base.group_user')
        portal_group = self.env.ref('base.group_portal')

        # Use AAA and ZZZ as names since res.users are ordered by 'login, name'
        self.env["res.users"].create({
            "website_id": False, "login": "bobo@mail.com", "name": "AAA",
            "password": "bobo@mail.com", "group_ids": [
                Command.link(portal_group.id),
                Command.unlink(internal_group.id),
            ],
        })
        user2 = self.env["res.users"].create({
            "website_id": self.env.ref('base.default_website').id, "login": "bobo@mail.com", "name": "ZZZ",
            "password": "bobo@mail.com", "group_ids": [
                Command.link(portal_group.id),
                Command.unlink(internal_group.id),
            ],
        })

        # The most specific user should be selected
        self.authenticate("bobo@mail.com", "bobo@mail.com")
        self.assertEqual(self.session["uid"], user2.id)

    def test_multi_website_reset_password_user_specific_user_account(self):
        # Create same user on different websites with 'Specific User Account'
        # option enabled and then reset password. Only the user from the
        # current website should be reset.
        website_1, website_2 = self.env['website'].create([
            {'name': 'Website 1', 'specific_user_account': True},
            {'name': 'Website 2', 'specific_user_account': True},
        ])

        internal_group = self.env.ref('base.group_user')
        portal_group = self.env.ref('base.group_portal')
        login = 'user@example.com'  # same login for both users
        user_website_1, user_website_2 = self.env['res.users'].with_context(no_reset_password=True).create([
            {'website_id': website_1.id, 'login': login, 'email': login, 'name': login, "group_ids": [Command.link(portal_group.id), Command.unlink(internal_group.id)]},
            {'website_id': website_2.id, 'login': login, 'email': login, 'name': login, "group_ids": [Command.link(portal_group.id), Command.unlink(internal_group.id)]},
        ])

        self.assertFalse(user_website_1.signup_type)
        self.assertFalse(user_website_2.signup_type)

        self.env['res.users'].with_context(website_id=website_1.id).reset_password(login)

        self.assertTrue(user_website_1.signup_type)
        self.assertFalse(user_website_2.signup_type)
