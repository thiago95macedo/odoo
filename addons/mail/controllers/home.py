# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import http
from weth.addons.web.controllers.home import Home as WebHome
from weth.addons.mail.tools.discuss import add_guest_to_context


class Home(WebHome):

    @http.route()
    @add_guest_to_context
    def web_client(self, s_action=None, **kw):
        return super().web_client(s_action, **kw)
