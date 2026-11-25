import { Countdown } from './countdown.js';
import { formatCurrentDate } from './date-utils.js';
import { clearWallpapers } from './database.js';
import { DEFAULT_STATE, importState, loadState, saveState, serializeState } from './storage.js';
import { SettingsController } from './settings.js';
import { WallpaperManager } from './wallpaper.js';
import { downloadJson, showToast } from './ui.js';

const $ = id => document.getElementById(id);
const elements = {
  shell: $('appShell'), heroContent: document.querySelector('.hero-content'), backgroundImage: $('backgroundImage'), ambientBackground: document.querySelector('.ambient-background'),
  currentDate: $('currentDate'), settingsButton: $('settingsButton'),
  countdown: $('countdown'), days: $('daysValue'), hours: $('hoursValue'), minutes: $('minutesValue'), seconds: $('secondsValue'), milliseconds: $('millisecondsValue'),
  settingsPanel: $('settingsPanel'), settingsBackdrop: $('settingsBackdrop'), panel: $('settingsPanel'), backdrop: $('settingsBackdrop'), closeSettingsButton: $('closeSettingsButton'), cancelSettingsButton: $('cancelSettingsButton'), saveSettingsButton: $('saveSettingsButton'), saveStatus: $('saveStatus'),
  form: $('settingsForm'), dateInput: $('targetDateInput'), timeInput: $('targetTimeInput'), deadlineMessage: $('deadlineMessage'), previewDuration: $('previewDuration'), clearDeadlineButton: $('clearDeadlineButton'),
  uploadButton: $('uploadWallpaperButton'), wallpaperInput: $('wallpaperInput'), wallpaperLibrary: $('wallpaperLibrary'), wallpaperUrlInput: $('wallpaperUrlInput'), applyUrlButton: $('applyWallpaperUrlButton'), wallpaperMessage: $('wallpaperMessage'),
  brightness: $('brightnessInput'), brightnessOutput: $('brightnessOutput'), blur: $('blurInput'), blurOutput: $('blurOutput'), overlay: $('overlayInput'), overlayOutput: $('overlayOutput'), position: $('positionInput'), scale: $('scaleInput'), alignment: $('alignmentInput'), fallbackColor: $('fallbackColorInput'), fallbackColorLabel: $('fallbackColorLabel'),
  showLabels: $('showLabelsInput'), showSeconds: $('showSecondsInput'), fontSize: $('fontSizeInput'), fontSizeOutput: $('fontSizeOutput'), resetAppearanceButton: $('resetAppearanceButton'),
  exportButton: $('exportButton'), importButton: $('importButton'), importInput: $('importInput'), clearWallpapersButton: $('clearWallpapersButton'), resetAllButton: $('resetAllButton'),
};

let state;
let previousState;
let appliedWallpaperKey = null;
let appliedTargetTimestamp;
let currentDateTimer = null;
const wallpaperManager = new WallpaperManager(elements);
const countdown = new Countdown({ days: elements.days, hours: elements.hours, minutes: elements.minutes, seconds: elements.seconds, milliseconds: elements.milliseconds }, remaining => updateCountdownState(remaining));
const settings = new SettingsController(elements, wallpaperManager, draft => applyState(draft, { persist: false }));

function updateCountdownState(remaining) {
  elements.countdown.classList.toggle('is-expired', remaining.diff !== null && remaining.expired);
  elements.countdown.classList.toggle('many-days', remaining.days >= 100);
}

function renderCurrentDate() {
  elements.currentDate.textContent = formatCurrentDate(new Date());
  elements.currentDate.hidden = false;
}

function scheduleCurrentDateRefresh() {
  clearTimeout(currentDateTimer);
  if (document.hidden) return;
  const nextDay = new Date();
  nextDay.setHours(24, 0, 0, 0);
  currentDateTimer = setTimeout(() => { renderCurrentDate(); scheduleCurrentDateRefresh(); }, Math.max(1000, nextDay.getTime() - Date.now() + 50));
}

async function applyState(nextState, { persist = false } = {}) {
  state = nextState;
  elements.countdown.classList.toggle('hide-labels', !state.interface.showLabels);
  elements.countdown.classList.toggle('hide-seconds', !state.interface.showSeconds);
  elements.heroContent.classList.remove('align-left', 'align-center', 'align-right');
  elements.heroContent.classList.add(`align-${state.appearance.alignment || 'center'}`);
  const wallpaperKey = JSON.stringify([state.wallpaperSource, state.selectedWallpaperId]);
  if (wallpaperKey !== appliedWallpaperKey) { await wallpaperManager.apply(state); appliedWallpaperKey = wallpaperKey; }
  else wallpaperManager.applyAppearance(state.appearance);
  const targetTimestamp = Number.isFinite(state.deadline.targetTimestamp) ? state.deadline.targetTimestamp : null;
  if (targetTimestamp !== appliedTargetTimestamp) { appliedTargetTimestamp = targetTimestamp; countdown.setTarget(targetTimestamp); }
  if (persist) state = await saveState(state);
}

