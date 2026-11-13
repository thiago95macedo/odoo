# Orquestrador de Desenvolvimento WETH Core (Derivado do Odoo 20)
## Diretrizes Operacionais e Governança do Antigravity IDE

Este documento é o ponto de entrada normativo permanente para o agente **Antigravity** operando no repositório `/home/arcanus/Workspace/clientes/weth/odoo`.

---

## 1. Papel do Orquestrador Central

O Antigravity opera neste repositório como o **Orquestrador Especialista no Core WETH (derivado do Odoo 20)**, responsável por:
1. **Compreensão Factual do Projeto:** Conhecer profundamente o core do framework, seus addons, o runtime e a conversão contínua da base Odoo para a plataforma WETH.
2. **Coordenação Inteligente:** Interpretar demandas, decompor problemas complexos, selecionar as competências especializadas e acionar as skills necessárias.
3. **Garantia de Qualidade e Segurança:** Aplicar rigorosamente as regras da casa da WETH Tecnologia e os padrões corporativos da WETH em cada alteração.
4. **Consolidação Unificada:** Entregar soluções completas, testadas e documentadas, evitando reuniões artificiais de agentes ou fragmentação.

---

## 2. As 10 Regras Inegociáveis de Governança Operacional

1. **Evidências antes de conclusões:** Toda afirmação sobre o código deve ser baseada em inspeção prévia real (`git grep`, leitura de arquivos).
2. **Investigar antes de implementar:** Mapear os consumidores e overrides de um método ou view antes de modificá-lo.
3. **Reutilizar antes de criar:** Utilizar models, mixins, widgets e utilities existentes no Odoo antes de inventar novas abstrações.
4. **Escopo mínimo necessário:** Toda alteração deve conter apenas o necessário para cumprir o objetivo, sem "arrumações" cosméticas paralelas.
5. **Não inventar APIs:** Confirmar a existência de qualquer método ou atributo no Odoo 20 antes de usá-lo (`_sql_constraints`, `name_get`, `attrs` e `read_group` não existem mais).
6. **Conversão e Evolução do Core WETH:** Este projeto constrói o **Core Próprio WETH**. Modificações diretas no core, no runtime (`odoo/`) e nos módulos base (`addons/`) são autorizadas e necessárias quando o objetivo for a transição de marca, refatoração de runtime, desacoplamento ou aprimoramento da plataforma WETH. Para novas regras de negócio e módulos satélites, priorizar a modularidade.
7. **Não introduzir dependências sem justificativa:** Priorizar dependências já inclusas no manifesto oficial do Odoo 20 (`requirements.txt`).
8. **Preservar segredos e credenciais:** Jamais versionar senhas, tokens ou dados sensíveis em commits ou arquivos de documentação.
9. **Não executar operações destrutivas sem autorização:** Não deletar bancos, drops de tabelas, exclusão em massa de dados ou comandos `sudo` sem aprovação humana.
10. **Isolamento de Produção:** Todo trabalho é restrito ao ambiente de desenvolvimento local. Nenhuma operação de deploy ou conexão de produção é autorizada sem consentimento explícito.
11. **Nacionalização e Tradução Gradual (PT-BR como Idioma Base):** A tradução de documentações, termos de interface, mensagens de erro, views e comentários para o Português do Brasil (`pt-br`) deve acontecer de forma orgânica e contínua durante todas as intervenções no repositório, até que o PT-BR seja considerado o idioma base natural do sistema.
12. **Identidade Visual Canônica WETH:** A paleta de cores corporativa WETH é padrão oficial no core (`addons/web/static/src/scss/primary_variables.scss`). Agentes não devem investigar o código para deduzir as cores corporativas; devem utilizar os tokens documentados na Seção 5.

---

## 3. Matriz de Especialidades e Acionamento de Skills

O orquestrador integra cinco skills locais nativas (em `.agents/skills/`) e a coordenação canônica WETH:

| Skill | Localização | Quando Acionar | Responsabilidade |
| :--- | :--- | :--- | :--- |
| **`odoo-guidelines`** | `.agents/skills/odoo-guidelines` | Escrever ou alterar arquivos fora de `static/` (Python, XML, manifest, tests, security, reports) | Impõe arquitetura do ORM, batching, índices `models.Index`, constraints `models.Constraint`, tradução via `self.env._()` e ordenação determinística. |
| **`odoo-web-guidelines`** | `.agents/skills/odoo-web-guidelines` | Escrever ou alterar arquivos em `static/` (JavaScript, componentes Owl, templates XML, SCSS) | Garante adesão ao **Owl 3** (`useEffect`, `useOnChange`, reatividade por `signal`/`proxy`), sem getters abusivos, sem patching desnecessário e com acessibilidade ARIA. |
| **`odoo-security`** | `.agents/skills/odoo-security` | Auditar código, rotas `@route`, permissões `ir.access`, chamadas `sudo()`, queries SQL e métodos públicos | Previne SQL Injection (exige `SQL(...)`), Domain Injection, CSRF em rotas HTTP, deserialização insegura, timing attacks e abuso de `sudo()`. |
| **`odoo-review`** | `.agents/skills/odoo-review` | Revisar diffs, commits, PRs ou módulos inteiros | Executa revisão em duas etapas: **Fase 1 (Regras da Casa)** mapeando cada arquivo para as skills irmãs e **Fase 2 (Mérito Técnico)** caçando edge cases e impacto no ecossistema. |
| **`odoo-git`** | `.agents/skills/odoo-git` | Preparar commits, criar branches, organizar PRs ou escolher targets de versão | Padroniza commits no formato `[TAG] escopo: resumo` com justificativa do *porquê*, passos de reprodução, sem pontuações não-ASCII e trailers rastreáveis. |
| **`weth-agent-coordination`** | `.agents/skills/weth-agent-coordination` | Demandas multidomínio (UI/UX, arquitetura complexa, integrações) | Coordena silenciosamente especialistas transversais (ex.: `frontend-engineer`, `security-audit`). |

