import { useState } from 'react';
import type { WasteLotApi } from '../../core/api/waste-lot-api';
import type { WasteTypeApi } from '../../core/api/waste-type-api';
import type { PendingLotStore } from '../../core/waste/pending-lot';
import { WasteTypesPage } from '../WasteTypesPage';
import '../styles/components.css';
import { WasteLotsPanel } from './WasteLotsPanel';

type Tab = 'lots' | 'types';

const TABS: { id: Tab; label: string }[] = [
  { id: 'lots', label: 'Destinação de lotes' },
  { id: 'types', label: 'Tipos de resíduo' },
];

interface WastePageProps {
  wasteApi: WasteTypeApi;
  lotApi: WasteLotApi;
  /** ADAPTER EM MEMORIA dos lotes aguardando destinacao (R08). */
  pendingStore: PendingLotStore;
  /** Relogio injetavel (testes). */
  now?: () => Date;
}

/**
 * Tela de residuos: abas "Destinacao de lotes" (R06) e "Tipos de residuo" (R07).
 * So a aba ativa fica montada, entao ao voltar para os lotes a lista de tipos
 * (usada no formulario) e recarregada.
 */
export function WastePage({ wasteApi, lotApi, pendingStore, now }: WastePageProps): JSX.Element {
  const [tab, setTab] = useState<Tab>('lots');

  return (
    <div>
      <div className="tabs" role="tablist" aria-label="Resíduos">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`waste-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="waste-tabpanel"
            className="tabs__tab"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="waste-tabpanel" aria-labelledby={`waste-tab-${tab}`}>
        {tab === 'lots' ? (
          <WasteLotsPanel
            lotApi={lotApi}
            wasteApi={wasteApi}
            pendingStore={pendingStore}
            now={now}
          />
        ) : (
          <WasteTypesPage api={wasteApi} />
        )}
      </div>
    </div>
  );
}
