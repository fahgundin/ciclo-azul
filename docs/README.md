# Documentação — Ciclo Azul (ODS 6)

Sistema de monitoramento de consumo de água em refrigeração de data centers e de
rastreamento do descarte de resíduos, alinhado ao **ODS 6 — Água Potável e
Saneamento**.

## Índice

| Documento | Conteúdo |
|---|---|
| [escopo.md](escopo.md) | Visão do produto, perfis, requisitos R01–R10, dependências e recorte do MVP. |
| [arquitetura.md](arquitetura.md) | Stack, estilo (Clean + Hexagonal), camadas, tempo real e segurança/API interna. |
| [contrato-iot.md](contrato-iot.md) | Contrato MQTT sensores ↔ backend (tópicos, payload, QoS, regras). |
| [historias-de-usuario.md](historias-de-usuario.md) | Histórias de usuário e testes de aceitação (Gherkin). |
| [migracao-frontend.md](migracao-frontend.md) | Migração do protótipo de frontend para React + TS: diretrizes, estado das telas e pendências. |
| [decisoes/](decisoes/README.md) | ADRs — registros das decisões de arquitetura. |

## Decisões técnicas (resumo)

- **Backend:** NestJS (TypeScript), Arquitetura Limpa + Hexagonal.
- **Frontend:** React PWA (TypeScript), camadas desacopladas (`core/` vs `ui/`)
  visando futura migração para React Native.
- **IoT:** MQTT como contrato de ingestão; mock dos sensores em Python.
- **Tempo real (front):** WebSocket.
- **Autenticação:** Keycloak (OIDC, RBAC), auth obrigatória em todas as rotas.
- **API:** acesso interno (CORS restrito + auth), não exposta a terceiros.

## MVP (prioridade Alta)

R04 (ingestão IoT/leitura manual), R05 (monitoramento em tempo real), R07 (tipos de
resíduo), R06 (destinação de lotes), R09 (relatórios PDF/CSV), mais a base de
autenticação/autorização por perfil.

## Pontos em aberto (a confirmar)

- Banco de dados definitivo (sugestão: PostgreSQL).
- RNFs: latência alvo do tempo real, retenção/volume de leituras, disponibilidade.
- Regra de prazo para R08 (lotes sem destinação).
- Tratamento de `unitId` desconhecido na ingestão MQTT.
- Autenticação dos sensores no broker (produção).

## Estrutura do repositório (planejada)

```
backend/        # NestJS (clean + hexagonal)
frontend/       # React PWA (core/ + ui/)
mock-sensors/   # publisher MQTT em Python
docs/           # esta documentação
```
