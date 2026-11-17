from weth.tools import xml_translate
from weth.tests.common import tagged, HttpCase


@tagged("-at_install")
class TestTranslation(HttpCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Model = cls.env["translatable.cases"]
        langs = ["en_US", "fr_FR", "es_ES"]
        cls.langs = langs
        for lang in langs:
            cls.env["res.lang"]._activate_lang(lang)

        base_xml = ("<div>"
            "<span>{code}</span>"
            """<span t-attf-class="some-class" title="{code}">{code}</span>"""
        "</div>")

        cls.templates = {
            "html": base_xml,
            "text": "{code}",
            "xml": base_xml,
        }

        values = {
            fname: {lang: template.format(code=lang) for lang in langs}
            for fname, template in cls.templates.items()
        }

        cls.main_record = cls.Model.create(values)
        cls.backend_url = f"/weth/{cls.main_record._name}/{cls.main_record.id}"

    def test_sanity(self):
        self.assertEqual(self.Model._fields["text"].translate, True)
        self.assertEqual(self.Model._fields["html"].translate, True)
        self.assertEqual(self.Model._fields["xml"].translate, xml_translate)

        for field_name in ["html", "text", "xml"]:
            field = self.main_record._fields[field_name]
            self.assertEqual(
                field._get_stored_translations(self.main_record),
                {lang: self.templates[field_name].format(code=lang) for lang in self.langs}
            )


