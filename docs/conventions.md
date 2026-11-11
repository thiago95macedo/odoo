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

