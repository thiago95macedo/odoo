# Arquitetura do Ambiente Odoo 20 — WETH

## 1. Visão Geral do Sistema

O ambiente de desenvolvimento do Odoo 20 na WETH é executado localmente na estação de trabalho Linux (Ubuntu 26.04), operando sob Python 3.14 e PostgreSQL local.

```
/home/arcanus/Workspace/clientes/weth/odoo/
├── .agents/                 # Orquestração do Antigravity (skills e rules)
│   ├── rules/              # Regras arquiteturais e governança
│   └── skills/             # Links simbólicos para as skills locais e WETH
├── addons/                 # Addons oficiais do ecossistema Odoo
├── odoo/                   # Core do framework Odoo 20
├── docs/                   # Memória operacional e arquitetura
├── skills/                 # Biblioteca fonte de skills Odoo
├── requirements.txt        # Dependências Python (otimizado para Linux)
├── odoo-bin                # Executável do servidor
└── odoo.conf               # Configuração do servidor local (a provisionar)
```

## 2. Topologia de Rede e Portas

- **Aplicação Principal (HTTP / XML-RPC):** Porta `8085` (localhost)
- **Longpolling / Chat WebSocket (`/websocket`):** Porta `8095` (localhost)
- **Banco de Dados (PostgreSQL):** Porta `5432` (localhost)
- **Proxy Reverso (Host):** Gerenciado externamente via Caddy em `127.0.0.1:80/443`. O Odoo opera internamente nas portas 8085 e 8095 com suporte a proxy headers.

## 3. Modelo de Banco de Dados

- **Role de Desenvolvimento:** `weth`
- **Senha Padrão:** `1q2w3e4r`
- **Permissões:** Superusuário local / `CREATEDB`

## 4. Camadas do Framework Odoo 20

1. **Camada de Dados & ORM:** Models baseados em `models.Model`, `models.TransientModel` e `models.AbstractModel`.
2. **Camada de Permissões Unificada:** Modelo `ir.access` consolidando ACLs e record rules.
3. **Camada de Interface:** Frontend reativo em **Owl 3** consumindo RPCs estruturados via `jsonrpc`.

