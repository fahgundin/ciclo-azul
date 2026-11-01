"""Testes de fumaca do mock de sensores."""

import json

from mock_sensors import WaterConsumptionReading, water_consumption_topic
from mock_sensors.publisher import build_message


def test_topico_segue_o_contrato_v1() -> None:
    assert (
        water_consumption_topic("data-center-sp-01")
        == "ciclo-azul/v1/sensors/data-center-sp-01/water-consumption"
    )


def test_payload_contem_campos_obrigatorios() -> None:
    reading = WaterConsumptionReading(
        sensor_id="sensor-abc-123",
        unit_id="data-center-sp-01",
        value=1234.56,
        sequence=1,
    )
    payload = reading.to_payload()
    for campo in ("schemaVersion", "sensorId", "unitId", "timestamp", "metric", "value", "unit"):
        assert campo in payload
    assert payload["unit"] == "liter"
    assert payload["readingType"] == "sensor"


def test_build_message_retorna_topico_e_json_valido() -> None:
    topic, payload_json = build_message("data-center-rj-02", "sensor-1", 10.0, 7)
    assert topic.endswith("data-center-rj-02/water-consumption")
    parsed = json.loads(payload_json)
    assert parsed["sequence"] == 7
    assert parsed["value"] == 10.0
