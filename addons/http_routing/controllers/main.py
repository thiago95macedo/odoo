# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import http
from weth.http import request
from weth.addons.web.controllers.home import Home
from weth.addons.web.controllers.session import Session
from weth.addons.web.controllers.webclient import WebClient


class Routing(Home):

    @http.route('/website/translations', type='http', auth="public", readonly=True, sitemap=False)
    def get_website_translations(self, hash=None, lang=None, mods=None):
        IrHttp = request.env['ir.http'].sudo()
        modules = IrHttp.get_translation_frontend_modules()
        if mods:
            modules += mods.split(',')
        return WebClient().translations(hash, mods=','.join(modules), lang=lang)


class SessionWebsite(Session):

    @http.route('/web/session/logout', website=True, multilang=False, sitemap=False)
    def logout(self, redirect='/weth'):
        return super().logout(redirect=redirect)
