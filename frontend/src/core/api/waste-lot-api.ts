import type { RegisterDisposalInput, WasteLotView } from '@ciclo-azul/contracts';
import { HttpClient, type TokenProvider } from './http';

/** Cliente de API de lotes de residuo e destinacao (R06). Camada core/ — agnostica de UI. */
export class WasteLotApi {
  private readonly http: HttpClient;

  constructor(baseUrl: string, getToken: TokenProvider) {
    this.http = new HttpClient(baseUrl, getToken);
  }

  /** Lotes com destinacao registrada. */
  list(): Promise<WasteLotView[]> {
    return this.http.get<WasteLotView[]>('/waste-lots');
  }

  /** Registra a destinacao de um lote (Gestor Ambiental); o lote nasce "Destinado". */
  register(input: RegisterDisposalInput): Promise<WasteLotView> {
    return this.http.post<WasteLotView>('/waste-lots', input);
  }
}
