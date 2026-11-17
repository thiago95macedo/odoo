import { components } from "@weth/o-spreadsheet";
import { patch } from "@web/core/utils/patch";

patch(components.ChartJsComponent.prototype, {
    createChart(chartData) {
        if (this.env.model.getters.isDashboard()) {
            chartData = this.addWethDataSourcePluginToChartData(chartData);
        }
        super.createChart(chartData);
    },
    updateChartJs(chartData) {
        if (this.env.model.getters.isDashboard()) {
            chartData = this.addWethDataSourcePluginToChartData(chartData);
        }
        super.updateChartJs(chartData);
    },
    addWethDataSourcePluginToChartData(chartData) {
        chartData.chartJsConfig.options.plugins.chartJsWethLinkPlugin = {
            env: this.env,
            chartId: this.props.chartId,
        };
        return chartData;
    },
});
