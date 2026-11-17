# Part of WETH. See LICENSE file for full copyright and licensing details.
from weth import fields, models


class AccountBankStatementLine(models.Model):
    _inherit = 'account.bank.statement.line'

    pos_session_id = fields.Many2one(
        'pos.session',
        string="Session",
        copy=False,
        index='btree_not_null')
