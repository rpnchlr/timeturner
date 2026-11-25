const DB_NAME = 'opentime-wallpapers';
const DB_VERSION = 1;
const STORE = 'wallpapers';

let databasePromise;

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) { reject(new Error('IndexedDB is not available in this browser.')); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open wallpaper storage.'));
  });
  return databasePromise;
}

function transaction(mode, operation) {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let request;
    try { request = operation(store); } catch (error) { reject(error); return; }
    if (request) {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Wallpaper storage operation failed.'));
    } else {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Wallpaper storage operation failed.'));
    }
  }));
}

export function listWallpapers() { return transaction('readonly', store => store.getAll()); }
export function getWallpaper(id) { return id ? transaction('readonly', store => store.get(id)) : Promise.resolve(null); }
export function saveWallpaper(wallpaper) { return transaction('readwrite', store => store.put(wallpaper)); }
export function deleteWallpaper(id) { return transaction('readwrite', store => store.delete(id)); }
export async function clearWallpapers() { await transaction('readwrite', store => store.clear()); }

export function createWallpaperRecord(file) {
  return { id: `local-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`, name: file.name, type: file.type, size: file.size, createdAt: Date.now(), blob: file };
}
