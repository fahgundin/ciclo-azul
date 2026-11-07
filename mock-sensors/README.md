# ciclo-azul-mock-sensors

Mock de sensores IoT em Python. Publica leituras de consumo de agua no broker MQTT
seguindo o contrato `docs/contrato-iot.md` (v1), permitindo desenvolver o backend
sem sensores reais. A troca futura por sensores fisicos e transparente: mesmo
topico, mesmo schema. Ver `docs/decisoes/0003-protocolo-iot-mqtt.md`.

## Estrutura

```
mock_sensors/
  contract.py     # topico + payload (paridade com @ciclo-azul/contracts)
  publisher.py    # publisher MQTT (ao vivo + backfill)
  history.py      # historico sintetico (perfil diario + ruido)
  scenarios.py    # cenarios normal/pico/silencio
tests/
  test_contract.py
  test_publisher.py
  test_history.py
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
| `MOCK_BACKFILL_HOURS` | `48` | Horas de historico publicadas ao iniciar (`0` desliga) |
| `MOCK_BACKFILL_STEP_MINUTES` | `15` | Intervalo entre as leituras do historico |

## Historico inicial (backfill)

Ao iniciar, o mock publica as ultimas 48 h de leituras (uma a cada 15 min, 192 por
unidade) com `timestamp` no passado e so entao segue ao vivo, continuando a
`sequence` de onde o historico parou. O historico tem perfil diario (menos consumo de
madrugada, pico no meio da tarde) e ruido, para o grafico parecer real.

- **Suba o backend antes do mock.** Mensagens publicadas sem assinante sao perdidas
  (sem sessao persistente), entao o historico so chega se o backend ja estiver
  assinando o topico.
- **Reiniciar o mock repete o backfill.** O backend descarta duplicatas por
  `sensorId` + `sequence` apenas em memoria; se o backend tambem reiniciou com banco
  persistente, as leituras duplicam. Para recomecar limpo: `docker compose down -v`.
- O historico usa sempre a faixa do cenario `normal`, qualquer que seja
  `MOCK_SCENARIO`. Com `silencio`, o historico e publicado e depois o mock para.
- Unidade sem historico (ex.: para o cenario "sem 24 h de dados" da HU05): nao a inclua em
  `MOCK_UNIT_IDS`, ou use `MOCK_BACKFILL_HOURS=0`.

## Cenarios

- **normal** — consumo tipico.
- **pico** — consumo elevado (exercita alertas futuros).
- **silencio** — nao publica, para exercitar a regra "sem dados recentes" (R05).

A logica de cenarios (`scenarios.py`) e o loop (`publisher.run`) sao testados sem
broker, com um client falso. Ver `tests/test_publisher.py`.
