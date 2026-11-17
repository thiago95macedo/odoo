# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth import fields, models


class ResCompany(models.Model):
    _inherit = 'res.company'

    attendance_work_entry_type_id = fields.Many2one(
        domain=[('requires_allocation', '=', False), ('count_as', '=', 'working_time')],
    )
