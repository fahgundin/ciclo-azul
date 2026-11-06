import { ListWasteLots } from './list-waste-lots.use-case';
import { RegisterWasteDisposal } from './register-waste-disposal.use-case';
import {
  DisposalProofRequiredError,
  InvalidDisposalQuantityError,
  WasteLot,
  WasteTypeNotFoundError,
} from '../domain/waste-lot';
import type { WasteLotRepository } from '../domain/waste-lot.repository';
import { WasteType } from '../domain/waste-type';
import type { WasteTypeRepository } from '../domain/waste-type.repository';

class FakeWasteTypeRepository implements WasteTypeRepository {
  items: WasteType[] = [];
  async save(wasteType: WasteType): Promise<void> {
    this.items.push(wasteType);
  }
  async findAll(): Promise<WasteType[]> {
    return this.items;
  }
  async findById(id: string): Promise<WasteType | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
}

class FakeWasteLotRepository implements WasteLotRepository {
  items: WasteLot[] = [];
  async save(lot: WasteLot): Promise<void> {
    this.items.push(lot);
  }
  async findAll(): Promise<WasteLot[]> {
    return [...this.items].sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}

const NOW = new Date('2026-11-05T15:00:00.000Z');

function build() {
  const types = new FakeWasteTypeRepository();
  const lots = new FakeWasteLotRepository();
  types.items.push(
    WasteType.create({ id: 'type-1', name: 'Óleo de refrigeração', classification: 'Metal pesado' }),
  );
  return {
    types,
    lots,
    register: new RegisterWasteDisposal(types, lots),
    list: new ListWasteLots(lots),
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    wasteTypeId: 'type-1',
    location: 'Aterro Industrial Classe I',
    receiverCompany: 'EcoResiduos Ltda',
    license: 'LO-12345/2026',
    date: '2026-11-04',
    quantity: 250,
    proofReference: 'https://docs.exemplo.com/mtr/987',
    ...overrides,
  };
}

describe('RegisterWasteDisposal / ListWasteLots', () => {
  it('registra a destinacao de um lote de tipo existente e o lista como Destinado', async () => {
    const { register, list } = build();

    const lot = await register.execute(input(), NOW);

    expect(lot.id).toBeTruthy();
    expect(lot.status).toBe('destined');
    const all = await list.execute();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ wasteTypeId: 'type-1', quantity: 250, status: 'destined' });
  });

  it('bloqueia sem comprovante e nao persiste', async () => {
    const { register, lots } = build();

    await expect(register.execute(input({ proofReference: '' }), NOW)).rejects.toThrow(
      DisposalProofRequiredError,
    );
    await expect(register.execute(input({ proofReference: '' }), NOW)).rejects.toThrow(
      'O comprovante de destinação é obrigatório',
    );
    expect(lots.items).toHaveLength(0);
  });

  it('rejeita tipo de residuo inexistente e nao persiste', async () => {
    const { register, lots } = build();

    await expect(register.execute(input({ wasteTypeId: 'nao-existe' }), NOW)).rejects.toThrow(
      WasteTypeNotFoundError,
    );
    expect(lots.items).toHaveLength(0);
  });

  it('valida os campos antes de consultar o tipo (erro de campo tem prioridade)', async () => {
    const { register } = build();

    await expect(
      register.execute(input({ wasteTypeId: 'nao-existe', quantity: 0 }), NOW),
    ).rejects.toThrow(InvalidDisposalQuantityError);
  });

  it('gera ids distintos para cada lote', async () => {
    const { register } = build();
    const a = await register.execute(input(), NOW);
    const b = await register.execute(input(), NOW);
    expect(a.id).not.toBe(b.id);
  });

  it('lista do lote mais recente para o mais antigo', async () => {
    const { register, list } = build();
    await register.execute(input({ date: '2026-11-01', quantity: 1 }), NOW);
    await register.execute(input({ date: '2026-11-04', quantity: 2 }), NOW);
    await register.execute(input({ date: '2026-11-02', quantity: 3 }), NOW);

    expect((await list.execute()).map((l) => l.quantity)).toEqual([2, 3, 1]);
  });
});
