import type {
  SensorView,
  WasteLotView,
  WasteTypeView,
  WaterReadingView,
} from '@ciclo-azul/contracts';
import type { SensorApi } from '../api/sensor-api';
import type { WasteLotApi } from '../api/waste-lot-api';
import type { WasteTypeApi } from '../api/waste-type-api';
import type { WaterReadingApi } from '../api/water-reading-api';

/** Dados brutos usados para montar um relatorio. */
export interface ReportSourceData {
  sensors: SensorView[];
  readingsByUnit: Record<string, WaterReadingView[]>;
  lots: WasteLotView[];
  wasteTypes: WasteTypeView[];
}

/** Porta de onde o relatorio busca os dados (hoje: as APIs reais; amanha: um endpoint de relatorio). */
export interface ReportDataSource {
  collect(): Promise<ReportSourceData>;
}

interface ApiReportDataSourceDeps {
  sensorApi: Pick<SensorApi, 'list'>;
  readingApi: Pick<WaterReadingApi, 'listByUnit'>;
  lotApi: Pick<WasteLotApi, 'list'>;
  wasteApi: Pick<WasteTypeApi, 'list'>;
}

/**
 * Fonte de dados do relatorio sobre as APIs REST existentes (R04, R06, R07).
 *
 * LIMITE CONHECIDO: nao ha cadastro de unidades; so entram no relatorio as
 * unidades que tem sensor vinculado. Unidades que so tem leitura manual ficam de fora.
 */
export class ApiReportDataSource implements ReportDataSource {
  constructor(private readonly deps: ApiReportDataSourceDeps) {}

  async collect(): Promise<ReportSourceData> {
    const [sensors, lots, wasteTypes] = await Promise.all([
      this.deps.sensorApi.list(),
      this.deps.lotApi.list(),
      this.deps.wasteApi.list(),
    ]);
    const unitIds = [...new Set(sensors.map((sensor) => sensor.unitId))];
    const histories = await Promise.all(unitIds.map((id) => this.deps.readingApi.listByUnit(id)));
    const readingsByUnit: Record<string, WaterReadingView[]> = {};
    unitIds.forEach((id, index) => {
      readingsByUnit[id] = histories[index] ?? [];
    });
    return { sensors, readingsByUnit, lots, wasteTypes };
  }
}
