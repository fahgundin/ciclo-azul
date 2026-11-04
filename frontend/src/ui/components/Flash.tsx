import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Icon } from './Icon';

export type FlashLevel = 'info' | 'warn';

type ShowFlash = (message: string, level?: FlashLevel) => void;

const FlashContext = createContext<ShowFlash>(() => undefined);

/** Quanto tempo (ms) o aviso fica na tela. */
export const FLASH_DURATION_MS = 4000;

/**
 * Aviso rapido (toast). Provedor + hook `useFlash()`. A regiao `role="status"`
 * fica sempre no DOM para que leitores de tela anunciem as mensagens.
 */
export function FlashProvider({ children }: { children: ReactNode }): JSX.Element {
  const [flash, setFlash] = useState<{ message: string; level: FlashLevel } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback<ShowFlash>((message, level = 'info') => {
    clearTimeout(timer.current);
    setFlash({ message, level });
    timer.current = setTimeout(() => setFlash(null), FLASH_DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => show, [show]);

  return (
    <FlashContext.Provider value={value}>
      {children}
      <div className="flash-region" role="status" aria-live="polite">
        {flash && (
          <p className={`flash flash--${flash.level}`}>
            <Icon name={flash.level === 'warn' ? 'alert' : 'info'} size={18} />
            {flash.message}
          </p>
        )}
      </div>
    </FlashContext.Provider>
  );
}

/** Dispara um aviso rapido. Fora de um FlashProvider nao faz nada. */
export function useFlash(): ShowFlash {
  return useContext(FlashContext);
}
