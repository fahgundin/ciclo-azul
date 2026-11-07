import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSessionStores } from './useSessionStores';

describe('useSessionStores', () => {
  it('mantem os mesmos adapters enquanto a sessao e a mesma (ex.: token renovado)', () => {
    const { result, rerender } = renderHook(({ key }) => useSessionStores(key), {
      initialProps: { key: 'marina@ciclo.azul' as string | null },
    });
    const first = result.current;
    first.limitStore.save({ general: 500, units: {} });

    rerender({ key: 'marina@ciclo.azul' });

    expect(result.current).toBe(first);
    expect(result.current.limitStore.get().general).toBe(500);
  });

  it('recria os adapters ao sair (limites e lotes nao vazam para a proxima sessao)', () => {
    const { result, rerender } = renderHook(({ key }) => useSessionStores(key), {
      initialProps: { key: 'marina@ciclo.azul' as string | null },
    });
    const first = result.current;
    first.limitStore.save({ general: 500, units: {} });
    first.appliedStore.apply('purge-dc-sp1');

    rerender({ key: null });
    rerender({ key: 'marina@ciclo.azul' });

    expect(result.current).not.toBe(first);
    expect(result.current.limitStore.get().general).toBeNull();
    expect(result.current.appliedStore.has('purge-dc-sp1')).toBe(false);
  });

  it('recria os adapters ao trocar de usuario', () => {
    const { result, rerender } = renderHook(({ key }) => useSessionStores(key), {
      initialProps: { key: 'a@ciclo.azul' as string | null },
    });
    const first = result.current;
    rerender({ key: 'b@ciclo.azul' });
    expect(result.current).not.toBe(first);
  });
});
