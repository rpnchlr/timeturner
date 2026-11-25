# TimeTurner

TimeTurner is a lightweight Manifest V3 New Tab extension built around one idea: every second counts. It replaces the default New Tab page with a live, timestamp-based countdown to a deadline you choose.

## Features

- Live `DAYS : HOURS : MINUTES : SECONDS : MILLISECONDS` countdown with no timer drift.
- Local date/time controls, validation, expiry state, and live preview.
- Local wallpaper uploads for JPG/JPEG, PNG, WebP, and AVIF (up to 15 MB).
- IndexedDB wallpaper library with selection, removal, persistence, and graceful fallback.
- Built-in Midnight, Moss, Ember, and Paper backgrounds.
- Optional remote image URLs, brightness, blur, overlay, position, scale, and fallback color controls.
- Appearance and interface toggles for unit labels, seconds and milliseconds.
- JSON import/export for configuration.
- Responsive, keyboard-accessible settings panel with Escape-to-close and visible focus states.
- No browsing data collection, backend, authentication, or network requests required.

The New Tab surface is intentionally focused: it retains only the current date, settings gear, and centered countdown. Product branding, deadline metadata, calls to action, motivational copy, and footer content are not rendered on the New Tab surface.

## Technology and architecture

The extension uses HTML5, CSS3, and native JavaScript ES modules. `chrome.storage.local` stores the deadline and UI preferences. IndexedDB stores wallpaper image blobs; this avoids putting large binary data into extension storage. The page recalculates from `targetTimestamp - Date.now()` on every animation frame, so the millisecond display advances continuously while remaining accurate across refreshes, browser restarts, sleep, and system clock changes. Rendering pauses while the page is hidden and resumes immediately when visibility returns.

Date and time inputs are interpreted in the browser's local timezone. The resulting absolute timestamp is persisted, so the selected moment is unambiguous when the page is reopened in the same local environment.

## Project structure

```text
timeturner/
├── manifest.json
├── index.html
├── assets/icons/        Extension icons
├── src/css/             App, countdown, settings, and responsive styles
├── src/js/              Countdown, storage, IndexedDB, wallpaper, settings, and UI modules
├── tests/               Dependency-free date and static checks
└── README.md
```

## Install in Chrome

1. Open `chrome://extensions/`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project directory.
5. Open a new tab.

## Install in Brave

1. Open `brave://extensions/`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project directory.
5. Open a new tab.

Wallpaper changes happen from TimeTurner's own Settings panel. You do not need to edit source files, repackage the extension, or reload it for a wallpaper change.

## Configure a deadline

Open Settings with the gear icon or `Tab` navigation. Choose a date and local time, then select **Save changes**. A past or incomplete deadline is rejected with an inline explanation. **Reset countdown** clears only the deadline while leaving the visual settings intact.

## Wallpapers

Open Settings → Atmosphere. Choose a built-in background, upload an image, select a stored image, remove an individual image, or enter an `http`/`https` image URL. Uploaded images are stored in this browser's IndexedDB and remain available after refreshes and browser restarts. Use **Clear stored wallpapers** to remove every uploaded image.

## Data and privacy

All deadline, appearance, and interface settings stay in the extension's local storage. Uploaded wallpapers stay in the extension's local IndexedDB database. TimeTurner does not collect browsing history, tabs, bookmarks, cookies, analytics, or account information. A remote wallpaper URL is only requested by the browser when you explicitly choose one.

JSON export includes settings and the selected wallpaper source. Binary wallpaper files are not embedded in JSON; if a configuration is imported into another browser, upload the local image there again.

## Development checks

No package installation is required. With Node.js available:

```sh
npm test
npm run check
for f in src/js/*.js; do node --check "$f"; done
```

The checks cover countdown decomposition, expiry behavior, local input conversion, manifest permissions, referenced files, icons, and JavaScript module imports. For extension-specific behavior, use the manual checklist below.

## Troubleshooting and manual QA

- If the New Tab page does not change, confirm the extension is enabled and that another New Tab override is not active.
- If a wallpaper is rejected, check the format and keep the file under 15 MB.
- If browser storage is cleared, the deadline and uploaded wallpapers must be configured again.
- If a remote wallpaper is blank, confirm the URL is a direct image URL and that the remote host allows image loading.

Manual smoke test:

1. Load the unpacked extension and open a new tab.
2. Open Settings, enter a future title/date/time, and save.
3. Confirm the millisecond display advances continuously through the full 000–999 range during each remaining second, and that the countdown survives a refresh.
4. Confirm a past target shows zeroed units and the expired message.
5. Upload an image, select it, refresh, and reopen Settings to confirm it persists.
6. Change brightness, blur, overlay, scale, toggles, and fallback color; refresh and confirm they persist.
7. Export JSON, import it back, and confirm the settings are restored.
8. Use Escape to close Settings and test the controls using keyboard navigation.
