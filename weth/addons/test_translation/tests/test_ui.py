import weth.tests
from weth.tools import mute_logger


@weth.tests.tagged('-at_install', 'post_install')
class TestUiTranslation(weth.tests.HttpCase):

    @mute_logger('weth.sql_db', 'weth.http')
    def test_01_sql_constraints(self):
        # Raise an SQL constraint and test the message
        self.env['res.lang']._activate_lang('fr_FR')
        self.env.ref('base.module_test_translation')._update_translations(['fr_FR'])
        constraint = self.env.ref('test_translation.constraint_test_translation_constraint_positive_code')
        message = constraint.with_context(lang='fr_FR').message
        self.assertEqual(message, "Le code doit être une valeur positive !")
