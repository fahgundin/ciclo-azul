import { RegisterWasteType } from './register-waste-type.use-case';
import { ListWasteTypes } from './list-waste-types.use-case';
import type { WasteTypeRepository } from '../domain/waste-type.repository';
import type { WasteType } from '../domain/waste-type';

class InMemoryRepo implements WasteTypeRepository {
  public items: WasteType[] = [];
  async save(wt: WasteType): Promise<void> {
    this.items.push(wt);
  }
  async findAll(): Promise<WasteType[]> {
    return this.items;
  }
}

describe('RegisterWasteType / ListWasteTypes (casos de uso)', () => {
  it('cadastra um tipo valido e o deixa disponivel na listagem', async () => {
    const repo = new InMemoryRepo();
    const register = new RegisterWasteType(repo);
    const list = new ListWasteTypes(repo);

    const created = await register.execute({
      name: 'Óleo de refrigeração',
      classification: 'Metal pesado',
    });

    expect(created.id).toBeTruthy();
    const all = await list.execute();
    expect(all).toHaveLength(1);
    expect(all[0].classification).toBe('Metal pesado');
  });

  it('propaga erro de classificacao obrigatoria e nao persiste', async () => {
    const repo = new InMemoryRepo();
    const register = new RegisterWasteType(repo);

    await expect(
      register.execute({ name: 'Óleo de refrigeração', classification: '' }),
    ).rejects.toThrow('A classificação do resíduo é obrigatória');
    expect(repo.items).toHaveLength(0);
  });
});
