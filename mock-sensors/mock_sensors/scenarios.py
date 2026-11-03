"""Cenarios de simulacao do mock de sensores.

Separa a LOGICA (quanto/quando publicar) do transporte MQTT, para permitir testes
sem broker. Ver docs/contrato-iot.md secao 6.
"""

from __future__ import annotations

import random
from enum import Enum


class Scenario(str, Enum):
    """Cenarios de consumo simulado."""

    NORMAL = "normal"
    PICO = "pico"
    SILENCIO = "silencio"


# Faixas de consumo (litros) por cenario.
_RANGES = {
    Scenario.NORMAL: (800.0, 1500.0),
    Scenario.PICO: (4000.0, 8000.0),
}


def should_publish(scenario: Scenario) -> bool:
    """No cenario de silencio o sensor para de publicar (exercita 'sem dados recentes')."""
    return scenario is not Scenario.SILENCIO


def next_value(scenario: Scenario, rng: random.Random | None = None) -> float:
    """Gera o proximo valor de consumo conforme o cenario."""
    if scenario is Scenario.SILENCIO:
        raise ValueError("cenario de silencio nao gera leitura")
    r = rng or random
    low, high = _RANGES[scenario]
    return round(r.uniform(low, high), 2)
