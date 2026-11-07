import { useId, useState, type FormEvent } from 'react';
import type { WasteLotView, WasteTypeView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { WasteLotApi } from '../../core/api/waste-lot-api';
import { toDateInputValue } from '../../core/sensors/validation';
import { validateDisposal, type DisposalField } from '../../core/waste/validation';
import type { FieldErrors } from '../../core/forms';
import { Icon } from '../components/Icon';

interface DisposalFormProps {
  api: WasteLotApi;
  wasteTypes: readonly WasteTypeView[];
  /** Valores iniciais (ex.: ao destinar um lote pendente). */
  initial?: { wasteTypeId?: string; quantity?: number };
  /** Relogio injetavel (testes). */
  now?: () => Date;
  onRegistered: (lot: WasteLotView) => void;
  onClose: () => void;
}

/**
 * Formulario de registro da destinacao de um lote de residuo (R06).
 *
 * O comprovante e uma REFERENCIA (texto ou link do documento): o backend ainda nao
 * recebe upload de arquivo (ver docs/migracao-frontend.md, "Lacunas do R06").
 */
export function DisposalForm({
  api,
  wasteTypes,
  initial,
  now = () => new Date(),
  onRegistered,
  onClose,
}: DisposalFormProps): JSX.Element {
  const idPrefix = useId();
  const [wasteTypeId, setWasteTypeId] = useState(initial?.wasteTypeId ?? '');
  const [location, setLocation] = useState('');
  const [receiverCompany, setReceiverCompany] = useState('');
  const [license, setLicense] = useState('');
  const [date, setDate] = useState(() => toDateInputValue(now()));
  const [quantity, setQuantity] = useState(
    initial?.quantity === undefined ? '' : String(initial.quantity),
  );
  const [proofReference, setProofReference] = useState('');
  const [errors, setErrors] = useState<FieldErrors<DisposalField>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setServerError(null);
    const values = {
      wasteTypeId,
      location,
      receiverCompany,
      license,
      date,
      quantity: quantity.trim() === '' ? Number.NaN : Number(quantity),
      proofReference,
    };
    const found = validateDisposal(values, now());
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSubmitting(true);
    try {
      const lot = await api.register({
        wasteTypeId,
        location: location.trim(),
        receiverCompany: receiverCompany.trim(),
        license: license.trim(),
        date,
        quantity: values.quantity,
        proofReference: proofReference.trim(),
      });
      onRegistered(lot);
      onClose();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Falha ao registrar a destinação');
    } finally {
      setSubmitting(false);
    }
  }

  const id = (field: DisposalField): string => `${idPrefix}-${field}`;
  const fieldError = (field: DisposalField): JSX.Element | null =>
    errors[field] ? (
      <p className="field__error" id={`${id(field)}-error`}>
        <Icon name="alert" size={16} />
        {errors[field]}
      </p>
    ) : null;
  const invalid = (field: DisposalField) => ({
    'aria-invalid': errors[field] ? (true as const) : undefined,
    'aria-describedby': errors[field] ? `${id(field)}-error` : undefined,
  });

  return (
    <form className="form" onSubmit={handleSubmit} noValidate aria-label="Registrar destinação">
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
        {wasteTypes.length === 0 && (
          <p className="hint">Cadastre um tipo de resíduo na aba "Tipos de resíduo".</p>
        )}
        {fieldError('wasteTypeId')}
      </div>

      <div className="field">
        <label htmlFor={id('location')}>Local da destinação</label>
        <input
          id={id('location')}
          className="field__input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Cidade/UF ou endereço"
          {...invalid('location')}
        />
        {fieldError('location')}
      </div>

      <div className="field">
        <label htmlFor={id('receiverCompany')}>Empresa receptora</label>
        <input
          id={id('receiverCompany')}
          className="field__input"
          value={receiverCompany}
          onChange={(e) => setReceiverCompany(e.target.value)}
          {...invalid('receiverCompany')}
        />
        {fieldError('receiverCompany')}
      </div>

      <div className="field">
        <label htmlFor={id('license')}>Licença da empresa</label>
        <input
          id={id('license')}
          className="field__input"
          value={license}
          onChange={(e) => setLicense(e.target.value)}
          placeholder="Ex.: LO-2043/2025"
          {...invalid('license')}
        />
        {fieldError('license')}
      </div>

      <div className="field">
        <label htmlFor={id('date')}>Data da destinação</label>
        <input
          id={id('date')}
          className="field__input"
          type="date"
          value={date}
          max={toDateInputValue(now())}
          onChange={(e) => setDate(e.target.value)}
          {...invalid('date')}
        />
        {fieldError('date')}
      </div>

      <div className="field">
        <label htmlFor={id('quantity')}>Quantidade destinada</label>
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
        <label htmlFor={id('proofReference')}>Comprovante de destinação (obrigatório)</label>
        <input
          id={id('proofReference')}
          className="field__input"
          value={proofReference}
          onChange={(e) => setProofReference(e.target.value)}
          placeholder="Número do MTR, nome do arquivo ou link"
          {...invalid('proofReference')}
        />
        {fieldError('proofReference')}
      </div>

      {serverError && (
        <p className="form-alert" role="alert">
          {serverError}
        </p>
      )}

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? 'Registrando…' : 'Registrar destinação'}
      </button>
    </form>
  );
}