function openSettings() { previousState = structuredClone(state); settings.open(state); }
function closeSettings(restore = false) { settings.close(); if (restore) applyState(previousState); }

async function saveSettings() {
  if (!settings.validate()) return;
  const nextState = settings.getDraft();
  elements.saveStatus.textContent = 'Saving…';
  await applyState(nextState, { persist: true });
  settings.close();
  showToast('Your deadline and settings are saved.');
}

function bindEvents() {
  settings.bind();
  elements.settingsButton.addEventListener('click', openSettings);
  elements.closeSettingsButton.addEventListener('click', () => closeSettings(true));
  elements.cancelSettingsButton.addEventListener('click', () => closeSettings(true));
  elements.settingsBackdrop.addEventListener('click', () => closeSettings(true));
  elements.saveSettingsButton.addEventListener('click', saveSettings);
  elements.form.addEventListener('submit', event => { event.preventDefault(); saveSettings(); });
  elements.clearDeadlineButton.addEventListener('click', () => {
    if (!window.confirm('Reset this countdown? The deadline will be cleared, but your appearance settings will stay.')) return;
    const draft = settings.getDraft(); draft.deadline = { title: '', targetTimestamp: null }; settings.setDraft(draft); applyState(draft);
  });
  elements.uploadButton.addEventListener('click', () => elements.wallpaperInput.click());
  elements.wallpaperInput.addEventListener('change', async () => {
    const file = elements.wallpaperInput.files?.[0]; if (!file) return;
    try {
      const record = await wallpaperManager.upload(file); const draft = settings.getDraft(); draft.selectedWallpaperId = record.id; draft.wallpaperSource = { type: 'local', value: null }; settings.setDraft(draft); await applyState(draft); showToast('Wallpaper added to your local library.');
    } catch (error) { settings.setMessage('wallpaper', error.message); }
    elements.wallpaperInput.value = '';
  });
  elements.applyUrlButton.addEventListener('click', async () => {
    const value = elements.wallpaperUrlInput.value.trim();
    try { const parsed = new URL(value); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); const draft = settings.getDraft(); draft.selectedWallpaperId = null; draft.wallpaperSource = { type: 'remote', value: parsed.href }; settings.setMessage('wallpaper', ''); await applyState(draft); } catch { settings.setMessage('wallpaper', 'Enter a valid http or https image URL.'); }
  });
  elements.resetAppearanceButton.addEventListener('click', () => settings.resetAppearance());
  elements.exportButton.addEventListener('click', () => { downloadJson('timeturner-settings.json', serializeState(settings.getDraft())); showToast('Configuration exported as JSON.'); });
  elements.importButton.addEventListener('click', () => elements.importInput.click());
  elements.importInput.addEventListener('change', async () => {
    const file = elements.importInput.files?.[0]; if (!file) return;
    try { const imported = importState(JSON.parse(await file.text())); settings.setDraft(imported); await applyState(imported); showToast('Configuration imported. Review it, then save.'); } catch (error) { showToast(error.message || 'The configuration could not be imported.'); }
    elements.importInput.value = '';
  });
  elements.clearWallpapersButton.addEventListener('click', async () => {
    if (!window.confirm('Remove every uploaded wallpaper from this browser?')) return;
    await wallpaperManager.clear(); const draft = settings.getDraft(); draft.selectedWallpaperId = null; draft.wallpaperSource = { type: 'default', value: null }; settings.setDraft(draft); await applyState(draft); showToast('Stored wallpapers cleared.');
  });
  elements.resetAllButton.addEventListener('click', async () => {
    if (!window.confirm('Reset TimeTurner completely? This clears the deadline, settings, and stored wallpapers.')) return;
    await clearWallpapers(); const clean = structuredClone(DEFAULT_STATE); settings.setDraft(clean); await applyState(clean); showToast('TimeTurner has been reset. Choose Save to keep it.');
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !elements.settingsPanel.hidden) closeSettings(true); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { renderCurrentDate(); scheduleCurrentDateRefresh(); }
    else clearTimeout(currentDateTimer);
  }, { passive: true });
}

async function init() {
  state = await loadState();
  bindEvents();
  renderCurrentDate();
  scheduleCurrentDateRefresh();
  await applyState(state);
}

init().catch(error => { console.error('TimeTurner failed to initialize.', error); showToast('TimeTurner could not load local settings.'); });
