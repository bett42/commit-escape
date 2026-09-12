import type { ContributionYear } from '../types';

const DB_NAME = 'commit-scape';
const STORE = 'calendars';
/** Contribution data changes daily, so keep it fresh. */
const TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry {
  savedAt: number;
  year: ContributionYear;
}

function key(username: string): string {
  return `cal-${username.trim().toLowerCase()}`;
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function getCached(username: string): Promise<ContributionYear | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly').objectStore(STORE).get(key(username));
    tx.onsuccess = () => {
      const entry = tx.result as CacheEntry | undefined;
      if (entry && Date.now() - entry.savedAt < TTL_MS) resolve(entry.year);
      else resolve(null);
    };
    tx.onerror = () => resolve(null);
  });
}

export async function setCached(username: string, year: ContributionYear): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    const entry: CacheEntry = { savedAt: Date.now(), year };
    const tx = db.transaction(STORE, 'readwrite').objectStore(STORE).put(entry, key(username));
    tx.onsuccess = () => resolve();
    tx.onerror = () => resolve();
  });
}
