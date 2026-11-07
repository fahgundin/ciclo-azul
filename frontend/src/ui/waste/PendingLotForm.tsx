import { useId, useState, type FormEvent } from 'react';
import type { WasteTypeView } from '@ciclo-azul/contracts';
import type { FieldErrors } from '../../core/forms';
import {
  DEFAULT_DISPOSAL_DEADLINE_DAYS,
  validatePendingLot,
  type NewPendingLot,
  type PendingLotField,
} from '../../core/waste/pending-lot';
import { Icon } from '../components/Icon';

interface PendingLotFormProps {
  wasteTypes: readonly WasteTypeView[];
  onAdd: (lot: NewPendingLot) => void;
  onClose: () => void;
}

/**
 * Novo lote de residuo AGUARDANDO destinacao (R08).
 *
 * ADAPTER EM MEMORIA: o lote fica so neste navegador (ver core/waste/pending-lot.ts).
 */
export function PendingLotForm({ wasteTypes, onAdd, onClose }: PendingLotFormProps): JSX.Element {
  const idPrefix = useId();
  const [wasteTypeId, setWasteTypeId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [deadlineDays, setDeadlineDays] = useState(String(DEFAULT_DISPOSAL_DEADLINE_DAYS));
  const [errors, setErrors] = useState<FieldErrors<PendingLotField>>({});

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const lot: NewPendingLot = {
      wasteTypeId,
      quantity: quantity.trim() === '' ? Number.NaN : Number(quantity),
      deadlineDays: deadlineDays.trim() === '' ? Number.NaN : Number(deadlineDays),
    };
    const found = validatePendingLot(lot);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    onAdd(lot);
    onClose();
  }

  const id = (field: PendingLotField): string => `${idPrefix}-${field}`;
  const fieldError = (field: PendingLotField): JSX.Element | null =>
    errors[field] ? (
      <p className="field__error" id={`${id(field)}-error`}>
        <Icon name="alert" size={16} />
        {errors[field]}
      </p>
    ) : null;
  const invalid = (field: PendingLotField) => ({
    'aria-invalid': errors[field] ? (true as const) : undefined,
    'aria-describedby': errors[field] ? `${id(field)}-error` : undefined,
  });

  return (
    <form className="form" onSubmit={handleSubmit} noValidate aria-label="Novo lote">
      <div className="field">
        <label htmlFor={id('wasteTypeId')}>Tipo de resíduo</label>
        <select
          id={id('wasteTypeId')}
          className="field__input"
          value={wasteTypeId}
          onChange={(e) => setWasteTypeId(e.target.value)}
          {...invalid('wasteTypeId')}
        >
          <option value="">Selecione…</option>
          {wasteTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} — {type.classification}
            </option>
          ))}
        </select>
        {fieldError('wasteTypeId')}
      </div>

      <div className="field">
        <label htmlFor={id('quantity')}>Quantidade gerada</label>
        <input
          id={id('quantity')}
          className="field__input"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          {...invalid('quantity')}
        />
        {fieldError('quantity')}
      </div>

      <div className="field">
        <label htmlFor={id('deadlineDays')}>Prazo para destinar (dias)</label>
        <input
          id={id('deadlineDays')}
          className="field__input"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={deadlineDays}
          onChange={(e) => setDeadlineDays(e.target.value)}
          {...invalid('deadlineDays')}
        />
        <p className="hint">
          Valor de demonstração: o prazo oficial ainda não foi definido (ver docs).
        </p>
        {fieldError('deadlineDays')}
      </div>

      <button type="submit" className="btn btn--primary btn--block">
        Criar lote
      </button>
    </form>
  );
}
