import type { UnitConsumptionStatus } from '@ciclo-azul/contracts';
import { HttpClient, type TokenProvider } from './http';

/** Cliente de API do estado de consumo por unidade (R05). Camada core/ — agnostica de UI. */
export class WaterStatusApi {
  private readonly http: HttpClient;

  constructor(baseUrl: string, getToken: TokenProvider) {
    this.http = new HttpClient(baseUrl, getToken);
  }

  /** Estado atual de todas as unidades conhecidas (com sensor ou com leitura), ordenado por unidade. */
  list(): Promise<UnitConsumptionStatus[]> {
    return this.http.get<UnitConsumptionStatus[]>('/water-status');
  }
}
