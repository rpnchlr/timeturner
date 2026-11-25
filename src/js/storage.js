const STORAGE_KEY = 'timeturnerState';
const LEGACY_STORAGE_KEY = 'opentimeState';

export const DEFAULT_APPEARANCE = {
  brightness: 100,
  blur: 0,
  overlay: 38,
  position: 'center',
  scale: 'cover',
  alignment: 'center',
  fallbackColor: '#111512',
  fontSize: 100,
};

export const DEFAULT_INTERFACE = {
  showLabels: true,
  showSeconds: true,
};

export const DEFAULT_STATE = {
  deadline: { title: '', targetTimestamp: null },
  appearance: { ...DEFAULT_APPEARANCE },
  interface: { ...DEFAULT_INTERFACE },
  wallpaperSource: { type: 'default', value: null },
  selectedWallpaperId: null,
};

const extensionStorage = globalThis.chrome?.storage?.local;

function readFallback(key = STORAGE_KEY) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

function writeFallback(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function mergeState(value) {
  const source = value && typeof value === 'object' ? value : {};
  const interfaceSource = source.interface && typeof source.interface === 'object' ? source.interface : {};
  return {
    ...DEFAULT_STATE,
    ...source,
    deadline: { ...DEFAULT_STATE.deadline, ...(source.deadline || {}) },
    appearance: { ...DEFAULT_APPEARANCE, ...(source.appearance || {}) },
    interface: {
      showLabels: interfaceSource.showLabels ?? DEFAULT_INTERFACE.showLabels,
      showSeconds: interfaceSource.showSeconds ?? DEFAULT_INTERFACE.showSeconds,
    },
    wallpaperSource: { ...DEFAULT_STATE.wallpaperSource, ...(source.wallpaperSource || {}) },
  };
}

export async function loadState() {
  if (extensionStorage) {
    try {
      const result = await extensionStorage.get([STORAGE_KEY, LEGACY_STORAGE_KEY]);
      const stored = result[STORAGE_KEY] ?? result[LEGACY_STORAGE_KEY];
      const state = mergeState(stored);
      if (!result[STORAGE_KEY] && result[LEGACY_STORAGE_KEY]) await extensionStorage.set({ [STORAGE_KEY]: state });
      return state;
    } catch (error) {
      console.warn('TimeTurner storage read failed; using fallback.', error);
    }
  }
  const current = readFallback(STORAGE_KEY);
  const legacy = readFallback(LEGACY_STORAGE_KEY);
  const state = mergeState(current ?? legacy);
  if (!current && legacy) writeFallback(STORAGE_KEY, state);
  return state;
}

export async function saveState(state) {
  const normalized = mergeState(state);
  if (extensionStorage) {
    try {
      await extensionStorage.set({ [STORAGE_KEY]: normalized });
      return normalized;
    } catch (error) {
      console.warn('TimeTurner storage write failed; using fallback.', error);
    }
  }
  try { writeFallback(STORAGE_KEY, normalized); } catch (error) { console.warn('Fallback storage write failed.', error); }
  return normalized;
}

export function serializeState(state) {
  const clean = mergeState(state);
  return {
    app: 'timeturner',
    version: 1,
    exportedAt: new Date().toISOString(),
    deadline: clean.deadline,
    appearance: clean.appearance,
    interface: clean.interface,
    wallpaperSource: clean.wallpaperSource,
    selectedWallpaperId: clean.selectedWallpaperId,
  };
}

export function importState(value) {
  if (!value || !['timeturner', 'opentime'].includes(value.app) || typeof value !== 'object') throw new Error('This file is not a TimeTurner configuration.');
  return mergeState(value);
}
