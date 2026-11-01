# ADR 0001 — Stack: NestJS + React (TypeScript)

- **Status:** Aceito
- **Data:** 2026-11-01

## Contexto

O Ciclo Azul precisa de backend e frontend para múltiplos perfis, com domínio rico
(monitoramento, resíduos, relatórios) e integração em tempo real. A equipe quer
TypeScript ponta a ponta.

## Decisão

- **Backend:** NestJS (TypeScript).
- **Frontend:** React (TypeScript).

## Justificativa

- NestJS é modular, opinativo e tem injeção de dependência nativa, o que facilita
  a arquitetura limpa + hexagonal (ADR 0002).
- TypeScript em ambos permite compartilhar tipos/contratos e reduzir divergência.
- React tem ecossistema maduro e caminho para PWA e futura migração RN (ADR 0005).

## Consequências

- Suporte nativo do NestJS a MQTT e WebSocket favorece os canais de tempo real.
- Necessário disciplinar a fronteira do domínio para não acoplar ao framework.
- Banco sugerido: PostgreSQL (a confirmar em ADR futuro, se necessário).
