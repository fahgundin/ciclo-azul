/**
 * Isola os testes do ambiente do desenvolvedor.
 *
 * Quem exporta o .env no terminal (DATABASE_URL, MQTT_URL...) faria os modulos
 * escolherem Postgres/MQTT reais em vez dos adapters in-memory usados nos testes.
 * Aqui garantimos o modo "sem banco, sem broker", igual ao do CI.
 */
delete process.env.DATABASE_URL;
process.env.MQTT_INGESTION_ENABLED = 'false';
