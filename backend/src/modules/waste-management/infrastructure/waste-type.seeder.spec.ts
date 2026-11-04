import { WasteTypeSeeder } from './waste-type.seeder';
import { RegisterWasteType } from '../application/register-waste-type.use-case';
import { ListWasteTypes } from '../application/list-waste-types.use-case';
import { InMemoryWasteTypeRepository } from './in-memory-waste-type.repository';

describe('WasteTypeSeeder', () => {
  function build() {
    const repo = new InMemoryWasteTypeRepository();
    const register = new RegisterWasteType(repo);
    const list = new ListWasteTypes(repo);
    return { seeder: new WasteTypeSeeder(register, list), list };
  }

  it('insere os tipos de exemplo quando o repositorio esta vazio', async () => {
    const { seeder, list } = build();
    const inserted = await seeder.seed();
    expect(inserted).toBeGreaterThan(0);
    expect((await list.execute()).length).toBe(inserted);
  });

  it('e idempotente: nao duplica se ja houver dados', async () => {
    const { seeder, list } = build();
    await seeder.seed();
    const countAfterFirst = (await list.execute()).length;

    const insertedSecond = await seeder.seed();
    expect(insertedSecond).toBe(0);
    expect((await list.execute()).length).toBe(countAfterFirst);
  });
});
