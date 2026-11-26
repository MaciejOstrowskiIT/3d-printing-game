import { describe, expect, it } from 'vitest';
import { accountStorage, type KeyValue } from '../src/platform/crazygames';

const mem = () => { const m = new Map<string, string>(); return { m, get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => { m.set(k, v); } }; };
const module = (): KeyValue & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } };
};

describe('CrazyGames account storage', () => {
  it('saves to the data module, not localStorage', () => {
    const data = module(), local = mem();
    const s = accountStorage(data, local);
    s.set('save', '{"a":1}');
    expect(data.m.get('save')).toBe('{"a":1}');
    expect(local.m.size).toBe(0);
    expect(s.get('save')).toBe('{"a":1}');
  });

  it('copies an existing localStorage save into the account the first time', () => {
    const data = module(), local = mem();
    local.set('save', 'old-progress');
    const s = accountStorage(data, local);
    expect(s.get('save')).toBe('old-progress');
    expect(data.m.get('save')).toBe('old-progress');
  });

  it('prefers account data over an older local save', () => {
    const data = module(), local = mem();
    data.setItem('save', 'account');
    local.set('save', 'local');
    expect(accountStorage(data, local).get('save')).toBe('account');
  });

  it('falls back to localStorage when the module is missing or disabled', () => {
    const local = mem();
    const none = accountStorage(undefined, local);
    none.set('save', 'x');
    expect(local.m.get('save')).toBe('x');

    const disabled: KeyValue = { getItem: () => { throw new Error('dataModuleDisabled'); }, setItem: () => { throw new Error('dataModuleDisabled'); } };
    const s = accountStorage(disabled, local);
    expect(s.get('save')).toBe('x');
    s.set('save', 'y');
    expect(local.m.get('save')).toBe('y');
  });
});
