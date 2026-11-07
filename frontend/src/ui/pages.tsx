import type { SensorApi } from '../core/api/sensor-api';
import type { WasteLotApi } from '../core/api/waste-lot-api';
import type { WasteTypeApi } from '../core/api/waste-type-api';
import type { WaterReadingApi } from '../core/api/water-reading-api';
import type { WaterStatusApi } from '../core/api/water-status-api';
import type { AppliedStore } from '../core/reuse/opportunities';
import type { LimitStore } from '../core/limits/limits';
import type { PendingLotStore } from '../core/waste/pending-lot';
import type { ReportDataSource } from '../core/reports/report-data-source';
import { AlertsPage } from './alerts/AlertsPage';
import { ReusePage } from './reuse/ReusePage';
import { ReportsPage } from './reports/ReportsPage';
import { SensorsPage } from './sensors/SensorsPage';
import { WaterPage } from './water/WaterPage';
import type { RealtimeLike } from './water/useWaterStatus';
import { WastePage } from './waste/WastePage';
import type { PageRegistry } from './shell/AppShell';

interface PageDependencies {
  wasteApi: WasteTypeApi;
  lotApi: WasteLotApi;
  reportSource: ReportDataSource;
  limitStore: LimitStore;
  appliedStore: AppliedStore;
  pendingLotStore: PendingLotStore;
  waterStatusApi: WaterStatusApi;
  createRealtime: () => RealtimeLike;
  getToken: () => string | null;
  sensorApi: SensorApi;
  readingApi: WaterReadingApi;
}

/**
 * Registro das telas ja implementadas, por caminho de rota (ver core/navigation).
 *
 * Para entregar uma tela da migracao: crie a pagina em ui/ e registre-a aqui.
 * Ela passa a aparecer no menu dos perfis que tem permissao para a rota.
 */
export function buildPages({
  wasteApi,
  lotApi,
  reportSource,
  limitStore,
  appliedStore,
  pendingLotStore,
  waterStatusApi,
  createRealtime,
  getToken,
  sensorApi,
  readingApi,
}: PageDependencies): PageRegistry {
  return {
    '/residuos': <WastePage wasteApi={wasteApi} lotApi={lotApi} pendingStore={pendingLotStore} />,
    '/agua': (
      <WaterPage
        statusApi={waterStatusApi}
        readingApi={readingApi}
        createRealtime={createRealtime}
        getToken={getToken}
      />
    ),
    '/alertas': (
      <AlertsPage
        statusApi={waterStatusApi}
        readingApi={readingApi}
        wasteApi={wasteApi}
        createRealtime={createRealtime}
        getToken={getToken}
        limitStore={limitStore}
        pendingLotStore={pendingLotStore}
      />
    ),
    '/insights': (
      <ReusePage statusApi={waterStatusApi} readingApi={readingApi} appliedStore={appliedStore} />
    ),
    '/relatorios': <ReportsPage source={reportSource} />,
    '/sensores': <SensorsPage sensorApi={sensorApi} readingApi={readingApi} />,
  };
}
