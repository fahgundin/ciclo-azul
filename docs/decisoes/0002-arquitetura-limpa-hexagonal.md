# ADR 0002 — Arquitetura Limpa + Hexagonal

- **Status:** Aceito
- **Data:** 2026-11-01

## Contexto

O sistema terá infraestrutura que pode mudar (broker MQTT, banco, provedor de auth)
e, de forma crítica, os sensores IoT começarão como mock e serão trocados por
sensores reais. É preciso isolar as regras de negócio dessas variações.

## Decisão

Adotar **Arquitetura Limpa + Hexagonal (Ports & Adapters)** no backend, com a regra
da dependência apontando sempre para o domínio.

## Justificativa

- A ingestão de leituras vira um **port**; mock Python e sensores reais são apenas
  adapters/produtores do mesmo contrato (ver ADR 0003 e `contrato-iot.md`).
- Regras de negócio testáveis sem banco nem broker.
- Troca de infraestrutura = troca de adapter, sem tocar no domínio.

## Consequências

- Mais estrutura inicial (camadas domain/application/infrastructure por módulo).
- Padrões aplicados: Repository, Use Case, DTO/Mapper, Factory, Strategy (PDF/CSV),
  DI nativa do NestJS.
- `domain/` não importa NestJS nem infraestrutura — regra verificável em revisão.
