# AGY Usage Indicator (GNOME Shell Extension)

A sleek, lightweight GNOME Shell extension that displays real-time **Google Antigravity (`agy`)** model quota usages, rolling windows, and reset countdowns directly in your top panel.

---

## Features

- **Live Top Bar Display**: Shows remaining quota percentages and reset countdowns for Gemini (5h / weekly) and Claude / GPT models.
- **Detailed Dropdown Menu**: Click the top panel indicator to view comprehensive quotas, exact reset timestamps, an instant "Refresh Now" trigger, and settings.
- **Full GNOME Extension Manager Support**: Configure which models appear in the top panel, toggle countdown timers, toggle compact abbreviations (`GEM`, `3P`), and customize the refresh interval via Libadwaita preferences.
- **Non-blocking Execution**: Uses asynchronous GJS subprocess calls to ensure zero impact on GNOME Shell responsiveness.

---

## Prerequisites

- **GNOME Shell**: 45, 46, or 47
- **Antigravity CLI**: `agy` command installed and available in `$PATH` (or at `~/.local/bin/agy`).

---

## Installation

### From GNOME Extensions (Recommended)
Search for **"AGY Usage Indicator"** in **Extension Manager** or visit [extensions.gnome.org](https://extensions.gnome.org).

### Manual Installation
```bash
git clone https://github.com/Nick-800/agy-usage-indicator.git
cd agy-usage-indicator
./build.sh
gnome-extensions install --force agy-usage-indicator@nick-800.github.io.shell-extension.zip
gnome-extensions enable agy-usage-indicator@nick-800.github.io
```
On X11, press `Alt + F2`, type `r`, and press `Enter` to reload the shell.

---

## License
GPL-3.0-or-later
