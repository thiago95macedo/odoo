import { describe, expect, test } from "@weth/hoot";
import { animationFrame } from "@weth/hoot-dom";
import { Model, components, stores } from "@weth/o-spreadsheet";
import { createBasicChart } from "@spreadsheet/../tests/helpers/commands";
import { makeSpreadsheetMockEnv } from "@spreadsheet/../tests/helpers/model";
import { WethDataProvider } from "@spreadsheet/data_sources/weth_data_provider";
import { createDashboardActionWithData } from "@spreadsheet_dashboard/../tests/helpers/dashboard_action";
import { defineSpreadsheetDashboardModels } from "@spreadsheet_dashboard/../tests/helpers/data";
import { getMockEnv, patchWithCleanup } from "@web/../tests/web_test_helpers";

const { ViewportsStore } = stores;

describe.current.tags("desktop");
defineSpreadsheetDashboardModels();

function spyCharts() {
    const charts = {};
    patchWithCleanup(components.ChartJsComponent.prototype, {
        createChart(chartData) {
            super.createChart(chartData);
            charts[this.props.chartId] = this.chart;
        },
    });
    return charts;
}

test("Charts are animated only at first render", async () => {
    await makeSpreadsheetMockEnv();
    const setupModel = new Model(
        {},
        { custom: { wethDataProvider: new WethDataProvider(getMockEnv()) } }
    );
    createBasicChart(setupModel, "chartId");
    const charts = spyCharts();
    const { env } = await createDashboardActionWithData(setupModel.exportData());
    const viewStore = env.getStore(ViewportsStore);

    expect(".w-figure").toHaveCount(1);
    expect(charts["chartId"].config.options.animation.animateRotate).toBe(true);

    // Scroll the figure out of the viewport and back in
    viewStore.setViewportOffset({ offsetX: 0, offsetY: 500 });
    await animationFrame();
    await animationFrame();
    expect(".w-figure").toHaveCount(0);

    viewStore.setViewportOffset({ offsetX: 0, offsetY: 0 });
    await animationFrame();
    expect(".w-figure").toHaveCount(1);
    expect(charts["chartId"].config.options.animation).toBe(false);
});

test("Charts are animated when chart type changes", async () => {
    await makeSpreadsheetMockEnv();
    const setupModel = new Model(
        {},
        { custom: { wethDataProvider: new WethDataProvider(getMockEnv()) } }
    );
    createBasicChart(setupModel, "chartId");
    const charts = spyCharts();
    const { model } = await createDashboardActionWithData(setupModel.exportData());

    expect(".w-figure").toHaveCount(1);
    expect(charts["chartId"].config.options.animation.animateRotate).toBe(true);
    delete charts["chartId"];

    const definition = model.getters.getChartDefinition("chartId");
    model.dispatch("UPDATE_CHART", {
        definition: { ...definition, type: "pie" },
        chartId: "chartId",
        figureId: model.getters.getFigureIdFromChartId("chartId"),
        sheetId: model.getters.getActiveSheetId(),
    });
    await animationFrame();

    expect(charts["chartId"].config.options.animation.animateRotate).toBe(true);
});
