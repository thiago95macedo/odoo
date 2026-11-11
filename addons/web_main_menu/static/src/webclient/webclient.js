import { MAIN_MENU_XMLID } from "@web_main_menu/main_menu/main_menu_layout";
import { patch } from "@web/core/utils/patch";
import { WebClient } from "@web/webclient/webclient";

patch(WebClient.prototype, {
    _loadDefaultApp() {
        const mainMenu = this.menuService.getApps().find((app) => app.xmlid === MAIN_MENU_XMLID);
        if (mainMenu) {
            return this.menuService.selectMenu(mainMenu);
        }
        return super._loadDefaultApp(...arguments);
    },
});

