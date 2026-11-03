# ciclo-azul-mock-sensors

Mock de sensores IoT em Python. Publica leituras de consumo de agua no broker MQTT
seguindo o contrato `docs/contrato-iot.md` (v1), permitindo desenvolver o backend
sem sensores reais. A troca futura por sensores fisicos e transparente: mesmo
topico, mesmo schema. Ver `docs/decisoes/0003-protocolo-iot-mqtt.md`.

## Estrutura

```
mock_sensors/
  contract.py     # topico + payload (paridade com @ciclo-azul/contracts)
  publisher.py    # esqueleto do publisher (publicacao real: F4)
tests/
  test_contract.py
```

## Ambiente

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Scripts

```bash
pytest          # testes
ruff check .    # lint
black .         # format
python -m mock_sensors.publisher   # publica no broker
```

## Configuracao (variaveis de ambiente)

| Variavel | Default | Descricao |
|---|---|---|
| `MQTT_BROKER` | `localhost` | Host do broker |
| `MQTT_PORT` | `1883` | Porta do broker |
| `MOCK_UNIT_IDS` | `data-center-sp-01` | Unidades a simular (separadas por virgula) |
| `MOCK_SCENARIO` | `normal` | `normal`, `pico` ou `silencio` |
| `MOCK_INTERVAL_SECONDS` | `30` | Intervalo entre ciclos de publicacao |

## Cenarios

- **normal** — consumo tipico.
- **pico** — consumo elevado (exercita alertas futuros).
- **silencio** — nao publica, para exercitar a regra "sem dados recentes" (R05).

A logica de cenarios (`scenarios.py`) e o loop (`publisher.run`) sao testados sem
broker, com um client falso. Ver `tests/test_publisher.py`.
