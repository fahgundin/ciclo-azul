# Contrato de Integração IoT — MQTT (Ciclo Azul)

> Contrato de comunicação entre os **sensores de consumo de água** e o **backend**.
> Este documento é a fonte de verdade para a troca futura do mock (Python) por
> sensores reais: qualquer produtor que respeite este contrato é compatível.
> Requisitos relacionados: **R04** (ingestão) e **R05** (tempo real).

## 1. Visão geral

- **Protocolo:** MQTT (broker Mosquitto ou EMQX).
- **Produtores:** sensores de campo (futuro) ou **mock em Python** (agora).
- **Consumidor:** backend NestJS (adapter de entrada — subscriber MQTT).
- **Direção:** sensor → broker → backend (publish/subscribe).

O backend **não** conhece o produtor: só conhece tópicos e o schema das mensagens.

## 2. Convenção de tópicos

```
ciclo-azul/v1/sensors/{unitId}/water-consumption
```

- `ciclo-azul` — namespace raiz do sistema.
- `v1` — **versão do contrato** no próprio tópico (permite coexistência durante
  migrações de schema).
- `sensors` — categoria de origem.
- `{unitId}` — identificador da unidade (ex.: `data-center-sp-01`).
- `water-consumption` — tipo de telemetria.

Tópicos auxiliares:

| Tópico | Direção | Uso |
|---|---|---|
| `ciclo-azul/v1/sensors/{unitId}/water-consumption` | sensor → backend | Leitura de consumo. |
| `ciclo-azul/v1/sensors/{unitId}/status` | sensor → backend | Heartbeat / estado do sensor (opcional). |
| `ciclo-azul/v1/sensors/{sensorId}/lwt` | broker → backend | Last Will & Testament (sensor caiu). |

## 3. Payload — leitura de consumo

Formato **JSON**, versionado também no corpo (redundância intencional com o tópico).

```json
{
  "schemaVersion": "1.0",
  "sensorId": "sensor-abc-123",
  "unitId": "data-center-sp-01",
  "timestamp": "2026-11-01T22:05:30.000Z",
  "metric": "water-consumption",
  "value": 1234.56,
  "unit": "liter",
  "readingType": "sensor",
  "sequence": 10421
}
```

### Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `schemaVersion` | string (semver curto) | Sim | Versão do schema do payload. |
| `sensorId` | string | Sim | Identificador único do sensor. |
| `unitId` | string | Sim | Unidade à qual a leitura pertence. |
| `timestamp` | string (ISO 8601 UTC) | Sim | Momento da medição na origem. |
| `metric` | string | Sim | Métrica; neste contrato, `water-consumption`. |
| `value` | number | Sim | Valor medido. |
| `unit` | string | Sim | Unidade de medida (`liter`). |
| `readingType` | enum: `sensor` \| `manual` | Sim | Origem da leitura. Leitura manual (R04) chega pela API, mas usa o mesmo modelo de domínio. |
| `sequence` | integer | Não | Contador monotônico do sensor; ajuda a detectar perda/duplicação. |

### Regras de validação (no backend)

- Payload fora do schema → mensagem **rejeitada e logada** (não derruba o consumer).
- `timestamp` no futuro (além de uma tolerância, ex.: 2 min) → rejeitado.
- `value` negativo → rejeitado.
- `unitId` desconhecido → leitura registrada como "órfã" para auditoria **ou**
  rejeitada (decisão a confirmar; sugestão: logar e descartar no MVP).

## 4. QoS, retenção e sessão

| Parâmetro | Valor sugerido | Motivo |
|---|---|---|
| **QoS leituras** | 1 (at least once) | Garante entrega; backend precisa ser idempotente. |
| **QoS status/LWT** | 1 | Estado é importante. |
| **Retained** | Não (leituras); Sim (último status) | Leitura é série temporal; status interessa o último valor. |
| **Clean session** | Depende | Sensores reais com buffer offline podem usar sessão persistente. |

