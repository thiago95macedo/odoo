import logging
import optparse
import sys

import weth.modules.neutralize
import weth.sql_db
import weth.tools.config

from . import Command

_logger = logging.getLogger(__name__)


class Neutralize(Command):
    """Neutralize a production database for testing: no emails sent, etc."""

    def run(self, args):
        parser = weth.tools.config.parser
        parser.prog = self.prog
        group = optparse.OptionGroup(parser, "Neutralize", "Neutralize the database specified by the `-d` argument.")
        group.add_option("--stdout", action="store_true", dest="to_stdout",
                         help="Output the neutralization SQL instead of applying it")
        parser.add_option_group(group)
        opt = weth.tools.config.parse_config(args, setup_logging=True)

        dbnames = weth.tools.config['db_name']
        if not dbnames:
            _logger.error('Neutralize command needs a database name. Use "-d" argument')
            sys.exit(1)
        if len(dbnames) > 1:
            sys.exit("-d/--database/db_name has multiple database, please provide a single one")
        dbname = dbnames[0]

        if not opt.to_stdout:
            _logger.info("Starting %s database neutralization", dbname)

        try:
            with weth.sql_db.db_connect(dbname).cursor() as cursor:
                if opt.to_stdout:
                    installed_modules = weth.modules.neutralize.get_installed_modules(cursor)
                    queries = weth.modules.neutralize.get_neutralization_queries(installed_modules)
                    # pylint: disable=bad-builtin
                    print('BEGIN;')
                    for query in queries:
                        # pylint: disable=bad-builtin
                        print(query.rstrip(";") + ";")
                    # pylint: disable=bad-builtin
                    print("COMMIT;")
                else:
                    weth.modules.neutralize.neutralize_database(cursor)

        except Exception:
            _logger.critical("An error occurred during the neutralization. THE DATABASE IS NOT NEUTRALIZED!")
            sys.exit(1)
