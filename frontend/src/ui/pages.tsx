import type { SensorApi } from '../core/api/sensor-api';
import type { WasteLotApi } from '../core/api/waste-lot-api';
import type { WasteTypeApi } from '../core/api/waste-type-api';
import type { WaterReadingApi } from '../core/api/water-reading-api';
import { SensorsPage } from './sensors/SensorsPage';
import { WastePage } from './waste/WastePage';
import type { PageRegistry } from './shell/AppShell';

interface PageDependencies {
  wasteApi: WasteTypeApi;
  lotApi: WasteLotApi;
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
  sensorApi,
  readingApi,
}: PageDependencies): PageRegistry {
  return {
    '/residuos': <WastePage wasteApi={wasteApi} lotApi={lotApi} />,
    '/sensores': <SensorsPage sensorApi={sensorApi} readingApi={readingApi} />,
  };
}
