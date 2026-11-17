from weth import fields, models
from weth.tools import html_translate, xml_translate


class TranslatableModel(models.Model):
    _name = "translatable.cases"
    _description = "Translatable Cases"

    text = fields.Text(translate=True)
    xml = fields.Text(translate=xml_translate)
    html = fields.Html(sanitize=False, translate=True)
    structured_html = fields.Html(sanitize=True, translate=html_translate)
