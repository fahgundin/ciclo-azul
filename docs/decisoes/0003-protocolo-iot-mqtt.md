# ADR 0003 — MQTT como protocolo de ingestão IoT

- **Status:** Aceito
- **Data:** 2026-11-01

## Contexto

R04/R05 exigem receber leituras de sensores e monitorar consumo em tempo real. Os
sensores começarão como mock (Python) e depois serão substituídos por sensores
reais, exigindo um contrato de comunicação estável.

## Alternativas consideradas

- **HTTP POST periódico:** simples, sem broker, mas é polling e menos fiel ao
  mundo real de IoT.
- **WebSocket sensor↔backend:** tempo real, porém incomum em sensores e com
  reconexão/escala mais complexas.
- **MQTT:** padrão de fato em IoT, leve, pub/sub, com QoS e suporte nativo no NestJS.

## Decisão

Usar **MQTT** (broker Mosquitto/EMQX) como canal de ingestão sensor → backend. O
contrato (tópicos + payload JSON versionado) está em `docs/contrato-iot.md`.

O canal **backend → frontend** (painel em tempo real) é separado, via WebSocket.

## Consequências

- Adiciona um broker à infraestrutura (via Docker Compose).
- O mock Python e os sensores reais são intercambiáveis: mesmo tópico, mesmo schema.
- Backend precisa ser idempotente (QoS 1 pode duplicar).
