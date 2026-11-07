import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../core/api/api-error';
import type { SensorApi } from '../../core/api/sensor-api';
import { LinkSensorForm } from './LinkSensorForm';

const SENSOR = {
  sensorId: 'sn-01',
  unitId: 'dc-sp1',
  status: 'connected' as const,
  linkedAt: '2026-11-05T10:00:00.000Z',
};

function setup(link = vi.fn().mockResolvedValue(SENSOR)) {
  const api = { link } as unknown as SensorApi;
  const onLinked = vi.fn();
  const onClose = vi.fn();
  render(<LinkSensorForm api={api} units={['dc-sp1']} onLinked={onLinked} onClose={onClose} />);
  return { link, onLinked, onClose, user: userEvent.setup() };
}

describe('LinkSensorForm (R04)', () => {
  it('exige identificador e unidade sem chamar a API', async () => {
    const { link, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Conectar' }));

    expect(screen.getByText('Informe o identificador do sensor')).toBeInTheDocument();
    expect(screen.getByText('A unidade é obrigatória')).toBeInTheDocument();
    expect(screen.getByLabelText('Identificador do sensor')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(link).not.toHaveBeenCalled();
  });

  it('vincula o sensor com os valores sem espacos e mostra o topico MQTT', async () => {
    const { link, onLinked, user } = setup();
    await user.type(screen.getByLabelText('Identificador do sensor'), '  sn-01 ');
    await user.type(screen.getByLabelText('Unidade'), ' dc-sp1 ');
    await user.click(screen.getByRole('button', { name: 'Conectar' }));

    expect(link).toHaveBeenCalledWith({ sensorId: 'sn-01', unitId: 'dc-sp1' });
    expect(onLinked).toHaveBeenCalledWith(SENSOR);
    expect(await screen.findByText(/Sensor sn-01 vinculado/)).toBeInTheDocument();
    expect(screen.getByText('ciclo-azul/v1/sensors/dc-sp1/water-consumption')).toBeInTheDocument();
  });

  it('Concluir fecha o dialogo', async () => {
    const { onClose, user } = setup();
    await user.type(screen.getByLabelText('Identificador do sensor'), 'sn-01');
    await user.type(screen.getByLabelText('Unidade'), 'dc-sp1');
    await user.click(screen.getByRole('button', { name: 'Conectar' }));
    await user.click(await screen.findByRole('button', { name: 'Concluir' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mostra a mensagem exata do backend quando o sensor ja esta vinculado (409)', async () => {
    const link = vi
      .fn()
      .mockRejectedValue(new ApiError('O sensor sn-01 já está vinculado a uma unidade', 409));
    const { onLinked, user } = setup(link);
    await user.type(screen.getByLabelText('Identificador do sensor'), 'sn-01');
    await user.type(screen.getByLabelText('Unidade'), 'dc-sp1');
    await user.click(screen.getByRole('button', { name: 'Conectar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O sensor sn-01 já está vinculado a uma unidade',
    );
    expect(onLinked).not.toHaveBeenCalled();
    expect(screen.queryByText(/vinculado à unidade/)).not.toBeInTheDocument();
  });

  it('mostra a mensagem de formato invalido devolvida pelo backend (400)', async () => {
    const link = vi
      .fn()
      .mockRejectedValue(
        new ApiError('Identificador de sensor inválido: use de 3 a 64 caracteres', 400),
      );
    const { user } = setup(link);
    await user.type(screen.getByLabelText('Identificador do sensor'), 'x');
    await user.type(screen.getByLabelText('Unidade'), 'dc-sp1');
    await user.click(screen.getByRole('button', { name: 'Conectar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Identificador de sensor inválido');
  });

  it('usa uma mensagem generica para falhas que nao sao do backend', async () => {
    const { user } = setup(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await user.type(screen.getByLabelText('Identificador do sensor'), 'sn-01');
    await user.type(screen.getByLabelText('Unidade'), 'dc-sp1');
    await user.click(screen.getByRole('button', { name: 'Conectar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao vincular o sensor');
  });
});
