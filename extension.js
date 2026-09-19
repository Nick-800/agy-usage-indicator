import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

function formatCountdown(isoString) {
    if (!isoString) return '';
    try {
        const cleanStr = isoString.replace('Z', '+00:00');
        const target = new Date(cleanStr).getTime();
        const now = Date.now();
        const diffSec = Math.floor((target - now) / 1000);
        if (diffSec <= 0) return 'ready';
        const days = Math.floor(diffSec / 86400);
        const hours = Math.floor((diffSec % 86400) / 3600);
        const minutes = Math.floor((diffSec % 3600) / 60);
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
        return `${minutes}m`;
    } catch (e) {
        return '';
    }
}

function getAgyExecutable() {
    const inPath = GLib.find_program_in_path('agy');
    if (inPath) return inPath;
    const home = GLib.get_home_dir();
    const fallback = GLib.build_filenamev([home, '.local', 'bin', 'agy']);
    if (GLib.file_test(fallback, GLib.FileTest.IS_EXECUTABLE)) {
        return fallback;
    }
    return 'agy';
}

const AgyUsageIndicator = GObject.registerClass(
class AgyUsageIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, extension.metadata.name, false);
        this._extension = extension;
        this._settings = extension.getSettings();
        this._cancellable = null;
        this._timeoutId = null;
        this._data = null;
        this._isFetching = false;

        const box = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
            y_align: Clutter.ActorAlign.CENTER,
        });

        const iconPath = GLib.build_filenamev([extension.path, 'icons', 'gemini.svg']);
        this._topBarIcon = new St.Icon({
            gicon: Gio.FileIcon.new_for_path(iconPath),
            icon_size: 16,
            style_class: 'system-status-icon',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'margin-right: 5px;',
        });
        box.add_child(this._topBarIcon);

        this._statusDot = new St.Label({
            text: '● ',
            style_class: 'system-status-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        box.add_child(this._statusDot);

        this._label = new St.Label({
            text: 'AGY: ...',
            y_align: Clutter.ActorAlign.CENTER,
        });
        box.add_child(this._label);

        this.add_child(box);

        this._menuSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._menuSection);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const refreshItem = new PopupMenu.PopupMenuItem(_('Refresh Now'));
        refreshItem.connect('activate', () => this.refresh());
        this.menu.addMenuItem(refreshItem);

        const prefsItem = new PopupMenu.PopupMenuItem(_('Settings'));
        prefsItem.connect('activate', () => this._extension.openPreferences());
        this.menu.addMenuItem(prefsItem);

        this._settingsChangedId = this._settings.connect('changed', () => {
            this._updateUI();
            this._restartTimer();
        });

        this._restartTimer();
        this.refresh();
    }

    _restartTimer() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }

        const interval = Math.max(30, this._settings.get_int('refresh-interval'));
        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            interval,
            () => {
                this.refresh();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    refresh() {
        if (this._isFetching) return;
        this._isFetching = true;
        this._statusDot.set_style('color: #ffb700;');

        if (this._cancellable) {
            this._cancellable.cancel();
        }
        this._cancellable = new Gio.Cancellable();

        try {
            const agyPath = getAgyExecutable();
            const proc = new Gio.Subprocess({
                argv: [agyPath, '-p', '/usage', '--output-format', 'json'],
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            });

            proc.init(this._cancellable);
            proc.communicate_utf8_async(null, this._cancellable, (source, res) => {
                this._isFetching = false;
                try {
                    const [, stdout, stderr] = source.communicate_utf8_finish(res);
                    if (source.get_successful()) {
                        const parsed = JSON.parse(stdout);
                        this._data = parsed;
                        this._statusDot.set_style('color: #00ffaa;');
                        this._updateUI();
                    } else {
                        console.error(`[AGY] Subprocess exited with error: ${stderr}`);
                        this._statusDot.set_style('color: #ff3366;');
                        if (!this._data) {
                            this._label.set_text('AGY: ERR');
                        }
                    }
                } catch (e) {
                    if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
                        console.error(`[AGY] Failed to parse usage response: ${e}`);
                        this._statusDot.set_style('color: #ff3366;');
                    }
                }
            });
        } catch (e) {
            this._isFetching = false;
            this._statusDot.set_style('color: #ff3366;');
            console.error(`[AGY] Failed to launch agy command: ${e}`);
        }
    }

    _updateUI() {
        const showTopBarIcon = this._settings.get_boolean('show-top-bar-icon');
        this._topBarIcon.visible = showTopBarIcon;

        if (!this._data) {
            this._label.set_text('AGY: ...');
            return;
        }

        const cmdData = this._data?.command?.data || {};
        const groups = cmdData.groups || [];

        const showGemini5h = this._settings.get_boolean('show-gemini-5h');
        const showGeminiWk = this._settings.get_boolean('show-gemini-weekly');
        const showClaude5h = this._settings.get_boolean('show-claude-5h');
        const showClaudeWk = this._settings.get_boolean('show-claude-weekly');
        const showCountdown = this._settings.get_boolean('show-reset-countdown');
        const compact = this._settings.get_boolean('compact-labels');

        const parts = [];
        const menuEntries = [];

        for (const group of groups) {
            const groupName = group.name || '';
            const isGemini = groupName.toLowerCase().includes('gemini');
            const isClaude = groupName.toLowerCase().includes('claude') || groupName.toLowerCase().includes('gpt');
            const buckets = group.buckets || [];

            const iconFiles = [];
            if (isGemini) {
                const p = GLib.build_filenamev([this._extension.path, 'icons', 'gemini.svg']);
                if (GLib.file_test(p, GLib.FileTest.EXISTS)) {
                    iconFiles.push(Gio.File.new_for_path(p));
                }
            } else if (isClaude) {
                const pClaude = GLib.build_filenamev([this._extension.path, 'icons', 'claude.svg']);
                if (GLib.file_test(pClaude, GLib.FileTest.EXISTS)) {
                    iconFiles.push(Gio.File.new_for_path(pClaude));
                }
                const pOpenAI = GLib.build_filenamev([this._extension.path, 'icons', 'openai.svg']);
                if (GLib.file_test(pOpenAI, GLib.FileTest.EXISTS)) {
                    iconFiles.push(Gio.File.new_for_path(pOpenAI));
                }
            }

            menuEntries.push({
                isHeader: true,
                text: groupName.toUpperCase(),
                iconFiles,
            });

            for (const bucket of buckets) {
                const name = bucket.name || '';
                const windowType = (bucket.window || (name.includes('5') ? '5h' : 'weekly')).toLowerCase();
                const pct = Math.round((bucket.remaining_fraction || 0) * 100);
                const countdown = formatCountdown(bucket.reset_time);

                menuEntries.push({
                    isHeader: false,
                    text: `   ${bucket.name}: ${pct}%` + (countdown ? ` (resets in ${countdown})` : ''),
                });

                let includeInTopBar = false;
                let labelPrefix = '';

                if (isGemini) {
                    if (windowType === '5h' && showGemini5h) {
                        includeInTopBar = true;
                        labelPrefix = compact ? 'GEM' : 'Gemini 5h';
                    } else if (windowType === 'weekly' && showGeminiWk) {
                        includeInTopBar = true;
                        labelPrefix = compact ? 'GEM-Wk' : 'Gemini Wk';
                    }
                } else if (isClaude) {
                    if (windowType === '5h' && showClaude5h) {
                        includeInTopBar = true;
                        labelPrefix = compact ? '3P' : 'Claude 5h';
                    } else if (windowType === 'weekly' && showClaudeWk) {
                        includeInTopBar = true;
                        labelPrefix = compact ? '3P-Wk' : 'Claude Wk';
                    }
                }

                if (includeInTopBar) {
                    let part = `${labelPrefix}: ${pct}%`;
                    if (showCountdown && countdown) {
                        part += ` (${countdown})`;
                    }
                    parts.push(part);
                }
            }
        }

        if (parts.length > 0) {
            this._label.set_text(parts.join(' | '));
        } else {
            this._label.set_text('AGY: ACTIVE');
        }

        // Rebuild popup menu entries
        this._menuSection.removeAll();
        for (const entry of menuEntries) {
            const item = new PopupMenu.PopupMenuItem(entry.text, {
                reactive: !entry.isHeader,
                can_focus: !entry.isHeader,
            });

            if (entry.isHeader) {
                item.label.set_style('font-weight: bold; color: #00f0ff;');
                if (entry.iconFiles && entry.iconFiles.length > 0) {
                    for (let i = 0; i < entry.iconFiles.length; i++) {
                        const icon = new St.Icon({
                            gicon: new Gio.FileIcon({ file: entry.iconFiles[i] }),
                            icon_size: 16,
                            style: 'margin-right: 6px;',
                            y_align: Clutter.ActorAlign.CENTER,
                        });
                        item.insert_child_at_index(icon, i);
                    }
                }
            }

            this._menuSection.addMenuItem(item);
        }
    }

    destroy() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this._cancellable) {
            this._cancellable.cancel();
            this._cancellable = null;
        }

        super.destroy();
    }
});

export default class AgyUsageExtension extends Extension {
    enable() {
        this._indicator = new AgyUsageIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
