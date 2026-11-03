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
import time

from .contract import WaterConsumptionReading, water_consumption_topic
from .scenarios import Scenario, next_value, should_publish


def build_message(unit_id: str, sensor_id: str, value: float, sequence: int) -> tuple[str, str]:
    """Monta (topico, payload_json) de uma leitura conforme o contrato v1."""
    reading = WaterConsumptionReading(
        sensor_id=sensor_id,
        unit_id=unit_id,
        value=value,
        sequence=sequence,
    )
    return water_consumption_topic(unit_id), json.dumps(reading.to_payload())


def _parse_units(raw: str) -> list[str]:
    return [u.strip() for u in raw.split(",") if u.strip()]


def run(
    client, units: list[str], scenario: Scenario, interval: float, max_cycles: int | None = None
):
    """Loop de publicacao.

    `client` deve expor `publish(topic, payload, qos)` (compativel com paho-mqtt).
    `max_cycles` limita o numero de ciclos (usado em teste); None = infinito.
    """
    sequences = {unit: 0 for unit in units}
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

    client = mqtt.Client()
    client.connect(broker, port, 60)
    client.loop_start()
    print(f"[mock-sensors] publicando cenario '{scenario.value}' em {units} a cada {interval}s")
    try:
        run(client, units, scenario, interval)
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
