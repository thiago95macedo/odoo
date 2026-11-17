# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.addons.utm.tests.common import TestUTMCommon
from weth.exceptions import UserError
from weth.tests.common import tagged, users


@tagged('post_install', '-at_install', 'utm_consistency')
class TestUTMConsistencyHrRecruitment(TestUTMCommon):

    @users('__system__')
    def test_utm_consistency(self):
        # you are not supposed to delete the 'utm_campaign_job' record as it is hardcoded in
        # the creation of the alias of the recruitment source
        with self.assertRaises(UserError):
            self.env.ref('hr_recruitment.utm_campaign_job').unlink()
