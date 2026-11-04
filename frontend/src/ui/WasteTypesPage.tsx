import { useEffect, useState, type FormEvent } from 'react';
import type { WasteTypeView } from '@ciclo-azul/contracts';
import type { WasteTypeApi } from '../core/api/waste-type-api';
import { ApiError } from '../core/api/api-error';

/**
 * Tela de cadastro e listagem de tipos de residuo (R07).
 *
 * Componente de UI (web): consome o WasteTypeApi de core/. Exibe a mensagem exata
 * de erro vinda do backend (ex.: classificacao obrigatoria).
 */
export function WasteTypesPage({ api }: { api: WasteTypeApi }): JSX.Element {
  const [items, setItems] = useState<WasteTypeView[]>([]);
  const [name, setName] = useState('');
  const [classification, setClassification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh(): Promise<void> {
    try {
      setItems(await api.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar os tipos de resíduo');
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.create({ name, classification });
      setName('');
      setClassification('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cadastrar o tipo de resíduo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h1>Tipos de resíduo</h1>

      <form onSubmit={handleSubmit} aria-label="Cadastrar tipo de resíduo">
        <label>
          Nome
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Classificação
          <input
            name="classification"
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
          />
        </label>
        <button type="submit" disabled={loading}>
          Cadastrar
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      <ul aria-label="Tipos cadastrados">
        {items.map((item) => (
          <li key={item.id}>
            {item.name} — {item.classification}
          </li>
        ))}
      </ul>
    </section>
  );
}
