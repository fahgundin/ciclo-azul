import type { CreateWasteTypeInput, WasteTypeView } from '@ciclo-azul/contracts';
import { ApiError } from './api-error';

/** Provedor de token de acesso (injetado pela UI a partir do fluxo OIDC). */
export type TokenProvider = () => string | null;

/**
 * Cliente de API dos tipos de residuo (R07). Camada core/ — agnostica de UI.
 *
 * Envia o token Bearer em cada chamada e traduz a resposta de erro do backend
 * (ex.: 400 com a mensagem de classificacao obrigatoria) em ApiError, para a UI
 * exibir a mensagem exata.
 */
export class WasteTypeApi {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: TokenProvider,
  ) {}

  async list(): Promise<WasteTypeView[]> {
    const res = await fetch(`${this.baseUrl}/waste-types`, {
      headers: this.authHeaders(),
    });
    await this.ensureOk(res);
    return (await res.json()) as WasteTypeView[];
  }

  async create(input: CreateWasteTypeInput): Promise<WasteTypeView> {
    const res = await fetch(`${this.baseUrl}/waste-types`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    await this.ensureOk(res);
    return (await res.json()) as WasteTypeView;
  }

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** Lanca ApiError com a mensagem do backend quando a resposta nao e ok. */
  private async ensureOk(res: Response): Promise<void> {
    if (res.ok) {
      return;
    }
    let message = `Erro ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // corpo sem JSON: mantem a mensagem padrao
    }
    throw new ApiError(message, res.status);
  }
}
