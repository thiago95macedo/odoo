# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.http import route

from weth.addons.mail.controllers.webclient import WebclientController


class WebClient(WebclientController):
    """Override to add CORS support."""

    @route("/im_livechat/cors/store", methods=["POST"], type="jsonrpc", auth="force_guest_optional", save_session=False, cors="*", readonly=lambda self, *_: self._is_mail_fetch_readonly())
    def livechat_store(self, guest_token="", **kwargs):
        return self.mail_store(**kwargs)
