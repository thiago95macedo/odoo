import { patch } from "@web/core/utils/patch";
import * as spreadsheet from "@weth/o-spreadsheet";
import { navigateToWethlinkFromChart } from "../../weth_chart/weth_chart_helpers";
import { _t } from "@web/core/l10n/translation";

patch(spreadsheet.components.ChartMenu.prototype, {
    getMenuItems() {
        const items = super.getMenuItems();
        if (this.hasWethLink && !this.env.model.getters.isDashboard()) {
            items.push({
                id: "chartWethLink",
                label: _t("Chart WETH Link"),
                icon: "o-spreadsheet-Icon.EXTERNAL",
                onClick: (ev) => this.navigateToWethLink(false),
            });
        }
        return items;
    },
    async navigateToWethLink(newWindow) {
        await navigateToWethlinkFromChart(this.env, this.props.chartId, newWindow);
    },
    get hasWethLink() {
        return this.env.model.getters.getChartWethLink(this.props.chartId) !== undefined;
    },
});
