from odoo import fields, models


class ResUsersSettings(models.Model):
    _inherit = "res.users.settings"

    main_menu_layout = fields.Json(
        string="Layout do Menu Principal",
        help="Armazena a disposição e ordenação customizada de seções e aplicativos do menu principal.",
    )

