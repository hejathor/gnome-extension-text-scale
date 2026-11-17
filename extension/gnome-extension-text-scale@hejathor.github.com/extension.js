
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { Extension } from
    'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from
    'resource:///org/gnome/shell/ui/quickSettings.js';

const STYLE = {
    // Space between icon and first button
    iconButtonGap: 1.0,

    // Space between preset buttons
    buttonGap: 0.5,

    // Vertical padding inside each button
    buttonPaddingVertical: 0.4,

    // Button corner rounding
    buttonRadius: 0.45,
};

const KEY = 'text-scaling-factor';
const PRESETS = [0.50, 0.75, 1.00, 1.25, 1.50];

const em = value => `${value}em`;

const TextScalingButtons = GObject.registerClass(
class TextScalingButtons extends QuickSettings.QuickSettingsItem {
    _init(settings) {
        super._init({
            style_class: 'quick-settings-item',
            can_focus: true,
            accessible_name: 'Text scale presets',
        });

        this._settings = settings;
        this._buttons = [];

        // Main row
        const row = new St.BoxLayout({
            style_class: 'quick-slider',
            vertical: false,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style: `spacing: ${em(STYLE.iconButtonGap)};`,
        });

        // GNOME-native QuickSlider icon button
        const icon = new St.Icon({
            icon_name: 'zoom-in-symbolic',
        });

        const iconButton = new St.Button({
            child: icon,
            style_class: 'icon-button flat',
            can_focus: true,
            x_expand: false,
            y_expand: true,
            accessible_name: 'Text scaling',
        });

        row.add_child(iconButton);

        // Preset buttons
        const buttonBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style: `spacing: ${em(STYLE.buttonGap)};`,
        });

        for (const scale of PRESETS) {
            const label = scale.toFixed(2);

            const button = new St.Button({
                label,
                toggle_mode: true,
                can_focus: true,
                x_expand: true,
                style_class: 'button',
                accessible_name: `${label} text scale`,
                style: `
                    padding-top: ${em(STYLE.buttonPaddingVertical)};
                    padding-bottom: ${em(STYLE.buttonPaddingVertical)};
                    border-radius: ${em(STYLE.buttonRadius)};
                `,
            });

            button.connect('clicked', () => {
                this._settings.set_double(KEY, scale);
            });

            this._buttons.push({ button, scale });
            buttonBox.add_child(button);
        }

        row.add_child(buttonBox);
        this.add_child(row);

        // Watch for external text scaling changes
        this._settingsChangedId = this._settings.connect(
            `changed::${KEY}`,
            () => this._sync()
        );

        this._sync();
    }

    _sync() {
        const value = this._settings.get_double(KEY);

        for (const { button, scale } of this._buttons) {
            button.checked = Math.abs(value - scale) < 0.001;
        }
    }

    destroy() {
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }

        super.destroy();
    }
});

const TextScalingIndicator = GObject.registerClass(
class TextScalingIndicator extends QuickSettings.SystemIndicator {
    _init(settings) {
        super._init();

        this.quickSettingsItems.push(
            new TextScalingButtons(settings)
        );
    }

    destroy() {
        this.quickSettingsItems.forEach(item => item.destroy());
        super.destroy();
    }
});

export default class TextScaleExtension extends Extension {
    enable() {
        this._settings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.interface',
        });

        this._indicator = new TextScalingIndicator(this._settings);

        Main.panel.statusArea.quickSettings.addExternalIndicator(
            this._indicator,
            2
        );
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
        this._settings = null;
    }
}
