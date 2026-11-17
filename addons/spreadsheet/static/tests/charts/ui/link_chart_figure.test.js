import { click } from "@weth/hoot-dom";
import { animationFrame } from "@weth/hoot-mock";
import { expect, test, beforeEach } from "@weth/hoot";
import { getBasicData, defineSpreadsheetModels } from "@spreadsheet/../tests/helpers/data";
import { createBasicChart } from "@spreadsheet/../tests/helpers/commands";
import { mountSpreadsheet } from "@spreadsheet/../tests/helpers/ui";
import { createModelWithDataSource } from "@spreadsheet/../tests/helpers/model";
import { mockService, serverState } from "@web/../tests/web_test_helpers";
import { insertChartInSpreadsheet } from "@spreadsheet/../tests/helpers/chart";
import { createSpreadsheetWithPivot } from "@spreadsheet/../tests/helpers/pivot";

defineSpreadsheetModels();

/**
 * @typedef {import("@spreadsheet/../tests/helpers/data").ServerData} ServerData
 */

const chartId = "uuid1";
let serverData = /** @type {ServerData} */ ({});

/**
 * The chart menu is hidden by default, and visible on :hover, but this property
 * can't be triggered programmatically, so we artificially make it visible to be
 * able to interact with it.
 */
async function showChartMenu(fixture) {
    const chartMenu = fixture.querySelector(".w-chart-menu-item");
    chartMenu.style.display = "flex";
    await animationFrame();
}

/** Click on external link of the first chart found in the page*/
async function clickChartExternalLink(fixture) {
    await showChartMenu(fixture);
    const chartMenuItem = fixture.querySelector(".w-chart-menu-item[data-id='chartWethLink']");
    await click(chartMenuItem);
    await animationFrame();
}

function mockActionService(doActionStep) {
    const fakeActionService = {
        doAction: async (actionRequest, options = {}) => {
            if (actionRequest === "menuAction2" || actionRequest.xml_id === "menuAction2") {
                expect.step(doActionStep);
            }
        },
    };
    mockService("action", fakeActionService);
}

beforeEach(() => {
    serverData = {};
    serverData.menus = {
        1: {
            id: 1,
            name: "test menu 1",
            xmlid: "spreadsheet.test.menu",
            appID: 1,
            actionID: "menuAction",
        },
        2: {
            id: 2,
            name: "test menu 2",
            xmlid: "spreadsheet.test.menu2",
            appID: 1,
            actionID: "menuAction2",
        },
        3: {
            id: 3,
            name: "test menu 2",
            xmlid: "spreadsheet.test.menu_without_action",
            appID: 1,
        },
    };
    serverData.actions = {
        menuAction: {
            id: 99,
            xml_id: "menuAction",
            name: "menuAction",
            res_model: "ir.ui.menu",
            type: "ir.actions.act_window",
            views: [[false, "list"]],
        },
        menuAction2: {
            id: 100,
            xml_id: "menuAction2",
            name: "menuAction2",
            res_model: "ir.ui.menu",
            type: "ir.actions.act_window",
            views: [[false, "list"]],
        },
    };
    serverData.models = {
        ...getBasicData(),
        "ir.ui.menu": {
            records: [
                { id: 1, name: "test menu 1", action: "action1", group_ids: [10] },
                { id: 2, name: "test menu 2", action: "action2", group_ids: [10] },
            ],
        },
        "res.group": { records: [{ id: 10, name: "test group" }] },
        "res.users": {
            records: [{ id: 1, active: true, partner_id: serverState.partnerId, name: "Raoul" }],
        },
        "ir.actions": { records: [{ id: 1 }] },
    };
    serverState.userId = 1;
});

test("icon external link isn't on the chart when its not linked to an weth menu", async function () {
    const { model } = await createModelWithDataSource({
        serverData,
    });
    const fixture = await mountSpreadsheet(model);
    createBasicChart(model, chartId);
    await animationFrame();
    const wethMenu = model.getters.getChartWethLink(chartId);
    expect(wethMenu).toBe(undefined, { message: "No menu linked with the chart" });

    const externalRefIcon = fixture.querySelector(".w-chart-menu-item[data-id='chartWethLink']");
    expect(externalRefIcon).toBe(null);
});

test("icon external link is on the chart when its linked to an weth menu", async function () {
    const { model } = await createModelWithDataSource({
        serverData,
    });
    await mountSpreadsheet(model);
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "wethMenu", wethMenuId: 1 },
    });

    const dataSourceLink = model.getters.getChartWethLink(chartId);
    expect(dataSourceLink).toMatchObject(
        { type: "wethMenu", wethMenuId: 1 },
        { message: "WETH Menu is linked to chart" }
    );
    await animationFrame();
    expect(".w-chart-menu-item[data-id='chartWethLink']").toHaveCount(1);
});

