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
python -m mock_sensors.publisher   # (F4) publica no broker
```

Variavel `MQTT_BROKER` define o host do broker (default `localhost`).

## Pendencia

A publicacao periodica real, cenarios (pico/silencio) e multiplas unidades entram
na **F4** (issue #4).
