import { _t } from "@web/core/l10n/translation";


export const MAIN_MENU_XMLID = "web_main_menu.web_main_menu_root";
export const SECTION_NAME_MAX_LENGTH = 64;

export function getAppKey(app) {
    return app.xmlid || String(app.id);
}

export function normalizeLayout(layout) {
    const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
    const isId = (value) => typeof value === "string" || typeof value === "number";
    const placedKeys = new Set();
    const toKeys = (keys) =>
        (Array.isArray(keys) ? keys : []).flatMap((key) => {
            if (!isId(key) || placedKeys.has(String(key))) {
                return [];
            }
            placedKeys.add(String(key));
            return [String(key)];
        });
    const sectionIds = new Set();
    const storedSections = isObject(layout) && Array.isArray(layout.sections) ? layout.sections : [];
    const sections = storedSections.flatMap((section) => {
        const id = isObject(section) && isId(section.id) ? String(section.id) : "";
        if (!id || sectionIds.has(id)) {
            return [];
        }
        sectionIds.add(id);
        const name = typeof section.name === "string" ? section.name.trim() : "";
        return [
            {
                id,
                name: name.slice(0, SECTION_NAME_MAX_LENGTH) || String(_t("Nova seção")),
                apps: toKeys(section.apps),
            },
        ];
    });
    return { sections, apps: toKeys(isObject(layout) ? layout.apps : []) };
}

export function arrangeApps(apps, layout) {
    const { sections, apps: keys } = normalizeLayout(layout);
    const appsByKey = new Map(apps.map((app) => [getAppKey(app), app]));
    const take = (keys) =>
        keys.flatMap((key) => {
            const app = appsByKey.get(key);
            appsByKey.delete(key);
            return app ? [app] : [];
        });
    return {
        sections: sections.map((section) => ({ ...section, apps: take(section.apps) })),
        apps: [...take(keys), ...appsByKey.values()],
    };
}

