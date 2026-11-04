import type { WasteTypeApi } from '../core/api/waste-type-api';
import { WasteTypesPage } from './WasteTypesPage';
import type { PageRegistry } from './shell/AppShell';

interface PageDependencies {
  wasteApi: WasteTypeApi;
}

/**
 * Registro das telas ja implementadas, por caminho de rota (ver core/navigation).
 *
 * Para entregar uma tela da migracao: crie a pagina em ui/ e registre-a aqui.
 * Ela passa a aparecer no menu dos perfis que tem permissao para a rota.
 */
export function buildPages({ wasteApi }: PageDependencies): PageRegistry {
  return {
    '/residuos': <WasteTypesPage api={wasteApi} />,
  };
}
