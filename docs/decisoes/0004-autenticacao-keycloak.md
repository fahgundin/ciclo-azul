# ADR 0004 — Keycloak para autenticação/autorização

- **Status:** Aceito
- **Data:** 2026-11-01

## Contexto

A equipe quer uma solução de autenticação pronta e confiável, sem implementar
criptografia/sessão própria. Há 4 perfis (Administrador, Gestor Ambiental,
Operador, Diretoria) e R01 trata de gerenciar perfis e permissões. A API deve
exigir autenticação em todas as rotas.

## Alternativas consideradas

- **Auth0 / Cognito / Supabase (SaaS):** fáceis, porém dependem de serviço externo
  e/ou custo ao escalar.
- **Keycloak (self-hosted, open source):** gestão de usuários, roles e RBAC via
  OIDC, sem custo de licença.

## Decisão

Usar **Keycloak** (OIDC) como provedor de identidade. RBAC mapeia os 4 perfis como
roles. Guards do NestJS validam o token em **todas** as rotas.

## Justificativa

- Resolve boa parte de R01 (gestão de usuários/roles) de forma pronta.
- Open source e auto-hospedável (Docker), sem implementação própria de auth.

## Consequências

- Operar o Keycloak (container + banco) no ambiente.
- Frontend implementa fluxo OIDC desacoplado da UI (ADR 0005).
- "API interna": CORS restrito + auth obrigatória; não é um produto exposto a
  terceiros (ver `arquitetura.md`, seção de segurança).
