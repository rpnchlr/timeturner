import { createWallpaperRecord, deleteWallpaper, getWallpaper, listWallpapers, saveWallpaper, clearWallpapers } from './database.js';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const PRESETS = [
  { id: 'default', label: 'Midnight', type: 'default', value: null, style: 'linear-gradient(135deg, #111512 0%, #202b21 52%, #0e120f 100%)' },
  { id: 'moss', label: 'Moss', type: 'gradient', value: 'linear-gradient(135deg, #202d24 0%, #62755c 46%, #131a15 100%)', style: 'linear-gradient(135deg, #202d24, #62755c)' },
  { id: 'ember', label: 'Ember', type: 'gradient', value: 'linear-gradient(135deg, #271c1b 0%, #744f43 48%, #161311 100%)', style: 'linear-gradient(135deg, #271c1b, #744f43)' },
  { id: 'paper', label: 'Paper', type: 'solid', value: '#c7c8bb', style: '#c7c8bb' },
];

export class WallpaperManager {
  constructor(elements) { this.elements = elements; this.currentObjectUrl = null; this.previewUrls = []; }

  async apply(state) {
    const { backgroundImage, ambientBackground } = this.elements;
    if (this.currentObjectUrl) { URL.revokeObjectURL(this.currentObjectUrl); this.currentObjectUrl = null; }
    const source = state.wallpaperSource || { type: 'default' };
    let cssImage = '';
    let opacity = '0';
    ambientBackground.style.background = source.type === 'solid' && source.value ? source.value : '';
    if (source.type === 'remote' && source.value) { cssImage = `url(${JSON.stringify(source.value)})`; opacity = '1'; }
    else if (source.type === 'gradient' && source.value) { cssImage = source.value; opacity = '1'; }
    else if (state.selectedWallpaperId) {
      try {
        const record = await getWallpaper(state.selectedWallpaperId);
        if (record?.blob) { this.currentObjectUrl = URL.createObjectURL(record.blob); cssImage = `url("${this.currentObjectUrl}")`; opacity = '1'; }
      } catch (error) { console.warn('Wallpaper could not be loaded.', error); }
    }
    backgroundImage.style.backgroundImage = cssImage;
    backgroundImage.style.backgroundPosition = state.appearance.position;
    backgroundImage.style.backgroundSize = state.appearance.scale;
    backgroundImage.style.opacity = opacity;
    return this.applyAppearance(state.appearance);
  }

  applyAppearance(appearance) {
    document.documentElement.style.setProperty('--brightness', `${appearance.brightness}%`);
    document.documentElement.style.setProperty('--blur', `${appearance.blur}px`);
    document.documentElement.style.setProperty('--overlay', `${appearance.overlay}`);
    document.documentElement.style.setProperty('--countdown-scale', `${appearance.fontSize / 100}`);
    this.elements.ambientBackground.style.backgroundColor = appearance.fallbackColor;
  }

  async upload(file) {
    if (!file) return null;
    if (!ACCEPTED_TYPES.has(file.type)) throw new Error('Use a JPG, PNG, WebP, or AVIF image.');
    if (file.size > MAX_FILE_SIZE) throw new Error('That image is larger than 15 MB. Choose a smaller file.');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('This image could not be read.');
    } catch { throw new Error('This image could not be read. Try another file.'); }
    finally { URL.revokeObjectURL(url); }
    const record = createWallpaperRecord(file);
    await saveWallpaper(record);
    return record;
  }

  async remove(id) { await deleteWallpaper(id); }
  async clear() { await clearWallpapers(); }
  async list() { return listWallpapers(); }
  presets() { return PRESETS; }

  async renderLibrary(container, selectedSource, selectedId, callbacks) {
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
    this.previewUrls = [];
    container.replaceChildren();
    const records = await this.list().catch(error => { console.warn('Could not read wallpaper library.', error); return []; });
    const entries = PRESETS.map(preset => ({ ...preset, selected: !selectedId && selectedSource?.type === preset.type && selectedSource?.value === preset.value }));
    records.forEach(record => entries.push({ id: record.id, label: record.name, type: 'local', selected: record.id === selectedId, record }));
    if (!entries.length) { container.innerHTML = '<div class="wallpaper-empty">No wallpapers yet. Your built-in background is ready.</div>'; return; }
    entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = `wallpaper-card${entry.selected ? ' is-selected' : ''}`;
      card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0'); card.setAttribute('aria-label', `Use ${entry.label} wallpaper`);
      if (entry.type === 'local') {
        const image = document.createElement('img');
        const url = URL.createObjectURL(entry.record.blob); this.previewUrls.push(url); image.src = url; image.alt = '';
        card.append(image);
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-wallpaper'; remove.setAttribute('aria-label', `Remove ${entry.label}`); remove.textContent = '×';
        remove.addEventListener('click', event => { event.stopPropagation(); callbacks.onRemove(entry.record.id); }); card.append(remove);
      } else { card.style.background = entry.style; }
      const name = document.createElement('span'); name.className = 'wallpaper-name'; name.textContent = entry.label; card.append(name);
      const select = () => callbacks.onSelect(entry.type === 'local' ? { type: 'local', id: entry.id } : { type: entry.type, value: entry.value });
      card.addEventListener('click', select); card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
      container.append(card);
    });
  }
}

export { MAX_FILE_SIZE };
