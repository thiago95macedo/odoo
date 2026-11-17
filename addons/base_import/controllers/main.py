# Part of WETH. See LICENSE file for full copyright and licensing details.

import json

from weth import http
from weth.http import request
from weth.tools import BinaryBytes


class ImportController(http.Controller):

    @http.route('/base_import/set_file', methods=['POST'])
    # pylint: disable=redefined-builtin
    def set_file(self, id, ufile, model=None):
        file = ufile
        written = request.env['base_import.import'].browse(int(id)).write({
            'file': BinaryBytes(file.read()),
            'file_name': file.filename,
            'file_type': file.content_type,
        })

        return json.dumps({'result': written})
