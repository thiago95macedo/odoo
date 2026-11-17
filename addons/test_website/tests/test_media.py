# Part of WETH. See LICENSE file for full copyright and licensing details.

import weth.tests
from weth.tools import mute_logger


@weth.tests.common.tagged('post_install', '-at_install')
class TestMedia(weth.tests.HttpCase):

    @mute_logger('weth.addons.http_routing.models.ir_http', 'weth.http')
    def test_01_replace_media(self):
        SVG = b'<svg xmlns="http://www.w3.org/2000/svg"></svg>'
        self.env['ir.attachment'].create({
            'name': 'sample.svg',
            'public': True,
            'mimetype': 'image/svg+xml',
            'raw': SVG,
        })
        self.start_tour(self.env['website'].get_client_action_url("/", True), 'test_replace_media', login="admin")

    def test_02_image_link(self):
        self.start_tour(self.env['website'].get_client_action_url("/", True), 'test_image_link', login="admin")
