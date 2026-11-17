# Part of WETH. See LICENSE file for full copyright and licensing details.

import weth.tests
from weth.addons.website.tools import create_image_attachment


@weth.tests.common.tagged('post_install', '-at_install')
class TestWebsiteGridLayout(weth.tests.HttpCase):

    def test_01_replace_grid_image(self):
        create_image_attachment(self.env, '/web/image/website.landscape_md_1', 'landscape_md_1.jpg')
        create_image_attachment(self.env, '/web/image/website.landscape_md_1', 's_banner_default_image2.webp')
        self.start_tour(self.env['website'].get_client_action_url('/', True), 'website_replace_grid_image', login="admin")
