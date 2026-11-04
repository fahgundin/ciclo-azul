import type { IconName } from '../../core/navigation/routes';

/** Icones usados so pela UI (alem dos da navegacao, definidos em core/). */
export type UiIconName = IconName | 'logout' | 'x' | 'info' | 'alert' | 'check';

/* Icones de traco, 24x24 (desenhos do prototipo, tracos arredondados). */
const PATHS: Record<UiIconName, string> = {
  home: 'M3 11 12 4l9 7M5 10v10h5v-6h4v6h5V10',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z',
  flask: 'M9 3h6M10 3v6L4.5 19a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L14 9V3M7.5 14h9',
  sensor:
    'M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3Z',
  file: 'M14 3H6v18h12V7l-4-4ZM14 3v4h4M9 12h6M9 16h4',
  users:
    'M6 8a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5M18 14.5A6 6 0 0 1 21 20',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  logout: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  x: 'm6 6 12 12M18 6 6 18',
  info: 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0ZM12 11v5.5M12 7.8v.1',
  alert: 'M12 3.5 2.5 20h19L12 3.5ZM12 10v4.5M12 17.4v.1',
  check: 'm5 12.5 4.5 4.5L19 7.5',
};

/** Icone decorativo (aria-hidden): o texto acessivel fica no elemento que o contem. */
export function Icon({ name, size = 20 }: { name: UiIconName; size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
