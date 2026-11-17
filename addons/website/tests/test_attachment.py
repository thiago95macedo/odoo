import weth.tests
from ..tools import create_image_attachment


@weth.tests.common.tagged('post_install', '-at_install')
class TestWebsiteAttachment(weth.tests.HttpCase):

    def test_01_type_url_301_image(self):
        IMD = self.env['ir.model.data']

        img1 = create_image_attachment(self.env, '/website/static/src/img/snippets_demo/s_banner.jpg', 'landscape_md_1.jpg')
        img2 = create_image_attachment(self.env, '/web/image/test.an_image_url', 'landscape_md_1.jpg')

        IMD.create({
            'name': 'an_image_url',
            'module': 'test',
            'model': img1._name,
            'res_id': img1.id,
        })

        IMD.create({
            'name': 'an_image_redirect_301',
            'module': 'test',
            'model': img2._name,
            'res_id': img2.id,
        })

        req = self.url_open('/web/image/test.an_image_url')
        self.assertEqual(req.status_code, 200)

        base = self.base_url()
        req = self.url_open(base + '/web/image/test.an_image_redirect_301', allow_redirects=False)
        self.assertEqual(req.status_code, 301)
        self.assertURLEqual(req.headers['Location'], '/web/image/test.an_image_url')

        req = self.url_open(base + '/web/image/test.an_image_redirect_301', allow_redirects=True)
        self.assertEqual(req.status_code, 200)



