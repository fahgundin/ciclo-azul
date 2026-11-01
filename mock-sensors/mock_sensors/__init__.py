"""Mock de sensores IoT do Ciclo Azul."""

from .contract import (
    MQTT_CONTRACT_VERSION,
    WaterConsumptionReading,
    water_consumption_topic,
)

__all__ = [
    "MQTT_CONTRACT_VERSION",
    "WaterConsumptionReading",
    "water_consumption_topic",
]
