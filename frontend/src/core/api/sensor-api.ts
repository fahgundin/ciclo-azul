import type { LinkSensorInput, SensorView } from '@ciclo-azul/contracts';
import { HttpClient, type TokenProvider } from './http';

/** Cliente de API dos sensores IoT (R04). Camada core/ — agnostica de UI. */
export class SensorApi {
  private readonly http: HttpClient;

  constructor(baseUrl: string, getToken: TokenProvider) {
    this.http = new HttpClient(baseUrl, getToken);
  }

  /** Sensores vinculados, de todas as unidades. */
  list(): Promise<SensorView[]> {
    return this.http.get<SensorView[]>('/sensors');
  }

  /** Vincula um sensor a uma unidade (Operador/Administrador). */
  link(input: LinkSensorInput): Promise<SensorView> {
    return this.http.post<SensorView>('/sensors', input);
  }
}
