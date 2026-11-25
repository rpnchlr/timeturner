import { getRemaining, pad } from './date-utils.js';

export class Countdown {
  constructor(elements, onTick) {
    this.elements = elements;
    this.onTick = onTick;
    this.animationFrame = null;
    this.tickAnimationFrame = null;
    this.targetTimestamp = null;
    this.handleVisibilityChange = () => {
      if (document.hidden) {
        this.stop();
      }
      else { this.render(); this.schedule(); }
    };
    document.addEventListener('visibilitychange', this.handleVisibilityChange, { passive: true });
  }
  setTarget(targetTimestamp) {
    this.targetTimestamp = Number.isFinite(targetTimestamp) ? targetTimestamp : null;
    this.render();
    if (document.hidden) this.stop();
    else this.schedule();
  }
  start() { this.stop(); this.render(); this.schedule(); }
  stop() {
    if (this.animationFrame) { cancelAnimationFrame(this.animationFrame); this.animationFrame = null; }
    if (this.tickAnimationFrame) { cancelAnimationFrame(this.tickAnimationFrame); this.tickAnimationFrame = null; }
  }
  schedule() {
    if (document.hidden || !Number.isFinite(this.targetTimestamp) || this.targetTimestamp <= Date.now() || this.animationFrame) return;
    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = null;
      this.render();
      this.schedule();
    });
  }
  render() {
    const remaining = getRemaining(this.targetTimestamp);
    const values = { days: remaining.diff === null ? '—' : String(remaining.days), hours: remaining.diff === null ? '—' : pad(remaining.hours), minutes: remaining.diff === null ? '—' : pad(remaining.minutes), seconds: remaining.diff === null ? '—' : pad(remaining.seconds), milliseconds: remaining.diff === null ? '—' : pad(remaining.milliseconds, 3) };
    const animated = [];
    Object.entries(values).forEach(([key, value]) => {
      const element = this.elements[key];
      if (element.textContent !== value) {
        element.textContent = value;
        element.classList.remove('tick');
        if (key !== 'milliseconds') animated.push(element);
      }
    });
    if (animated.length) {
      if (this.tickAnimationFrame) cancelAnimationFrame(this.tickAnimationFrame);
      this.tickAnimationFrame = requestAnimationFrame(() => {
        animated.forEach(element => element.classList.add('tick'));
        this.tickAnimationFrame = null;
      });
    }
    this.onTick(remaining);
  }
}
