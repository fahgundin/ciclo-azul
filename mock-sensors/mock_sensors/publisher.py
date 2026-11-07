"""Publisher MQTT do mock de sensores.

Publica leituras de consumo de agua no broker conforme docs/contrato-iot.md:
- intervalo configuravel (MOCK_INTERVAL_SECONDS)
- multiplas unidades (MOCK_UNIT_IDS, separadas por virgula)
- cenarios: normal, pico, silencio (MOCK_SCENARIO) — silencio nao publica

A funcao build_message (reaproveitada em testes) nao depende de MQTT.
"""

from __future__ import annotations

import json
import os
import random
import time
from datetime import UTC, datetime

from .contract import WaterConsumptionReading, water_consumption_topic
from .history import build_history
from .scenarios import Scenario, next_value, should_publish


def build_message(
    unit_id: str,
    sensor_id: str,
    value: float,
    sequence: int,
    timestamp: datetime | None = None,
) -> tuple[str, str]:
    """Monta (topico, payload_json) de uma leitura conforme o contrato v1.

    `timestamp` ausente = agora; informado, e o momento da medicao (backfill).
    """
    reading = WaterConsumptionReading(
        sensor_id=sensor_id,
        unit_id=unit_id,
        value=value,
        sequence=sequence,
        timestamp=timestamp,
    )
    return water_consumption_topic(unit_id), json.dumps(reading.to_payload())


def _parse_units(raw: str) -> list[str]:
    return [u.strip() for u in raw.split(",") if u.strip()]


def backfill(
    client,
    units: list[str],
    hours: float,
    step_minutes: float,
    now: datetime | None = None,
    rng: random.Random | None = None,
) -> dict[str, int]:
    """Publica o historico sintetico das ultimas `hours` horas de cada unidade.

    Retorna a ultima sequencia usada por unidade, para o loop ao vivo continuar dela.
    """
    moment = now or datetime.now(UTC)
    sequences = {unit: 0 for unit in units}
    for unit in units:
        for reading in build_history(moment, hours, step_minutes, rng):
            topic, payload = build_message(
                unit, f"mock-{unit}", reading.value, reading.sequence, reading.timestamp
            )
            client.publish(topic, payload, qos=1)
            sequences[unit] = reading.sequence
    return sequences


def run(
    client,
    units: list[str],
    scenario: Scenario,
    interval: float,
    max_cycles: int | None = None,
    initial_sequences: dict[str, int] | None = None,
):
    """Loop de publicacao.

    `client` deve expor `publish(topic, payload, qos)` (compativel com paho-mqtt).
    `max_cycles` limita o numero de ciclos (usado em teste); None = infinito.
    `initial_sequences` define de onde cada unidade continua a contagem (apos o backfill).
    """
    sequences = {unit: (initial_sequences or {}).get(unit, 0) for unit in units}
    cycles = 0
    while max_cycles is None or cycles < max_cycles:
        if should_publish(scenario):
            for unit in units:
                sequences[unit] += 1
                topic, payload = build_message(
                    unit, f"mock-{unit}", next_value(scenario), sequences[unit]
                )
                client.publish(topic, payload, qos=1)
        cycles += 1
        if max_cycles is None or cycles < max_cycles:
            time.sleep(interval)
    return sequences


def main() -> None:
    import paho.mqtt.client as mqtt

    broker = os.environ.get("MQTT_BROKER", "localhost")
    port = int(os.environ.get("MQTT_PORT", "1883"))
    units = _parse_units(
        os.environ.get("MOCK_UNIT_IDS", os.environ.get("MOCK_UNIT_ID", "data-center-sp-01"))
    )
    scenario = Scenario(os.environ.get("MOCK_SCENARIO", "normal"))
    interval = float(os.environ.get("MOCK_INTERVAL_SECONDS", "30"))
    backfill_hours = float(os.environ.get("MOCK_BACKFILL_HOURS", "48"))
    backfill_step = float(os.environ.get("MOCK_BACKFILL_STEP_MINUTES", "15"))

    client = mqtt.Client()
    client.connect(broker, port, 60)
    client.loop_start()
    try:
        initial: dict[str, int] = {}
        if backfill_hours > 0:
            initial = backfill(client, units, backfill_hours, backfill_step)
            print(
                f"[mock-sensors] historico de {backfill_hours:g} h publicado "
                f"(1 leitura a cada {backfill_step:g} min) em {units}"
            )
        print(f"[mock-sensors] publicando cenario '{scenario.value}' em {units} a cada {interval}s")
        run(client, units, scenario, interval, initial_sequences=initial)
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
