# Imagem do mock de sensores (servico opcional do Docker Compose).
# Publica leituras no broker MQTT conforme docs/contrato-iot.md.
FROM python:3.12-slim

WORKDIR /app

# Instala dependencias primeiro (cache de camada).
COPY pyproject.toml ./
COPY mock_sensors ./mock_sensors
RUN pip install --no-cache-dir .

# Executa o publisher. O host do broker vem de MQTT_BROKER (default definido no compose).
CMD ["python", "-m", "mock_sensors.publisher"]
