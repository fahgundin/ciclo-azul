"""Testes do publisher do mock usando um client MQTT falso (sem broker)."""

import json
import random

import pytest

from mock_sensors.publisher import run
from mock_sensors.scenarios import Scenario, next_value, should_publish


class FakeClient:
    """Captura as chamadas de publish em vez de falar com um broker real."""

    def __init__(self):
        self.published: list[tuple[str, str, int]] = []

    def publish(self, topic, payload, qos=0):
        self.published.append((topic, payload, qos))


def test_cenario_silencio_nao_publica():
    client = FakeClient()
    run(client, ["data-center-sp-01"], Scenario.SILENCIO, interval=0, max_cycles=3)
    assert client.published == []


def test_cenario_normal_publica_para_cada_unidade_por_ciclo():
    client = FakeClient()
    units = ["u1", "u2"]
    run(client, units, Scenario.NORMAL, interval=0, max_cycles=2)
    # 2 unidades x 2 ciclos = 4 publicacoes
    assert len(client.published) == 4
    topics = {t for (t, _p, _q) in client.published}
    assert "ciclo-azul/v1/sensors/u1/water-consumption" in topics
    assert "ciclo-azul/v1/sensors/u2/water-consumption" in topics


def test_sequence_incrementa_por_unidade():
    client = FakeClient()
    run(client, ["u1"], Scenario.NORMAL, interval=0, max_cycles=3)
    seqs = [json.loads(p)["sequence"] for (_t, p, _q) in client.published]
    assert seqs == [1, 2, 3]


def test_payload_respeita_contrato_e_qos1():
    client = FakeClient()
    run(client, ["u1"], Scenario.PICO, interval=0, max_cycles=1)
    topic, payload, qos = client.published[0]
    assert qos == 1
    data = json.loads(payload)
    assert data["metric"] == "water-consumption"
    assert data["unit"] == "liter"
    assert data["value"] >= 0


def test_valor_pico_e_maior_que_normal_em_media():
    rng = random.Random(42)
    normal = sum(next_value(Scenario.NORMAL, rng) for _ in range(50)) / 50
    pico = sum(next_value(Scenario.PICO, rng) for _ in range(50)) / 50
    assert pico > normal


def test_next_value_silencio_levanta():
    assert should_publish(Scenario.SILENCIO) is False
    with pytest.raises(ValueError):
        next_value(Scenario.SILENCIO)
