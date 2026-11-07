import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WasteLotView, WasteTypeView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { WasteLotApi } from '../../core/api/waste-lot-api';
import type { WasteTypeApi } from '../../core/api/waste-type-api';
import { formatDateUtc, formatNumber } from '../../core/format';
import {
  isOverdue,
  lotDueDate,
  type PendingLot,
  type PendingLotStore,
} from '../../core/waste/pending-lot';
import { Dialog } from '../components/Dialog';
import { useFlash } from '../components/Flash';
import { Icon } from '../components/Icon';
import '../styles/components.css';
import { DisposalForm } from './DisposalForm';
import { PendingLotForm } from './PendingLotForm';

interface WasteLotsPanelProps {
  lotApi: WasteLotApi;
  wasteApi: WasteTypeApi;
  /** ADAPTER EM MEMORIA dos lotes aguardando destinacao (R08). */
  pendingStore: PendingLotStore;
  /** Relogio e intervalo de atualizacao da etiqueta de prazo, injetaveis (testes). */
  now?: () => Date;
  tickMs?: number;
}

/** A cada quantos ms a etiqueta "No prazo"/"Prazo vencido" e recalculada. */
export const DEFAULT_DEADLINE_TICK_MS = 60_000;

/**
 * Lotes de residuo com destinacao registrada (R06), sobre a API real.
 *
 * O backend so tem lotes JA destinados (registrar a destinacao cria o lote com
 * status "Destinado"): nao ha lotes pendentes, prazo, nem 2a confirmacao. Ver
 * docs/migracao-frontend.md, "Lacunas do R06".
 */
export function WasteLotsPanel({
  lotApi,
  wasteApi,
  pendingStore,
  now = () => new Date(),
  tickMs = DEFAULT_DEADLINE_TICK_MS,
}: WasteLotsPanelProps): JSX.Element {
  const flash = useFlash();
  // Relogio da tela: sem ele, um lote que vence com a tela aberta continuaria "No prazo".
  const nowRef = useRef(now);
  nowRef.current = now;
  const [clock, setClock] = useState(() => now());
  useEffect(() => {
    const id = setInterval(() => setClock(nowRef.current()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  const [lots, setLots] = useState<WasteLotView[]>([]);
  const [types, setTypes] = useState<WasteTypeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Dialogo aberto: destinacao (opcionalmente de um lote pendente) ou novo lote pendente.
  const [dialog, setDialog] = useState<
    { kind: 'disposal'; pending?: PendingLot } | { kind: 'new-lot' } | null
  >(null);
  const [pending, setPending] = useState<PendingLot[]>(() => pendingStore.list());

  const load = useCallback(async () => {
    try {
      const [loadedLots, loadedTypes] = await Promise.all([lotApi.list(), wasteApi.list()]);
      setLots(loadedLots);
      setTypes(loadedTypes);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar os lotes');
    } finally {
      setLoading(false);
    }
  }, [lotApi, wasteApi]);

  useEffect(() => {
    void load();
  }, [load]);

  const typeName = useMemo(() => {
    const names = new Map(types.map((type) => [type.id, type.name]));
    return (id: string): string => names.get(id) ?? 'Tipo de resíduo removido';
  }, [types]);

  const sorted = useMemo(() => [...lots].sort((a, b) => b.date.localeCompare(a.date)), [lots]);

  return (
    <section className="page">
      <h1>Destinação de lotes</h1>

      <div className="actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setDialog({ kind: 'disposal' })}
        >
          <Icon name="plus" />
          Registrar destinação
        </button>
      </div>

      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}

      <section className="page__section" aria-labelledby="pending-lots-title">
        <h2 id="pending-lots-title">Aguardando destinação</h2>
        <p className="hint">
          Lotes gerados e ainda sem destinação ficam só neste navegador (adapter em memória): o
          backend ainda não tem lotes pendentes nem prazo (R08).
        </p>
        <div className="actions">
          <button type="button" className="btn" onClick={() => setDialog({ kind: 'new-lot' })}>
            <Icon name="plus" />
            Novo lote
          </button>
        </div>
        {pending.length === 0 ? (
          <p className="list-empty">Nenhum lote aguardando destinação.</p>
        ) : (
          <ul className="glass list" aria-label="Lotes aguardando destinação">
            {pending.map((lot) => {
              const overdue = isOverdue(lot, clock);
              return (
                <li key={lot.id}>
                  <div className="item__title">
                    {lot.id} · {typeName(lot.wasteTypeId)}
                  </div>
                  <div className="item__meta">
                    Quantidade {formatNumber(lot.quantity)} · prazo até{' '}
                    {formatDateUtc(lotDueDate(lot).toISOString())}
                  </div>
                  <span className={overdue ? 'tag tag--warn' : 'tag'}>
                    <Icon name={overdue ? 'alert' : 'info'} size={14} />
                    {overdue ? 'Prazo vencido' : 'No prazo'}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setDialog({ kind: 'disposal', pending: lot })}
                    >
                      Registrar destinação
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <h2>Destinados</h2>

      {loading ? (
        <p className="hint">Carregando…</p>
      ) : sorted.length === 0 ? (
        !error && <p className="list-empty">Nenhum lote com destinação registrada ainda.</p>
      ) : (
        <ul className="glass list" aria-label="Lotes com destinação registrada">
          {sorted.map((lot) => (
            <li key={lot.id}>
              <div className="item__title">{typeName(lot.wasteTypeId)}</div>
              <div className="item__meta">
                Quantidade {formatNumber(lot.quantity)} · {formatDateUtc(lot.date)}
              </div>
              <div className="item__meta">
                {lot.receiverCompany} · {lot.location}
              </div>
              <div className="item__meta">
                Licença {lot.license} · Comprovante: {lot.proofReference}
              </div>
              <span className="tag">
                <Icon name="check" size={14} />
                Destinado
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialog?.kind === 'disposal'}
        title="Registrar destinação"
        onClose={() => setDialog(null)}
      >
        <DisposalForm
          api={lotApi}
          wasteTypes={types}
          now={now}
          initial={
            dialog?.kind === 'disposal' && dialog.pending
              ? { wasteTypeId: dialog.pending.wasteTypeId, quantity: dialog.pending.quantity }
              : undefined
          }
          onRegistered={() => {
            if (dialog?.kind === 'disposal' && dialog.pending) {
              pendingStore.remove(dialog.pending.id);
              setPending(pendingStore.list());
            }
            flash('Destinação registrada. O lote consta como Destinado.');
            void load();
          }}
          onClose={() => setDialog(null)}
        />
      </Dialog>

      <Dialog open={dialog?.kind === 'new-lot'} title="Novo lote" onClose={() => setDialog(null)}>
        <PendingLotForm
          wasteTypes={types}
          onAdd={(lot) => {
            pendingStore.add(lot, now());
            setPending(pendingStore.list());
            flash('Lote criado. Ele aguarda a destinação.');
          }}
          onClose={() => setDialog(null)}
        />
      </Dialog>
    </section>
  );
}
