import { sys } from 'cc';

export class StorageService {
  static getNumber(key: string, fallback = 0): number {
    const value = sys.localStorage.getItem(key);
    if (value === null) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  static setNumber(key: string, value: number): void {
    sys.localStorage.setItem(key, String(value));
  }

  static getJSON<T>(key: string, fallback: T): T {
    const value = sys.localStorage.getItem(key);
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  static setJSON<T>(key: string, value: T): void {
    sys.localStorage.setItem(key, JSON.stringify(value));
  }
}
