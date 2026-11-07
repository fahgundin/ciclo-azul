"""Contrato de mensagem dos sensores (MQTT v1).

Reflete docs/contrato-iot.md. Mantem paridade com o pacote TypeScript
@ciclo-azul/contracts para que a troca do mock por sensores reais seja transparente.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

MQTT_ROOT_NAMESPACE = "ciclo-azul"
MQTT_CONTRACT_VERSION = "v1"


def water_consumption_topic(unit_id: str) -> str:
    """Monta o topico MQTT de leitura de consumo de agua de uma unidade."""
    return f"{MQTT_ROOT_NAMESPACE}/{MQTT_CONTRACT_VERSION}/sensors/{unit_id}/water-consumption"


@dataclass(frozen=True)
class WaterConsumptionReading:
    """Leitura de consumo de agua conforme o contrato MQTT v1."""

    sensor_id: str
    unit_id: str
    value: float
    sequence: int
    reading_type: str = "sensor"
    schema_version: str = "1.0"
    metric: str = "water-consumption"
    unit: str = "liter"
    # Momento da medicao. Ausente = agora (leitura ao vivo); preenchido no backfill.
    timestamp: datetime | None = None

    def to_payload(self) -> dict:
        """Serializa para o payload JSON do contrato."""
        moment = self.timestamp or datetime.now(UTC)
        return {
            "schemaVersion": self.schema_version,
            "sensorId": self.sensor_id,
            "unitId": self.unit_id,
            "timestamp": moment.astimezone(UTC).isoformat(),
            "metric": self.metric,
            "value": self.value,
            "unit": self.unit,
            "readingType": self.reading_type,
            "sequence": self.sequence,
        }
