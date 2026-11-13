# Convenções de Desenvolvimento e Qualidade — Odoo 20

Este documento reúne as convenções mandatórias derivadas das skills oficiais do Odoo para este projeto.

---

## 1. Convenções de Código Python e ORM (`odoo-guidelines`)

- **Nomenclatura:** Models no singular (`modulo.entidade`). Arquivos nomeados com underscores (`modulo_entidade.py`).
- **Operações ORM em Lote:** Proibido executar queries ou gravações dentro de loops.
- **Constraints:** Usar `_check_<campo> = models.Constraint("CHECK (...)", "Mensagem")`.
- **Índices:** Usar `_index_<campo> = models.Index("(campo1, campo2)")`.
- **Ordenação:** Todo `_order` deve terminar em campo com valor único (ex: `sequence, id`).
- **Traduções:** Usar estritamente literais com `self.env._("Texto %s", arg)`.

---

## 2. Convenções de Frontend OWL 3 (`odoo-web-guidelines`)

- **Organização:** Por funcionalidade em pastas sob `static/src/`.
- **Hooks:** Usar exclusivamente hooks modernos (`useEffect`, `useOnChange`, `computed`).
- **Acessibilidade:** Todo ícone deve conter `role="img"` e atributo `aria-hidden="true"` ou `aria-label`.
- **Testes de UI:** Framework Hoot com asserções positivas precedendo checagens de ausência.

---

## 3. Auditoria de Segurança (`odoo-security`)

- **Uso de `sudo()`:** Somente com escopo restrito e justificativa documentada.
- **Consultas SQL:** Usar a API parametrizada `SQL(...)`. Proibido formatar strings com `%` ou f-strings.
- **Prevenção de XSS:** Renderização via `t-out`. Nunca usar `t-raw`.
- **CSRF:** Rotas HTTP com efeito colateral devem ser `POST` com token CSRF ativo.

---

## 4. Padrão de Git e Commits (`odoo-git`)

Formato obrigatório:
```text
[TAG] escopo: resumo imperativo curto

Por que a alteração foi feita, problema encontrado e quem afeta.

Passos para reproduzir (se bug fix):
- Passo 1
- Passo 2

Antes deste commit... Após este commit...

task-1234
```
- Tags válidas: `[FIX]`, `[IMP]`, `[REF]`, `[ADD]`, `[REM]`, `[MOV]`, `[PERF]`, `[CLN]`, `[LINT]`, `[TEST]`.
- Utilizar exclusivamente pontuação ASCII (sem traços tipográficos como `—`).

---

## 5. Paleta de Cores e Identidade Visual Oficial WETH

A identidade visual do sistema adota os tokens corporativos da WETH definidos em `addons/web/static/src/scss/primary_variables.scss`. Não substitua essas variáveis por cores arbitrárias ou paletas legadas do Odoo (ex.: roxo `#714B67`).

### 5.1 Cores Institucionais e UI Core
- **`$o-brand-primary` / `$o-community-color` (`#05285b`):** Azul WETH principal. Navbar, cabeçalhos, botões primários e identidade visual PWA.
- **`$o-brand-secondary` (`#64748b`):** Slate Blue institucional para elementos secundários e suporte.
- **`$o-enterprise-color` (`#031b3e`):** Azul Profundo para fundos escuros e estados ativos destacados.
- **`$o-action` / `$o-enterprise-action-color` (`#1b4f9b`):** Azul de Ação vibrante para hover primário, botões de ação e dropzones.
- **`$o-main-link-color` (`#13448a`):** Azul de Links navegáveis.
- **`$o-brand-lightsecondary` (`#f8f9fa`):** Cinza Off-White para fundos secundários.

### 5.2 Cores Semânticas de Estado
- **Sucesso:** `$o-success` (`#28a745`), texto `$o-theme-text-colors['success']` (`#008818`).
- **Informação:** `$o-info` (`#17a2b8`), texto `$o-theme-text-colors['info']` (`#0180a5`).
- **Aviso:** `$o-warning` (`#ffac00`), texto `$o-theme-text-colors['warning']` (`#9a6b01`).
- **Perigo / Erro:** `$o-danger` (`#dc3545`), texto `$o-theme-text-colors['danger']` (`#d23f3a`).
- **Favorito / Destaque:** `$o-main-favorite-color` (`#f3cc00`).
- **Código:** `$o-main-code-color` (`#d2317b`).

### 5.3 Categorias e Badges (`$o-colors` 1 a 12)
1. Cinza (`#a2a2a2`) | 2. Vermelho (`#ee2d2d`) | 3. Laranja (`#dc8534`) | 4. Amarelo (`#e8bb1d`)
5. Azul Claro (`#5794dd`) | 6. Roxo (`#9f628f`) | 7. Coral (`#db8865`) | 8. Teal (`#41a9a2`)
9. Azul Royal (`#304be0`) | 10. Rosa (`#ee2f8a`) | 11. Verde (`#61c36e`) | 12. Violeta (`#9872e6`)

---

## 6. Nacionalização e Tradução Gradual para PT-BR

- **Idioma Base Alvo:** O português do Brasil (`pt-br`) é o idioma base pretendido para a plataforma WETH.
- **Processo Orgânico:** A tradução de documentações (`*.md`), mensagens de sistema, termos de interface, comentários e views deve ocorrer de forma progressiva e natural a cada intervenção realizada, evitando traduções em lote artificiais ou destrutivas.


