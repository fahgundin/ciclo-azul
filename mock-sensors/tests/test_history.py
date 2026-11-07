"""Testes do historico sintetico (backfill), sem broker."""

import json
import random
from datetime import UTC, datetime, timedelta

from mock_sensors.history import BASE_VALUE_LITERS, build_history, daily_factor
from mock_sensors.publisher import backfill, run
from mock_sensors.scenarios import Scenario

NOW = datetime(2026, 11, 7, 12, 0, tzinfo=UTC)


class FakeClient:
    def __init__(self):
        self.published: list[tuple[str, str, int]] = []

    def publish(self, topic, payload, qos=0):
        self.published.append((topic, payload, qos))


def test_historico_de_24h_a_cada_15_min_gera_96_leituras():
    history = build_history(NOW, hours=24, step_minutes=15, rng=random.Random(1))
    assert len(history) == 96


def test_historico_cobre_24h_em_ordem_crescente_e_termina_antes_de_agora():
    history = build_history(NOW, hours=24, step_minutes=15, rng=random.Random(1))
    timestamps = [r.timestamp for r in history]
    assert timestamps == sorted(timestamps)
    assert len(set(timestamps)) == len(timestamps)
    assert history[0].timestamp == NOW - timedelta(hours=24)
    assert history[-1].timestamp == NOW - timedelta(minutes=15)
    assert all(t < NOW for t in timestamps)


def test_sequencias_vao_de_1_a_n():
    history = build_history(NOW, hours=24, step_minutes=15, rng=random.Random(1))
    assert [r.sequence for r in history] == list(range(1, 97))


def test_valores_positivos_e_proximos_da_faixa_do_cenario_normal():
    history = build_history(NOW, hours=24, step_minutes=15, rng=random.Random(1))
    assert all(r.value > 0 for r in history)
    average = sum(r.value for r in history) / len(history)
    assert abs(average - BASE_VALUE_LITERS) < BASE_VALUE_LITERS * 0.05


def test_consumo_e_maior_a_tarde_do_que_de_madrugada():
    # Pico as 18h UTC (15h em Sao Paulo); minimo as 6h UTC.
    peak = datetime(2026, 11, 7, 18, 0, tzinfo=UTC)
    trough = datetime(2026, 11, 7, 6, 0, tzinfo=UTC)
    assert daily_factor(peak) > daily_factor(trough)


def test_mesma_semente_gera_o_mesmo_historico():
    a = build_history(NOW, 24, 15, random.Random(7))
    b = build_history(NOW, 24, 15, random.Random(7))
    assert a == b


def test_horas_ou_passo_nao_positivos_geram_historico_vazio():
    assert build_history(NOW, hours=0, step_minutes=15) == []
    assert build_history(NOW, hours=24, step_minutes=0) == []
    assert build_history(NOW, hours=-1, step_minutes=15) == []


def test_backfill_publica_com_timestamp_passado_qos1_e_contrato_v1():
    client = FakeClient()
    backfill(client, ["u1"], hours=24, step_minutes=15, now=NOW, rng=random.Random(1))
    assert len(client.published) == 96
    topic, payload, qos = client.published[0]
    assert topic == "ciclo-azul/v1/sensors/u1/water-consumption"
    assert qos == 1
    data = json.loads(payload)
    assert data["schemaVersion"] == "1.0"
    assert data["sensorId"] == "mock-u1"
    assert data["readingType"] == "sensor"
    assert datetime.fromisoformat(data["timestamp"]) == NOW - timedelta(hours=24)


def test_backfill_cobre_cada_unidade_e_devolve_a_ultima_sequencia():
    client = FakeClient()
    sequences = backfill(client, ["u1", "u2"], 24, 15, now=NOW, rng=random.Random(1))
    assert len(client.published) == 192
    assert sequences == {"u1": 96, "u2": 96}


def test_backfill_desligado_nao_publica_nada():
    client = FakeClient()
    assert backfill(client, ["u1"], hours=0, step_minutes=15, now=NOW) == {"u1": 0}
    assert client.published == []


def test_leitura_ao_vivo_continua_a_sequencia_do_historico():
    client = FakeClient()
    sequences = backfill(client, ["u1"], 24, 15, now=NOW, rng=random.Random(1))
    live = FakeClient()
    run(live, ["u1"], Scenario.NORMAL, interval=0, max_cycles=2, initial_sequences=sequences)
    seqs = [json.loads(p)["sequence"] for (_t, p, _q) in live.published]
    assert seqs == [97, 98]


def test_leitura_ao_vivo_continua_com_timestamp_atual():
    client = FakeClient()
    run(client, ["u1"], Scenario.NORMAL, interval=0, max_cycles=1)
    moment = datetime.fromisoformat(json.loads(client.published[0][1])["timestamp"])
    assert abs((datetime.now(UTC) - moment).total_seconds()) < 5
