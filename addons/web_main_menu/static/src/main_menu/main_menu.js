import { Component, computed, onWillDestroy, signal, useProps } from "@odoo/owl";
import { browser } from "@web/core/browser/browser";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { useService } from "@web/core/utils/hooks";
import { capitalize } from "@web/core/utils/strings";
import { computeAppsAndMenuItems } from "@web/webclient/menus/menu_helpers";
import { standardActionServiceProps } from "@web/webclient/actions/action_plugin";
import { arrangeApps, getAppKey, MAIN_MENU_XMLID } from "./main_menu_layout";

const { DateTime } = luxon;

export function getGreeting(hour, userName) {
    const name = (userName || "").trim().split(/\s+/)[0];
    if (hour >= 5 && hour < 12) {
        return _t("Bom dia, %(name)s", { name });
    }
    if (hour >= 12 && hour < 19) {
        return _t("Boa tarde, %(name)s", { name });
    }
    return _t("Boa noite, %(name)s", { name });
}

export function formatDayAndTime(dateTime) {
    const localized = dateTime.setLocale("pt-BR");
    const day = localized.toLocaleString({ weekday: "long", day: "numeric", month: "long" });
    const time = localized.toLocaleString(DateTime.TIME_SIMPLE);
    return `${capitalize(day)} · ${time}`;
}

export class MainMenu extends Component {
    static template = "web_main_menu.MainMenu";
    props = useProps({
        ...standardActionServiceProps,
    });
    getAppKey = getAppKey;

    setup() {
        this.menuService = useService("menu");
        this.storedLayout = signal(user.settings?.main_menu_layout);
        this.apps = computed(() =>
            computeAppsAndMenuItems(this.menuService.getMenuAsTree("root")).apps.filter(
                (app) => app.xmlid !== MAIN_MENU_XMLID
            )
        );
        this.layout = computed(() => arrangeApps(this.apps(), this.storedLayout()));
        this.now = signal(DateTime.now());
        this.greeting = computed(() => getGreeting(this.now().hour, user.name));
        this.dayAndTime = computed(() => formatDayAndTime(this.now()));
        this.scheduleClockUpdate();
        onWillDestroy(() => browser.clearTimeout(this.clockTimeout));
    }

    scheduleClockUpdate() {
        const delay = 60000 - (DateTime.now().toMillis() % 60000);
        this.clockTimeout = browser.setTimeout(() => {
            this.now.set(DateTime.now());
            this.scheduleClockUpdate();
        }, delay);
    }

    getDisplayedSections(layout) {
        return layout.sections.filter((section) => section.apps.length);
    }

    openApp(app) {
        return this.menuService.selectMenu(app.id);
    }
}

registry.category("actions").add("web_main_menu.action_open_main_menu", MainMenu);
