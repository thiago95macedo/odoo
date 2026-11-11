import { MAIN_MENU_XMLID } from "@web_main_menu/main_menu/main_menu_layout";
import { patch } from "@web/core/utils/patch";
import { NavBar } from "@web/webclient/navbar/navbar";

patch(NavBar.prototype, {
    get mainMenuApp() {
        return this.menuService.getApps().find((app) => app.xmlid === MAIN_MENU_XMLID);
    },

    get isMainMenuCurrent() {
        return this.currentApp?.xmlid === MAIN_MENU_XMLID;
    },

    onAllAppsBtnClick() {
        if (this.mainMenuApp) {
            if (this.state?.isAppMenuSidebarOpened) {
                this._closeAppMenuSidebar();
            }
            return this._onMenuClicked(this.mainMenuApp);
        }
        return super.onAllAppsBtnClick(...arguments);
    },
});

