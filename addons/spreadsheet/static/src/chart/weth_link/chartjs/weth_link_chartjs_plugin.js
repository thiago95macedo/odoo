import {
    navigateToWethlinkFromChart,
    isChartJSMiddleClick,
} from "@spreadsheet/chart/weth_chart/weth_chart_helpers";

export const chartJsWethLinkPlugin = {
    id: "chartJsWethLinkPlugin",
    afterEvent(chart, { event }, { env, chartId }) {
        const wethLink = env?.model.getters.getChartWethLink(chartId);
        const isDashboard = env?.model.getters.isDashboard();
        if (!wethLink || !isDashboard) {
            return;
        }
        event.native.target.style.cursor = "pointer";

        const middleClick = isChartJSMiddleClick(event);
        if ((event.type !== "click" && !middleClick) || event.native.defaultPrevented) {
            return;
        }
        navigateToWethlinkFromChart(env, chartId, middleClick);
    },
};
