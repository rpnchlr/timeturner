import { DEFAULT_APPEARANCE, DEFAULT_INTERFACE } from './storage.js';
import { formatDuration, fromLocalInputValues, toLocalInputValues } from './date-utils.js';

export class SettingsController {
  constructor(elements, wallpaperManager, onChange) { this.elements = elements; this.wallpaperManager = wallpaperManager; this.onChange = onChange; this.draft = null; }

  open(state) { this.draft = structuredClone(state); this.populate(); this.elements.panel.hidden = false; this.elements.backdrop.hidden = false; document.body.classList.add('settings-open'); this.elements.dateInput.focus(); }
  close() { this.draft = null; this.elements.panel.hidden = true; this.elements.backdrop.hidden = true; document.body.classList.remove('settings-open'); }
  getDraft() { return structuredClone(this.draft); }
  setDraft(state) { this.draft = structuredClone(state); this.populate(); }
  populate() {
    const { draft, elements: e } = this;
    const local = toLocalInputValues(draft.deadline.targetTimestamp);
    e.dateInput.value = local.date; e.timeInput.value = local.time;
    e.brightness.value = draft.appearance.brightness; e.blur.value = draft.appearance.blur; e.overlay.value = draft.appearance.overlay; e.position.value = draft.appearance.position; e.scale.value = draft.appearance.scale; e.alignment.value = draft.appearance.alignment; e.fallbackColor.value = draft.appearance.fallbackColor; e.fontSize.value = draft.appearance.fontSize;
    e.showLabels.checked = draft.interface.showLabels; e.showSeconds.checked = draft.interface.showSeconds;
    e.fallbackColorLabel.textContent = draft.appearance.fallbackColor;
    this.updateOutputs(); this.updatePreview(); this.setMessage('deadline', ''); this.setMessage('wallpaper', '');
    this.renderWallpapers();
  }
  updateOutputs() { const { elements: e } = this; e.brightnessOutput.textContent = `${e.brightness.value}%`; e.blurOutput.textContent = `${e.blur.value}px`; e.overlayOutput.textContent = `${e.overlay.value}%`; e.fontSizeOutput.textContent = `${e.fontSize.value}%`; e.fallbackColorLabel.textContent = e.fallbackColor.value; }
  updatePreview() { const timestamp = fromLocalInputValues(this.elements.dateInput.value, this.elements.timeInput.value); this.elements.previewDuration.textContent = Number.isFinite(timestamp) && timestamp > Date.now() ? formatDuration(timestamp - Date.now()) : 'No valid future deadline'; }
  setMessage(type, message) { (type === 'deadline' ? this.elements.deadlineMessage : this.elements.wallpaperMessage).textContent = message; }
  bind() {
    const { elements: e } = this;
    [e.dateInput, e.timeInput, e.brightness, e.blur, e.overlay, e.position, e.scale, e.alignment, e.fallbackColor, e.fontSize, e.showLabels, e.showSeconds].forEach(input => input.addEventListener('input', () => { this.readFields(); this.updateOutputs(); this.updatePreview(); this.onChange(this.draft); }));
    [e.dateInput, e.timeInput].forEach(input => input.addEventListener('change', () => { this.readFields(); this.updatePreview(); }));
  }
  readFields() {
    const { elements: e } = this;
    this.draft.deadline.title = '';
    this.draft.deadline.targetTimestamp = fromLocalInputValues(e.dateInput.value, e.timeInput.value);
    this.draft.appearance = { brightness: Number(e.brightness.value), blur: Number(e.blur.value), overlay: Number(e.overlay.value), position: e.position.value, scale: e.scale.value, alignment: e.alignment.value, fallbackColor: e.fallbackColor.value, fontSize: Number(e.fontSize.value) };
    this.draft.interface = { showLabels: e.showLabels.checked, showSeconds: e.showSeconds.checked };
  }
  validate() {
    this.readFields();
    const { deadline } = this.draft;
    const hasAnyDeadlineInput = Boolean(deadline.title || this.elements.dateInput.value || this.elements.timeInput.value);
    if (!hasAnyDeadlineInput) { deadline.title = ''; deadline.targetTimestamp = null; this.setMessage('deadline', ''); return true; }
    if (!Number.isFinite(deadline.targetTimestamp)) { this.setMessage('deadline', 'Choose both a date and a time.'); return false; }
    if (deadline.targetTimestamp <= Date.now()) { this.setMessage('deadline', 'This moment has already passed. Choose a future time.'); return false; }
    this.setMessage('deadline', ''); return true;
  }
  async renderWallpapers() { await this.wallpaperManager.renderLibrary(this.elements.wallpaperLibrary, this.draft.wallpaperSource, this.draft.selectedWallpaperId, { onSelect: source => { if (source.type === 'local') { this.draft.selectedWallpaperId = source.id; this.draft.wallpaperSource = { type: 'local', value: null }; } else { this.draft.selectedWallpaperId = null; this.draft.wallpaperSource = { type: source.type, value: source.value ?? null }; } this.renderWallpapers(); this.onChange(this.draft); }, onRemove: async id => { await this.wallpaperManager.remove(id); if (this.draft.selectedWallpaperId === id) { this.draft.selectedWallpaperId = null; this.draft.wallpaperSource = { type: 'default', value: null }; } await this.renderWallpapers(); this.onChange(this.draft); } }); }
  resetAppearance() { this.draft.appearance = { ...DEFAULT_APPEARANCE }; this.draft.interface = { ...DEFAULT_INTERFACE }; this.populate(); this.onChange(this.draft); }
}