test("icon external link is not on the chart when its linked to a wrong menu", async function () {
    const { model } = await createModelWithDataSource({
        serverData,
    });
    await mountSpreadsheet(model);
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "wethMenu", wethMenuId: "menu which does not exist" },
    });
    const chartMenu = model.getters.getChartWethLink(chartId);
    expect(chartMenu).toBe(undefined, { message: "cannot get a wrong menu" });
    await animationFrame();
    expect(".w-chart-menu-item[data-id='chartWethLink']").toHaveCount(0);
});

test("icon external link is on the chart when its linked to an weth datasource", async function () {
    const { model } = await createModelWithDataSource({
        serverData,
    });
    await mountSpreadsheet(model);
    const dataSourceCoreId = insertChartInSpreadsheet(model);
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { dataSourceCoreId, type: "dataSource", dataSourceType: "chart" },
    });

    const dataSourceLink = model.getters.getChartWethLink(chartId);
    expect(dataSourceLink).toMatchObject(
        { dataSourceCoreId, type: "dataSource", dataSourceType: "chart" },
        { message: "WETH datasource is linked to chart" }
    );
    await animationFrame();
    expect(".w-chart-menu-item[data-id='chartWethLink']").toHaveCount(1);
});

test("icon external link is not on the chart when its linked to an invalid datasource", async function () {
    const { model } = await createModelWithDataSource({
        serverData,
    });
    await mountSpreadsheet(model);
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: {
            type: "dataSource",
            dataSourceCoreId: "ds which does not exist",
            dataSourceType: "pivot",
        },
    });
    const chartLink = model.getters.getChartWethLink(chartId);
    expect(chartLink).toBe(undefined, { message: "cannot get an inexisting datasource" });
    await animationFrame();
    expect(".w-chart-menu-item[data-id='chartWethLink']").toHaveCount(0);
});

test("icon external link isn't on the chart in dashboard mode", async function () {
    const { model } = await createModelWithDataSource({
        serverData,
    });
    await mountSpreadsheet(model);
    const dataSourceCoreId = insertChartInSpreadsheet(model);
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { dataSourceCoreId, type: "dataSource", dataSourceType: "chart" },
    });
    const chartLink = model.getters.getChartWethLink(chartId);
    expect(chartLink).toEqual(
        { dataSourceCoreId, type: "dataSource", dataSourceType: "chart" },
        { message: "WETH menu is linked to chart" }
    );
    model.updateMode("dashboard");
    await animationFrame();
    expect(".w-chart-menu-item[data-id='chartWethLink']").toHaveCount(0, {
        message: "No link icon in dashboard",
    });
});

test("click on icon external link on chart redirect to the weth menu", async function () {
    const doActionStep = "doAction";
    mockActionService(doActionStep);

    const { model } = await createModelWithDataSource({
        serverData,
    });
    const fixture = await mountSpreadsheet(model);

    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "wethMenu", wethMenuId: 2 },
    });
    const chartMenu = model.getters.getChartWethLink(chartId);
    expect(chartMenu).toEqual(
        { type: "wethMenu", wethMenuId: 2 },
        { message: "WETH menu is linked to chart" }
    );
    await animationFrame();

    await clickChartExternalLink(fixture);

    expect.verifySteps([doActionStep]);
});

test("can use menus xmlIds instead of menu ids", async function () {
    mockActionService("doAction");
    const { model } = await createModelWithDataSource({
        serverData,
    });
    const fixture = await mountSpreadsheet(model);

    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "wethMenu", wethMenuId: "spreadsheet.test.menu2" },
    });
    await animationFrame();

    await clickChartExternalLink(fixture);

    expect.verifySteps(["doAction"]);
});

test("Trying to open a menu without an action sends a notification to the user", async function () {
    mockActionService("doAction");
    mockService("notification", {
        add: (message) => {
            expect.step(message);
            return () => { };
        },
    });

    const { model } = await createModelWithDataSource({
        serverData,
    });
    const fixture = await mountSpreadsheet(model);

    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "wethMenu", wethMenuId: "spreadsheet.test.menu_without_action" },
    });
    await animationFrame();

    await clickChartExternalLink(fixture);

    const expectedNotificationMessage =
        "The menu linked to this chart doesn't have an corresponding action. Please link the chart to another menu.";
    // Notification was send and doAction wasn't called
    expect.verifySteps([expectedNotificationMessage]);
});

test("click on icon external link on chart redirect to the datasource action", async function () {
    const doActionStep = "doAction";
    mockActionService(doActionStep);

    const { model, pivotId } = await createSpreadsheetWithPivot({
        serverData,
        actionXmlId: "menuAction2",
    });
    const fixture = await mountSpreadsheet(model);

    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { dataSourceCoreId: pivotId, type: "dataSource", dataSourceType: "pivot" },
    });
    const chartLink = model.getters.getChartWethLink(chartId);
    expect(chartLink).toEqual(
        { dataSourceCoreId: pivotId, type: "dataSource", dataSourceType: "pivot" },
        { message: "WETH menu is linked to chart" }
    );
    await animationFrame();

    await clickChartExternalLink(fixture);

    expect.verifySteps([doActionStep]);
});
