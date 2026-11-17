import { beforeEach, describe, expect, test } from "@weth/hoot";
import { click, queryAll } from "@weth/hoot-dom";
import { animationFrame } from "@weth/hoot-mock";
import {
    contains,
    defineActions,
    defineMenus,
    getService,
    mountWithCleanup,
    patchWithCleanup,
    useTestClientAction,
} from "@web/../tests/web_test_helpers";
import { config as transitionConfig } from "@web/core/transition";
import { WebClient } from "@web/webclient/webclient";
import { registry } from "@web/core/registry";

describe.current.tags("mobile");

beforeEach(() => {
    const testAction = useTestClientAction();
    defineActions([
        { ...testAction, id: 1001, params: { description: "Id 1" } },
        { ...testAction, id: 1002, params: { description: "Info" } },
        { ...testAction, id: 1003, params: { description: "Report" } },
    ]);
    defineMenus([
        { id: 0 }, // prevents auto-loading the first action
        { id: 1, name: "App1", actionID: 1001, xmlid: "menu_1" },
    ]);
    patchWithCleanup(transitionConfig, { disabled: true });
});

test("Burger menu can be opened and closed", async () => {
    await mountWithCleanup(WebClient);
    await contains(".w_mobile_menu_toggle", { root: document.body }).click();
    expect(queryAll(".w_burger_menu", { root: document.body })).toHaveCount(1);
    await contains(".w_sidebar_close", { root: document.body }).click();
    expect(queryAll(".w_burger_menu", { root: document.body })).toHaveCount(0);
});

test("Burger Menu on an App", async () => {
    defineMenus([
        {
            id: 1,
            children: [
                {
                    id: 99,
                    name: "SubMenu",
                    appID: 1,
                    actionID: 1002,
                    xmlid: "",
                    webIconData: undefined,
                    webIcon: false,
                },
            ],
        },
    ]);
    await mountWithCleanup(WebClient);
    await contains("a.w_menu_toggle", { root: document.body }).click();
    await contains(".w_sidebar_topbar a.btn-primary", { root: document.body }).click();
    await contains(".w_burger_menu_content li:nth-of-type(2)", { root: document.body }).click();

    expect(queryAll(".w_burger_menu_content", { root: document.body })).toHaveCount(0);

    await contains("a.w_menu_toggle", { root: document.body }).click();

    expect(
        queryAll(".w_app_menu_sidebar nav.w_burger_menu_content", { root: document.body })
    ).toHaveText("App1\nSubMenu");
    await click(".modal-backdrop", { root: document.body });
    await contains(".w_mobile_menu_toggle", { root: document.body }).click();
    expect(queryAll(".w_burger_menu", { root: document.body })).toHaveCount(1);
    expect(
        queryAll(".w_burger_menu nav.w_burger_menu_content", { root: document.body })
    ).toHaveCount(1);

    expect(queryAll(".w_burger_menu_content", { root: document.body })).toHaveClass(
        "o_burger_menu_app"
    );

    await click(".w_sidebar_topbar", { root: document.body });

    expect(queryAll(".w_burger_menu_content", { root: document.body })).not.toHaveClass(
        "o_burger_menu_dark"
    );

    await click(".w_sidebar_topbar", { root: document.body });

    expect(queryAll(".w_burger_menu_content", { root: document.body })).toHaveClass(
        "o_burger_menu_app"
    );
});

test("Burger Menu on an App without SubMenu", async () => {
    await mountWithCleanup(WebClient);
    await contains("a.w_menu_toggle", { root: document.body }).click();
    await contains(".w_sidebar_topbar a.btn-primary", { root: document.body }).click();
    await contains(".w_burger_menu_content li:nth-of-type(2)", { root: document.body }).click();

    expect(queryAll(".w_burger_menu", { root: document.body })).toHaveCount(0);

    await contains(".w_mobile_menu_toggle", { root: document.body }).click();
    expect(queryAll(".w_burger_menu", { root: document.body })).toHaveCount(1);
    expect(queryAll(".w_user_menu_mobile", { root: document.body })).toHaveCount(1);
    await click(".w_sidebar_close", { root: document.body });
    expect(queryAll(".w_burger_menu")).toHaveCount(0);
});

test("Burger menu closes when an action is requested", async () => {
    await mountWithCleanup(WebClient);
    await contains(".w_mobile_menu_toggle", { root: document.body }).click();
    expect(queryAll(".w_burger_menu", { root: document.body })).toHaveCount(1);
    expect(queryAll(".test_client_action", { root: document.body })).toHaveCount(0);
    await getService("action").doAction(1001);
    expect(queryAll(".w_burger_menu", { root: document.body })).toHaveCount(0);
    expect(queryAll(".w_kanban_view", { root: document.body })).toHaveCount(0);
    expect(queryAll(".test_client_action", { root: document.body })).toHaveCount(1);
});

test("Burger menu closes when click on menu item", async () => {
    defineMenus([
        {
            id: 1,
            children: [
                {
                    id: 99,
                    name: "SubMenu",
                    actionID: 1002,
                    xmlid: "",
                    webIconData: undefined,
                    webIcon: false,
                },
            ],
        },
        { id: 2, name: "App2", actionID: 1003, xmlid: "menu_2" },
    ]);
    await mountWithCleanup(WebClient);
    getService("menu").setCurrentMenu(2);

    await contains(".w_menu_toggle", { root: document.body }).click();
    expect(
        queryAll(".w_app_menu_sidebar nav.w_burger_menu_content", { root: document.body })
    ).toHaveText("App2");

    await contains("[data-icon='apps']", { root: document.body }).click();
    expect(
        queryAll(".w_app_menu_sidebar nav.w_burger_menu_content", { root: document.body })
    ).toHaveText("App0\nApp1\nApp2");

    await contains(".w_burger_menu_app > ul > li:nth-of-type(2)", { root: document.body }).click();
    expect(queryAll(".w_burger_menu_app")).toHaveCount(0);

    await contains(".w_menu_toggle", { root: document.body }).click();
    expect(queryAll(".w_burger_menu_app", { root: document.body })).toHaveCount(1);
    expect(
        queryAll(".w_app_menu_sidebar nav.w_burger_menu_content", { root: document.body })
    ).toHaveText("App1\nSubMenu");

    await click(".w_burger_menu_content li:nth-of-type(1)", { root: document.body });
    // click
    await animationFrame();
    // action
    await animationFrame();
    // close burger
    await animationFrame();
    expect(queryAll(".w_burger_menu_content", { root: document.body })).toHaveCount(0);
    expect(queryAll(".test_client_action", { root: document.body })).toHaveCount(1);
});

test("Burger menu closes when click on user menu item", async () => {
    registry.category("user_menuitems").add("ring_item", () => ({
        type: "item",
        id: "ring",
        description: "Ring",
        callback: () => {
            expect.step("callback ring_item");
        },
        sequence: 5,
    }));

    await mountWithCleanup(WebClient);

    expect(queryAll(".w_burger_menu", { root: document.body })).toHaveCount(0);

    await click(queryAll(".w_mobile_menu_toggle", { root: document.body }));
    await animationFrame();
    expect(queryAll(".w_burger_menu", { root: document.body })).toHaveCount(1);

    await click(queryAll(".w_burger_menu .w_user_menu_mobile a", { root: document.body }));
    await animationFrame();
    expect(queryAll(".w_burger_menu", { root: document.body })).toHaveCount(0);
    expect.verifySteps(["callback ring_item"]);
});