**Idempotência:** como QoS 1 pode duplicar, o backend deduplica por
(`sensorId`, `timestamp`) ou (`sensorId`, `sequence`).

## 5. Regra "sem dados recentes" (R05)

- Se uma unidade **não** recebe leitura há **mais de 15 minutos**, o backend marca
  a unidade como **"Sem dados recentes"** no painel de tempo real.
- Implementação (R05): **cálculo sob demanda**, com base no `timestamp` da última
  leitura da unidade (a de maior `timestamp`, de sensor ou manual). Exposto em
  `GET /water-status` e `GET /water-status/:unitId` (estados `live`, `stale` e
  `no-data`). Não há job periódico: a transição para "Sem dados recentes" **não** é
  emitida pelo WebSocket, e o cliente recalcula com `lastReadingAt` e
  `staleAfterMinutes`, ou consulta de novo.
- Exatamente 15 minutos ainda é recente; "mais de 15" começa em 15 min e 1 s.
- O "consumo atual" exibido é o `value` da última leitura. Se o `value` é um volume
  por intervalo ou um acumulado do medidor não está definido no contrato (ponto a
  confirmar, seção 8).
- O valor **15 min** vem dos testes de aceitação de R05 e está registrado aqui
  como regra oficial. Alterações devem atualizar este documento.

## 6. Mock de sensores (Python)

Projeto **separado** do backend. Responsabilidade única: publicar leituras
realistas no broker, respeitando este contrato.

Comportamento esperado do mock:

- Publicar em `ciclo-azul/v1/sensors/{unitId}/water-consumption` em intervalo
  configurável (ex.: a cada 30 s).
- Permitir simular cenários: consumo normal, pico, e **silêncio** (parar de
  publicar para exercitar a regra "sem dados recentes").
- Suportar múltiplas unidades simultâneas.
- Biblioteca sugerida: `paho-mqtt`.

Esboço (ilustrativo):

```python
import json, time, uuid
from datetime import datetime, timezone
import paho.mqtt.client as mqtt

BROKER = "localhost"
UNIT_ID = "data-center-sp-01"
TOPIC = f"ciclo-azul/v1/sensors/{UNIT_ID}/water-consumption"

client = mqtt.Client()
client.connect(BROKER, 1883, 60)

seq = 0
while True:
    seq += 1
    payload = {
        "schemaVersion": "1.0",
        "sensorId": "sensor-abc-123",
        "unitId": UNIT_ID,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metric": "water-consumption",
        "value": 1234.56,
        "unit": "liter",
        "readingType": "sensor",
        "sequence": seq,
    }
    client.publish(TOPIC, json.dumps(payload), qos=1)
    time.sleep(30)
```

## 7. Versionamento e evolução do contrato

- **Mudança compatível** (campo opcional novo): mantém `v1` / `schemaVersion` 1.x.
- **Mudança incompatível** (renomear/remover campo, mudar tipo): nova versão de
  tópico (`v2`) e `schemaVersion` 2.0. Backend pode assinar `v1` e `v2`
  simultaneamente durante a transição.
- Sensores reais substituem o mock sem alteração no backend, desde que publiquem
  no mesmo tópico com o mesmo schema.

## 8. Pontos a confirmar

- Tratamento de `unitId` desconhecido: **decisao de MVP (F4)** — como ainda nao ha
  cadastro de unidades, o backend **aceita qualquer `unitId`** e registra a leitura.
  Revisar quando o cadastro de unidades existir (validar contra unidades conhecidas
  ou marcar como "orfa").
- Necessidade real dos tópicos de `status`/LWT no MVP.
- Autenticação do sensor no broker (usuário/senha ou TLS/mTLS) para produção.
- **Semântica do `value`:** é o volume medido no intervalo ou o acumulado do
  medidor? O R05 exibe o `value` da última leitura como "consumo atual", sem
  agregar. Consumo por período (dia, mês), exigido por R03 (limites) e R10 (KPIs),
  depende dessa definição.
