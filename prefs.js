import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AgyUsagePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'utilities-system-monitor-symbolic',
        });
        window.add(page);

        // Top Bar Display Group
        const displayGroup = new Adw.PreferencesGroup({
            title: _('Top Bar Metrics'),
            description: _('Select which model quotas appear directly in the top panel.'),
        });
        page.add(displayGroup);

        const rowGemini5h = new Adw.SwitchRow({
            title: _('Gemini (5-Hour Rolling Limit)'),
            subtitle: _('Show remaining percentage for Gemini 5h limit.'),
        });
        settings.bind('show-gemini-5h', rowGemini5h, 'active', Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(rowGemini5h);

        const rowGeminiWeekly = new Adw.SwitchRow({
            title: _('Gemini (Weekly Limit)'),
            subtitle: _('Show remaining percentage for Gemini weekly limit.'),
        });
        settings.bind('show-gemini-weekly', rowGeminiWeekly, 'active', Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(rowGeminiWeekly);

        const rowClaude5h = new Adw.SwitchRow({
            title: _('Claude & GPT (5-Hour Rolling Limit)'),
            subtitle: _('Show remaining percentage for 3P models 5h limit.'),
        });
        settings.bind('show-claude-5h', rowClaude5h, 'active', Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(rowClaude5h);

        const rowClaudeWeekly = new Adw.SwitchRow({
            title: _('Claude & GPT (Weekly Limit)'),
            subtitle: _('Show remaining percentage for 3P models weekly limit.'),
        });
        settings.bind('show-claude-weekly', rowClaudeWeekly, 'active', Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(rowClaudeWeekly);

        // Formatting Group
        const formatGroup = new Adw.PreferencesGroup({
            title: _('Format & Appearance'),
            description: _('Configure visual layout and information in the top bar.'),
        });
        page.add(formatGroup);

        const rowTopBarIcon = new Adw.SwitchRow({
            title: _('Show Top Bar Logo'),
            subtitle: _('Display the brand logo in the top panel.'),
        });
        settings.bind('show-top-bar-icon', rowTopBarIcon, 'active', Gio.SettingsBindFlags.DEFAULT);
        formatGroup.add(rowTopBarIcon);

        const rowCountdown = new Adw.SwitchRow({
            title: _('Show Reset Time Countdown'),
            subtitle: _('Show remaining time until quota reset (e.g. 2h 06m).'),
        });
        settings.bind('show-reset-countdown', rowCountdown, 'active', Gio.SettingsBindFlags.DEFAULT);
        formatGroup.add(rowCountdown);

        const rowCompact = new Adw.SwitchRow({
            title: _('Compact Abbreviations'),
            subtitle: _('Use short labels (GEM, 3P) instead of full model names.'),
        });
        settings.bind('compact-labels', rowCompact, 'active', Gio.SettingsBindFlags.DEFAULT);
        formatGroup.add(rowCompact);

        // Refresh Interval Group
        const refreshGroup = new Adw.PreferencesGroup({
            title: _('Sync Settings'),
            description: _('Configure background refresh interval.'),
        });
        page.add(refreshGroup);

        const rowInterval = new Adw.SpinRow({
            title: _('Refresh Interval (seconds)'),
            subtitle: _('How often to fetch latest quota from agy.'),
            adjustment: new Gtk.Adjustment({
                lower: 30,
                upper: 600,
                step_increment: 15,
                page_increment: 60,
                value: settings.get_int('refresh-interval'),
            }),
        });
        settings.bind('refresh-interval', rowInterval, 'value', Gio.SettingsBindFlags.DEFAULT);
        refreshGroup.add(rowInterval);
    }
}
