# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.addons.web.controllers import webmanifest


class WebManifest(webmanifest.WebManifest):

    def _has_share_target(self):
        return True
