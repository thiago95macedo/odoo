from weth.addons.point_of_sale.tests.test_frontend import TestPointOfSaleHttpCommon
from weth.tests import Form, tagged
from weth.fields import Command


@tagged('post_install', '-at_install', 'post_install_l10n')
class TestGenericLocalization(TestPointOfSaleHttpCommon):
    _test_user_groups = None  # FIXME list needed groups

    allow_inherited_tests_method = True

    # Partner fields a localization needs in the POS "Edit/Create customer" form
    # (e.g. to invoice). Subclasses extend this with their mandatory l10n fields;
    # the test below materializes the actual view POS opens and asserts they are
    # present.
    _pos_partner_pos_form_fields = ['vat', 'additional_identifiers']

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.partner_a.name = "AAAA Generic Partner"
        cls.partner_a.vat = "32345678"
        cls.whiteboard_pen.sudo().write({
            'standard_price': 10.0,
            'taxes_id': [Command.link(cls.tax_sale_a.id)]
        })

        cls.wall_shelf.sudo().write({
            'standard_price': 10.0,
            'taxes_id': [Command.link(cls.tax_sale_a.id)]
        })


    def test_pos_partner_form_exposes_l10n_fields(self):
        """The POS "Edit/Create customer" view must render the localization's mandatory partner fields."""
        partner = self.env['res.partner']
        view_id = self.env.ref('point_of_sale.view_partner_form_pos_ui').id
        form = Form(partner, view=view_id)
        for field_name in self._pos_partner_pos_form_fields:
            self.assertIn(
                field_name, form._view['fields'],
                f"{field_name!r} is missing from the POS partner form for this "
                f"localization (view id {view_id}); POS can no longer capture it.",
            )
