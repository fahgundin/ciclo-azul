import type { HealthStatus } from '../domain/health';

/**
 * Cliente de API da camada core/.
 *
 * REGRA: core/ e agnostico de plataforma e NAO importa nada de ui/. Esta camada
 * (API client, realtime, auth, hooks de dados) e a candidata a reuso numa futura
 * migracao para React Native. Ver AGENTS.md secao 1 e ADR 0005.
 */
export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async getHealth(): Promise<HealthStatus> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Falha ao consultar health: ${response.status}`);
    }
    return (await response.json()) as HealthStatus;
  }
}
