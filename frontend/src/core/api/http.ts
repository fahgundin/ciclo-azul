import { ApiError } from './api-error';

/** Provedor de token de acesso (injetado pela UI a partir do fluxo OIDC). */
export type TokenProvider = () => string | null;

/**
 * Cliente HTTP JSON da camada core/ (agnostico de UI).
 *
 * Envia o token Bearer em cada chamada e traduz respostas de erro do backend
 * (400/409 com `message`) em ApiError, para a UI exibir a mensagem exata.
 */
export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: TokenProvider,
  ) {}

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.authHeaders() });
    await this.ensureOk(res);
    return (await res.json()) as T;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await this.ensureOk(res);
    return (await res.json()) as T;
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
