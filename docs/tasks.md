# Memória Operacional e Registro de Tarefas — WETH Odoo 20

Este arquivo mantém o histórico e o status das atividades de infraestrutura e desenvolvimento do projeto.

---

## 1. Atividades Realizadas

- [x] **Diagnóstico Inicial do Repositório Odoo 20:**
  - Identificação de SO, ambiente Docker WETH, portas e storage.
- [x] **Limpeza do Manifesto de Dependências:**
  - Remoção das dependências e flags de Windows do `requirements.txt`.
- [x] **Remoção de Legados Windows e Debian:**
  - Exclusão dos scripts e assets de empacotamento para Windows (`setup/win32`, `package.dfwine`).
  - Remoção de scripts e definições de empacotamento Debian (`setup/debinstall.sh`, `package.dfdebian`).
  - Limpeza de referências, argumentos e flags em `setup/package.py`, `setup/requirements-check.py`, `setup.py`, `setup.cfg`, `.gitignore` e `requirements.txt`.
  - Padronização do ambiente voltado estritamente para Ubuntu Server (Noble 24.04).
- [x] **Implementação do Orquestrador Central (.agents):**
  - Criação do ponto de entrada normativo `AGENTS.md` na raiz do projeto.
  - Links simbólicos para as 5 skills do Odoo (`odoo-git`, `odoo-guidelines`, `odoo-review`, `odoo-security`, `odoo-web-guidelines`) e `weth-agent-coordination`.
  - Regras de governança e arquitetura em `.agents/rules/`.
- [x] **Implantação do Ambiente de Desenvolvimento Docker:**
  - Configuração do `Dockerfile` (`weth/odoo:20.0`) com Ubuntu 24.04, Python 3.12 e venv.
  - Configuração do PostgreSQL 17 Alpine (`odoo-db`) na rede privada `odoo_backend_net`.
  - Integração do proxy reverso Caddy com a rede `weth_proxy_net` e emissão TLS para `https://odoo.test`.
  - Persistência dos dados em `/home/arcanus/Workspace/dados/odoo/` (banco e filestore).
  - Inicialização estritamente manual (`restart: "no"`) e zero portas de banco expostas no host.
  - Registro e validação no inventário canônico WETH (`infraestrutura/inventory/projects.yaml`).
  - Testes de conectividade HTTPS via Caddy com resposta HTTP 200/303 no domínio `https://odoo.test`.

---

## 2. Próximas Atividades (Desenvolvimento e Módulos WETH)

- [ ] Criação do banco de dados inicial da aplicação através de `https://odoo.test/web/database/manager`.
- [ ] Estruturação do diretório de addons customizados da WETH.
- [ ] Desenvolvimento de funcionalidades orquestradas pelas skills especializadas.
