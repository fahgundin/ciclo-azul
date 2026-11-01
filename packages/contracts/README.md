# @ciclo-azul/contracts

Tipos de contrato compartilhados entre `backend/` e `frontend/`. Centraliza
definicoes para evitar divergencia (ver `AGENTS.md`, secao 3).

Atualmente expoe o contrato de **leitura de consumo de agua** (MQTT v1), alinhado a
`docs/contrato-iot.md`.

## Scripts

```bash
pnpm --filter @ciclo-azul/contracts build   # compila para dist/
pnpm --filter @ciclo-azul/contracts test    # testes (vitest)
pnpm --filter @ciclo-azul/contracts lint
```

## Uso

```ts
import { waterConsumptionTopic, type WaterConsumptionReading } from '@ciclo-azul/contracts';
```
