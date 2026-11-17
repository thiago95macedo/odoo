# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import http
from weth.http import request
from weth.tools import file_open


class VoiceController(http.Controller):

    @http.route("/discuss/voice/worklet_processor", methods=["GET"], type="http", auth="public", readonly=True)
    def voice_worklet_processor(self):
        with file_open("mail/static/src/discuss/voice_message/worklets/processor.js", "rb") as f:
            data = f.read()
        return request.make_response(
            data,
            headers=[
                ("Content-Type", "application/javascript"),
            ],
        )
