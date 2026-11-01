import { useEffect, useState } from 'react';
import { ApiClient } from '../core/api/api-client';

/**
 * Componente de UI (web). Consome a camada core/ (ApiClient).
 *
 * REGRA: ui/ pode importar de core/, mas core/ NUNCA importa de ui/.
 */
const api = new ApiClient(import.meta.env.VITE_API_URL ?? 'http://localhost:3000');

export function App(): JSX.Element {
  const [status, setStatus] = useState<string>('...');

  useEffect(() => {
    api
      .getHealth()
      .then((h) => setStatus(h.status))
      .catch(() => setStatus('indisponivel'));
  }, []);

  return (
    <main>
      <h1>Ciclo Azul</h1>
      <p>Status do backend: {status}</p>
    </main>
  );
}
