let toastTimer;

export function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message; toast.classList.add('is-visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3600);
}

export function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export function setHidden(element, hidden) { element.hidden = hidden; }
