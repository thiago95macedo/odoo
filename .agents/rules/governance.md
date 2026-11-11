# Regras de Governança Operacional WETH — Odoo 20

Este arquivo define as restrições inegociáveis de operação do agente no ambiente de desenvolvimento Odoo da WETH:

1. **Evidências Fatuais:** Não assuma comportamentos com base em versões antigas (v14, v16). Valide diretamente no código do Odoo 20 (`git grep`, leitura de sources).
2. **Investigação Prévia:** Antes de alterar qualquer método, campo ou template, busque suas referências ativas em `odoo/` e `addons/`.
3. **Mínimo Impacto:** Altere exclusivamente o estritamente necessário. Não faça refatorações cosméticas em código estável.
4. **Isolamento de Mudanças:** Módulos customizados não devem poluir nem sobrescrever arquivos do core do Odoo diretamente. Use herança (`_inherit`, templates QWeb com `xpath`).
5. **Segurança Proativa:**
   - Toda chamada `sudo()` requer justificativa documentada em comentário.
   - Rotas HTTP de escrita exigem `POST` e validação CSRF.
   - Proibido o uso de `eval()` e `pickle`.
   - Consultas SQL cruas devem utilizar o wrapper `SQL(...)`.
6. **Git Rigoroso:**
   - Mensagens no padrão `[TAG] modulo: resumo imperativo`.
   - Explicação obrigatória do *porquê* e passos de reprodução.
   - Não utilizar pontuação não-ASCII (substituir em-dash `—` por `:` ou vírgula).
   - Verificar identidade local do Git antes de comitar.

