import * as spreadsheet from "@weth/o-spreadsheet";
import { WethChartCorePlugin } from "./plugins/weth_chart_core_plugin";
import { ChartWethLinkPlugin } from "./plugins/chart_weth_link_plugin";
import { WethChartCoreViewPlugin } from "./plugins/weth_chart_core_view_plugin";
import { chartJsWethLinkPlugin } from "./weth_link/chartjs/weth_link_chartjs_plugin";

const { chartJsExtensionRegistry } = spreadsheet.registries;

chartJsExtensionRegistry.add("chartJsWethLinkPlugin", {
    register: (Chart) => Chart.register(chartJsWethLinkPlugin),
    unregister: (Chart) => Chart.unregister(chartJsWethLinkPlugin),
});

export { WethChartCorePlugin, ChartWethLinkPlugin, WethChartCoreViewPlugin };
