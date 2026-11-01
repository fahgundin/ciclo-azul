"""Publisher MQTT do mock de sensores.

Esqueleto da F1: estrutura e contrato prontos. A implementacao completa (loop de
publicacao, cenarios de pico/silencio, multiplas unidades) entra na F4.
Ver docs/contrato-iot.md secao 6.
"""

from __future__ import annotations

import json
import os

from .contract import WaterConsumptionReading, water_consumption_topic


def build_message(unit_id: str, sensor_id: str, value: float, sequence: int) -> tuple[str, str]:
    """Monta (topico, payload_json) de uma leitura conforme o contrato v1."""
    reading = WaterConsumptionReading(
        sensor_id=sensor_id,
        unit_id=unit_id,
        value=value,
        sequence=sequence,
    )
    topic = water_consumption_topic(unit_id)
    return topic, json.dumps(reading.to_payload())


def main() -> None:
    """Ponto de entrada. Implementacao de publicacao real chega na F4."""
    broker = os.environ.get("MQTT_BROKER", "localhost")
    print(f"[mock-sensors] configurado para broker '{broker}' (publicacao real: F4)")


if __name__ == "__main__":
    main()