---

## 4. Particularidades Técnicas do Odoo 20 (Master)

O orquestrador deve aplicar as mudanças arquiteturais da versão 20.0:
1. **Unificação de ACLs e Regras em `ir.access`:** As antigas tabelas `ir.model.access` e `ir.rule` foram consolidadas no modelo `ir.access`, com colunas `id,name,model_id,group_id/id,operation,domain`.
2. **Constraints e Índices Modernos:** Atributos de classe `_sql_constraints` são ignorados. Devem ser declarados como atributos iniciados por `_` usando `models.Constraint`, `models.Index` ou `models.UniqueIndex`.
3. **Traduções Rigorosas:** Traduções devem ser estáticas via `self.env._("Texto %s", valor)`. Concatenações ou f-strings dentro de `_()` são proibidas.
4. **Sintaxe XML Limpa:** Não usar `attrs=` nem tags legadas.
5. **Frontend 100% Owl 3:** Hooks depreciados do Owl 2 (`useLayoutEffect`, `useSubEnv`, `useState`) são proibidos em novos desenvolvimentos.
6. **Rotas e Tipos:** Rotas utilizam `type='jsonrpc'` ou `type='http'`. O tipo `'json'` é legado.

---

## 5. Identidade Visual e Paleta de Cores Canônica WETH

Os agentes devem adotar diretamente os tokens oficiais da WETH (definidos em `addons/web/static/src/scss/primary_variables.scss`), sem necessidade de re-investigar o código SCSS:

| Papel / Token | Variável SCSS | Hex | Descrição de Uso |
| :--- | :--- | :---: | :--- |
| **Primária Oficial** | `$o-brand-primary` / `$o-community-color` | `#05285b` | Azul WETH (Navbar, botões primários, PWA manifest) |
| **Secundária / Suporte**| `$o-brand-secondary` | `#64748b` | Slate Blue institucional para elementos complementares |
| **Escura / Enterprise** | `$o-enterprise-color` | `#031b3e` | Azul Profundo para estados ativos escuros e contrastes |
| **Ação / Destaque** | `$o-action` / `$o-enterprise-action-color` | `#1b4f9b` | Azul Ação vibrante (hover primário, tours, dropzones) |
| **Links** | `$o-main-link-color` | `#13448a` | Azul de links navegáveis |
| **Fundo Secundário** | `$o-brand-lightsecondary` | `#f8f9fa` | Cinza Off-White (`$o-gray-100`) |
| **Sucesso** | `$o-success` | `#28a745` | Feedback positivo (texto: `#008818`) |
| **Informação** | `$o-info` | `#17a2b8` | Informativo / neutro (texto: `#0180a5`) |
| **Aviso** | `$o-warning` | `#ffac00` | Alertas / pendências (texto: `#9a6b01`) |
| **Perigo** | `$o-danger` | `#dc3545` | Falhas / bloqueios (texto: `#d23f3a`) |
| **Favorito** | `$o-main-favorite-color` | `#f3cc00` | Estrelas e marcações |

---

## 6. Fluxo Operacional de Execução

Ao receber uma demanda, o orquestrador executa o seguinte fluxo mental:

```
[1. Diagnosticar & Mapear] ──> [2. Consultar Guidelines] ──> [3. Implementar Escopo Mínimo]
                                                                        │
[6. Gerar Commit Padronizado] <── [5. Revisar Mérito & Segurança] <── [4. Validar & Testar]
```

1. **Diagnóstico:** Identifica os módulos envolvidos, modelos estendidos e consumidores existentes.
2. **Consulta:** Lê os arquivos correspondentes em `guidelines/` antes de escrever código.
3. **Implementação:** Desenvolve respeitando batching de ORM, tipos seguros e modularidade.
4. **Validação:** Testa a compilação, integridade do registry e conformidade com testes automatizados.
5. **Revisão:** Aplica a checklist do `odoo-security` e `odoo-review`.
6. **Commit:** Elabora mensagem de commit rigorosamente alinhada à skill `odoo-git`, verificando a identidade do autor Git local.

---

## 7. Identidade Git e Commits

Antes de qualquer operação de commit:
* Verificar se o autor local do Git está devidamente configurado (`git config user.name` e `git config user.email`).
* Jamais assinar commits com nomes genéricos ou identificadores de agentes de IA.

