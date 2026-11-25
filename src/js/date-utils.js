const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

export function getRemaining(targetTimestamp, now = Date.now()) {
  if (!Number.isFinite(targetTimestamp)) return { diff: null, expired: false, days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
  const diff = Math.max(0, targetTimestamp - now);
  return {
    diff,
    expired: targetTimestamp <= now,
    days: Math.floor(diff / DAY),
    hours: Math.floor((diff % DAY) / HOUR),
    minutes: Math.floor((diff % HOUR) / MINUTE),
    seconds: Math.floor((diff % MINUTE) / SECOND),
    milliseconds: Math.floor(diff % SECOND),
  };
}

export function pad(value, width = 2) { return String(value).padStart(width, '0'); }

export function toLocalInputValues(timestamp) {
  if (!Number.isFinite(timestamp)) return { date: '', time: '' };
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * MINUTE);
  return { date: local.toISOString().slice(0, 10), time: local.toISOString().slice(11, 16) };
}

export function fromLocalInputValues(dateValue, timeValue) {
  if (!dateValue || !timeValue) return NaN;
  const timestamp = new Date(`${dateValue}T${timeValue}:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : NaN;
}

export function formatTarget(timestamp) {
  if (!Number.isFinite(timestamp)) return 'Target not set';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}

export function formatCurrentDate(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

export function formatCurrentTime(date = new Date(), use24Hour = true) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !use24Hour }).format(date);
}

export function formatDuration(diff) {
  if (!Number.isFinite(diff)) return 'No deadline set';
  const remaining = getRemaining(Date.now() + Math.max(0, diff));
  const parts = [`${remaining.days}d`, `${pad(remaining.hours)}h`, `${pad(remaining.minutes)}m`, `${pad(remaining.seconds)}s`];
  return parts.join(' ');
}

export function isValidFutureTimestamp(timestamp, now = Date.now()) {
  return Number.isFinite(timestamp) && timestamp > now;
}
