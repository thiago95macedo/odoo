# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import _
from weth.http import request
from weth.addons.im_livechat.controllers.main import LivechatController


class WebsiteLivechat(LivechatController):

    def _get_guest_name(self):
        visitor_sudo = request.env["ir.http"]._get_visitor_from_request()
        return _('Visitor #%d', visitor_sudo.id) if visitor_sudo else super()._get_guest_name()
