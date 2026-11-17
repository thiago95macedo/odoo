from weth.tests.common import HttpCase, tagged


@tagged("-at_install", "post_install")
class TestStockWarehouseOrderpoint(HttpCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.product = cls.env['product.product'].create({
            'name': 'Book Shelf',
            'lst_price': 1750.00,
            'is_storable': True,
            'purchase_ok': True,
        })
        cls.res_partner_1 = cls.env['res.partner'].create({
            'name': 'Wood Corner',
        })
        cls.env['product.supplierinfo'].create([
            {
                'partner_id': cls.res_partner_1.id,
                'product_id': cls.product.id,
                'delay': 3,
                'min_qty': 1,
                'price': 750,
            }
        ])


    def test_default_buy_route_with_no_warehouse(self):
        route_domain = [
            ('warehouse_selectable', '=', True),
            ('rule_ids.action', '=', 'buy'),
            ('company_id', 'in', [False, self.env.company.id]),
        ]
        routes = self.env['stock.route'].search(route_domain)
        routes.warehouse_ids = False
        orderpoint = self.env['stock.warehouse.orderpoint'].create({'product_id': self.product.id})
        self.assertEqual(routes[0].name, orderpoint.route_id_placeholder)
