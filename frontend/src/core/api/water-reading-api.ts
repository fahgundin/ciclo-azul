import type { ManualReadingInput, WaterReadingView } from '@ciclo-azul/contracts';
import { HttpClient, type TokenProvider } from './http';

/** Cliente de API das leituras de consumo de agua (R04). Camada core/ — agnostica de UI. */
export class WaterReadingApi {
  private readonly http: HttpClient;

  constructor(baseUrl: string, getToken: TokenProvider) {
    this.http = new HttpClient(baseUrl, getToken);
  }

  /** Lanca uma leitura manual (Operador), para unidade sem sensor. */
  registerManual(input: ManualReadingInput): Promise<WaterReadingView> {
    return this.http.post<WaterReadingView>('/water-readings/manual', input);
  }

  /** Historico de uma unidade (sensor e manual), da leitura mais recente a mais antiga. */
  listByUnit(unitId: string): Promise<WaterReadingView[]> {
    return this.http.get<WaterReadingView[]>(
      `/water-readings?unitId=${encodeURIComponent(unitId)}`,
    );
  }
}
