/**
 * O Node 22+ expõe um `localStorage`/`sessionStorage` global próprio (Web Storage experimental).
 * No ambiente jsdom do Vitest `window === globalThis`, então esse global **sombreia** o Storage do
 * jsdom — e sem `--localstorage-file` ele não serve: `clear` não é nem função. O sintoma é a suíte
 * inteira quebrando com `TypeError: localStorage.clear is not a function`, sem nenhuma relação com
 * o código testado.
 *
 * Não há como recuperar o Storage do jsdom por baixo do global, então aqui a gente testa o que está
 * instalado e, se não servir, troca por um Storage em memória. Em Node 24 (o do `.nvmrc`) nada é
 * substituído: o do jsdom passa no teste e continua valendo.
 */

class MemoryStorage implements Storage {
  private entries = new Map<string, string>();

  public get length(): number {
    return this.entries.size;
  }

  public clear(): void {
    this.entries.clear();
  }

  public getItem(key: string): string | null {
    return this.entries.has(key) ? (this.entries.get(key) as string) : null;
  }

  public key(index: number): string | null {
    return Array.from(this.entries.keys())[index] ?? null;
  }

  public removeItem(key: string): void {
    this.entries.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }
}

const PROBE_KEY = '__4frames_storage_probe__';

function isUsableStorage(candidate: unknown): boolean {
  try {
    const storage = candidate as Storage | undefined | null;

    if (!storage || typeof storage.getItem !== 'function' || typeof storage.clear !== 'function') {
      return false;
    }

    storage.setItem(PROBE_KEY, '1');
    const roundTrip = storage.getItem(PROBE_KEY);
    storage.removeItem(PROBE_KEY);

    return roundTrip === '1';
  } catch {
    return false;
  }
}

export function installStoragePolyfill(): void {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    if (isUsableStorage(globalThis[key])) {
      continue;
    }

    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: new MemoryStorage()
    });
  }
}
