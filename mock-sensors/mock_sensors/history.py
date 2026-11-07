"""Historico sintetico de consumo (backfill) para o mock de sensores.

Gera leituras passadas com aparencia realista: perfil diario (menos consumo de madrugada,
pico no meio da tarde, quando a carga de refrigeracao e maior), ruido aleatorio e
periodicidade fixa. Serve para a unidade ja nascer com historico (ex.: demonstracoes
que exigem mais de 24 h de dados).

A logica e pura (sem MQTT): recebe `now` e um `random.Random`, o que permite testes
deterministicos.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

# Valor medio por leitura, o mesmo do cenario "normal" (ponto medio de 800-1500 L).
BASE_VALUE_LITERS = 1150.0
# Hora UTC do pico de consumo (15h em Sao Paulo, UTC-3).
PEAK_HOUR_UTC = 18.0
# Variacao do perfil diario: o fator oscila entre 1 - amplitude e 1 + amplitude.
DAILY_AMPLITUDE = 0.35
# Ruido aleatorio por leitura (fracao do valor).
NOISE_RATIO = 0.06


@dataclass(frozen=True)
class HistoricalReading:
    """Uma leitura passada a ser publicada."""

    timestamp: datetime
    value: float
    sequence: int


def daily_factor(moment: datetime) -> float:
    """Fator multiplicativo do perfil diario (cosseno com pico em PEAK_HOUR_UTC)."""
    utc = moment.astimezone(UTC)
    hour = utc.hour + utc.minute / 60 + utc.second / 3600
    return 1 + DAILY_AMPLITUDE * math.cos(2 * math.pi * (hour - PEAK_HOUR_UTC) / 24)


def build_history(
    now: datetime,
    hours: float,
    step_minutes: float,
    rng: random.Random | None = None,
) -> list[HistoricalReading]:
    """Gera as leituras das ultimas `hours` horas, da mais antiga para a mais recente.

    A ultima leitura fica estritamente antes de `now`, e as sequencias vao de 1 a N (a
    publicacao ao vivo continua a partir de N + 1). `hours` ou `step_minutes` nao
    positivos geram historico vazio.
    """
    if hours <= 0 or step_minutes <= 0:
        return []
    r = rng or random
    step = timedelta(minutes=step_minutes)
    count = int(hours * 60 // step_minutes)
    readings: list[HistoricalReading] = []
    for index in range(count):
        moment = now - step * (count - index)
        noise = 1 + r.uniform(-NOISE_RATIO, NOISE_RATIO)
        value = round(BASE_VALUE_LITERS * daily_factor(moment) * noise, 2)
        readings.append(HistoricalReading(timestamp=moment, value=value, sequence=index + 1))
    return readings
