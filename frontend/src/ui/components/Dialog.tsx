import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Dialogo modal sobre o elemento <dialog> nativo (foco preso, Esc fecha, clique
 * fora fecha). O conteudo so e montado enquanto aberto.
 */
export function Dialog({ open, title, onClose, children }: DialogProps): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (open && !el.open) {
      // Ambientes sem suporte ao <dialog> modal (ex.: jsdom) caem no atributo `open`.
      if (typeof el.showModal === 'function') {
        el.showModal();
      } else {
        el.setAttribute('open', '');
      }
    } else if (!open && el.open) {
      if (typeof el.close === 'function') {
        el.close();
      } else {
        el.removeAttribute('open');
      }
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // Clique no fundo (backdrop), nao no conteudo.
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {open && (
        <>
          <div className="sheet__head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="sheet__close" aria-label="Fechar" onClick={onClose}>
              <Icon name="x" />
            </button>
          </div>
          <div className="sheet__body">{children}</div>
        </>
      )}
    </dialog>
  );
}
