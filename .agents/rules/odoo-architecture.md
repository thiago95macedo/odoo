# Regras de Arquitetura Técnica — Odoo 20

## 1. Backend e ORM
- **Operações em Lote:** Proibido executar `search`, `create`, `write` ou agregações dentro de loops `for`.
- **Decorações Obrigatórias:** Métodos `create()` sobrescritos devem ser decorados com `@api.model_create_multi`.
- **Declaração de Constraints e Índices:**
  - Proibido `_sql_constraints` (ignorado em Odoo 20).
  - Usar atributos com prefixo `_`: `_check_name = models.Constraint("CHECK (...)", "Mensagem")`.
  - Usar `models.Index` e `models.UniqueIndex` para índices compostos ou especiais.
- **Ordenação Segura:** Todo atributo `_order` deve finalizar com um campo único (ex: `sequence, id`).
- **Traduções:** Usar sempre `self.env._("Mensagem com %s", valor)`. Nunca use concatenação ou f-strings dentro de `_()`.

## 2. Controle de Acesso e Permissões
- Declarar permissões no modelo unificado `ir.access` em `security/ir.access.csv`:
  `id,name,model_id,group_id/id,operation,domain`
- Coluna `operation` define o subconjunto de letras CRUD (`r`, `cru`, `crud`).
- Linhas sem grupo são restrições globais (aplicadas com AND).
- Modelos multi-empresa devem possuir restrição com `company_id`.

## 3. Frontend OWL 3
- Organizar arquivos por funcionalidade (`feature/`), não por tipo.
- Usar exclusivamente hooks modernos do Owl 3: `useEffect`, `useOnChange`, `computed`, `signal.ref()`.
- Proibido utilizar `useLayoutEffect`, `useSubEnv`, `useState` em novos desenvolvimentos.
- Evitar getters em componentes; preferir funções explícitas ou derivadas reativas via `computed`.
- Garantir acessibilidade: todo ícone deve possuir `role="img"` e `aria-hidden="true"` ou `aria-label`.
- Testes de UI devem usar a biblioteca moderna Hoot, pareando asserções negativas com positivas.

