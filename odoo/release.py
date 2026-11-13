# Part of Odoo. See LICENSE file for full copyright and licensing details.

RELEASE_LEVELS = [ALPHA, BETA, RELEASE_CANDIDATE, FINAL] = ['alpha', 'beta', 'candidate', 'final']
RELEASE_LEVELS_DISPLAY = {ALPHA: 'a',
                          BETA: 'b',
                          RELEASE_CANDIDATE: 'rc',
                          FINAL: ''}

# version_info format: (MAJOR, MINOR, MICRO, RELEASE_LEVEL, SERIAL)
# inspired by Python's own sys.version_info, in order to be
# properly comparable using normal operators, for example:
#  (6,1,0,'beta',0) < (6,1,0,'candidate',1) < (6,1,0,'candidate',2)
#  (6,1,0,'candidate',2) < (6,1,0,'final',0) < (6,1,2,'final',0)
# NOTE: during release, the MAJOR version can become an arbitrary string ('saas~xx')
version_info = (20, 0, 0, FINAL, 0, '')
series = serie = major_version = '.'.join(str(s) for s in version_info[:2])
version = series + RELEASE_LEVELS_DISPLAY[version_info[3]] + str(version_info[4] or '') + version_info[5]

product_name = 'WETH'
description = 'Servidor WETH'
long_desc = '''O WETH é uma plataforma integrada de gestão empresarial (ERP) e inteligência
corporativa (CRM) desenvolvida pela WETH Tecnologia. Projetada para transformar
operações complexas em fluxos ágeis e automatizados, integra finanças,
contabilidade analítica, cadeia de suprimentos, estoques, vendas, serviços e atendimento.
Sua arquitetura moderna combina alta performance, segurança robusta, relatórios
analíticos avançados e APIs flexíveis para impulsionar a inovação e o crescimento
estratégico dos negócios.
'''
classifiers = """Development Status :: 5 - Production/Stable
License :: OSI Approved :: GNU Lesser General Public License v3

Programming Language :: Python
"""
url = 'https://www.weth.com.br'
author = 'WETH Tecnologia'
author_email = 'contato@weth.com.br'
license = 'LGPL-3'

MIN_PY_VERSION = (3, 12)
MAX_PY_VERSION = (3, 14)
MIN_PG_VERSION = 16
