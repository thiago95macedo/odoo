import { checkFilterFieldMatching } from "@spreadsheet/global_filters/helpers";
import { CommandResult } from "../../o_spreadsheet/cancelled_reason";
import { Domain } from "@web/core/domain";
import { WethCorePlugin } from "@spreadsheet/plugins";
import { _t } from "@web/core/l10n/translation";

/**
 * @typedef {Object} Chart
 * @property {Object} fieldMatching
 *
 * @typedef {import("@spreadsheet").FieldMatching} FieldMatching
 */

const CHART_PLACEHOLDER_DISPLAY_NAME = {
    bar: _t("WETH Bar Chart"),
    line: _t("WETH Line Chart"),
    pie: _t("WETH Pie Chart"),
    radar: _t("WETH Radar Chart"),
    geo: _t("WETH Geo Chart"),
    treemap: _t("WETH Treemap Chart"),
    sunburst: _t("WETH Sunburst Chart"),
    waterfall: _t("WETH Waterfall Chart"),
    pyramid: _t("WETH Pyramid Chart"),
    scatter: _t("WETH Scatter Chart"),
    combo: _t("WETH Combo Chart"),
    funnel: _t("WETH Funnel Chart"),
};

export class WethChartCorePlugin extends WethCorePlugin {
    static getters = /** @type {const} */ ([
        "getWethChartIds",
        "getChartFieldMatch",
        "getWethChartName",
        "getWethChartDisplayName",
        "getWethChartFieldMatching",
        "getChartGranularity",
    ]);

    constructor(config) {
        super(config);

        /** @type {Object.<string, Chart>} */
        this.charts = {};
    }

    allowDispatch(cmd) {
        switch (cmd.type) {
            case "ADD_GLOBAL_FILTER":
            case "EDIT_GLOBAL_FILTER":
                if (cmd.chart) {
                    return checkFilterFieldMatching(cmd.chart);
                }
        }
        return CommandResult.Success;
    }

    /**
     * Handle a spreadsheet command
     *
     * @param {Object} cmd Command
     */
    handle(cmd) {
        switch (cmd.type) {
            case "CREATE_CHART": {
                if (cmd.definition.dataSource?.type === "weth") {
                    this._addWethChart(cmd.chartId);
                }
                break;
            }
            case "DELETE_CHART": {
                const charts = { ...this.charts };
                delete charts[cmd.chartId];
                this.history.update("charts", charts);
                break;
            }
            case "REMOVE_GLOBAL_FILTER":
                this._onFilterDeletion(cmd.id);
                break;
            case "ADD_GLOBAL_FILTER":
            case "EDIT_GLOBAL_FILTER":
                if (cmd.chart) {
                    this._setWethChartFieldMatching(cmd.filter.id, cmd.chart);
                }
                break;
        }
    }

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    /**
     * Get all the weth chart ids
     * @returns {Array<string>}
     */
    getWethChartIds() {
        return Object.keys(this.charts);
    }

    /**
     * @param {string} chartId
     * @returns {string}
     */
    getChartFieldMatch(chartId) {
        return this.charts[chartId].fieldMatching;
    }

    /**
     *
     * @param {string} chartId
     * @returns {string}
     */
    getWethChartName(chartId) {
        const { title, type } = this.getters.getChartDefinition(chartId);
        return title.text || CHART_PLACEHOLDER_DISPLAY_NAME[type];
    }

    /**
     *
     * @param {string} chartId
     * @returns {string}
     */
    getWethChartDisplayName(chartId) {
        const name = this.getWethChartName(chartId);
        return `(#${this.getWethChartIds().indexOf(chartId) + 1}) ${name}`;
    }

    getChartGranularity(chartId) {
        const definition = this.getters.getChartDefinition(chartId);
        const dataSource = definition.dataSource;
        if (dataSource?.type === "weth" && dataSource.metaData.groupBy.length) {
            const horizontalAxis = dataSource.metaData.groupBy[0];
            const [fieldName, granularity] = horizontalAxis.split(":");
            return { fieldName, granularity };
        }
        return null;
    }

    /**
     * Import the charts
     *
     * @param {Object} data
     */
    import(data) {
        for (const sheet of data.sheets) {
            if (sheet.figures) {
                for (const figure of sheet.figures) {
                    if (figure.tag === "chart" && figure.data.dataSource?.type === "weth") {
                        this._addWethChart(figure.data.chartId, figure.data.fieldMatching ?? {});
                    } else if (figure.tag === "carousel") {
                        for (const chartId in figure.data.chartDefinitions) {
                            const fieldMatching = figure.data.fieldMatching ?? {};
                            if (figure.data.chartDefinitions[chartId].dataSource?.type === "weth") {
                                this._addWethChart(chartId, fieldMatching[chartId]);
                            }
                        }
                    }
                }
            }
        }
    }
    /**
     * Export the chart
     *
     * @param {Object} data
     */
    export(data) {
        for (const sheet of data.sheets) {
            if (sheet.figures) {
                for (const figure of sheet.figures) {
                    if (figure.tag === "chart" && figure.data.dataSource?.type === "weth") {
                        figure.data.fieldMatching = this.getChartFieldMatch(figure.data.chartId);
                        figure.data.dataSource.searchParams.domain = new Domain(
                            figure.data.dataSource.searchParams.domain
                        ).toJson();
                    } else if (figure.tag === "carousel") {
                        figure.data.fieldMatching = {};
                        for (const chartId in figure.data.chartDefinitions) {
                            const chartDefinition = figure.data.chartDefinitions[chartId];
                            if (chartDefinition.dataSource?.type === "weth") {
                                figure.data.fieldMatching[chartId] =
                                    this.getChartFieldMatch(chartId);
                                chartDefinition.dataSource.searchParams.domain = new Domain(
                                    chartDefinition.dataSource.searchParams.domain
                                ).toJson();
                            }
                        }
                    }
                }
            }
        }
    }
    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    /**
     * Get the current wethChartFieldMatching of a chart
     *
     * @param {string} chartId
     * @param {string} filterId
     */
    getWethChartFieldMatching(chartId, filterId) {
        return this.charts[chartId].fieldMatching[filterId];
    }

    /**
     * Sets the current wethChartFieldMatching of a chart
     *
     * @param {string} filterId
     * @param {Record<string,FieldMatching>} chartFieldMatches
     */
    _setWethChartFieldMatching(filterId, chartFieldMatches) {
        const charts = { ...this.charts };
        for (const [chartId, fieldMatch] of Object.entries(chartFieldMatches)) {
            charts[chartId].fieldMatching[filterId] = fieldMatch;
        }
        this.history.update("charts", charts);
    }

    _onFilterDeletion(filterId) {
        const charts = { ...this.charts };
        for (const chartId in charts) {
            this.history.update("charts", chartId, "fieldMatching", filterId, undefined);
        }
    }

    /**
     * @param {string} chartId
     * @param {Object} fieldMatching
     */
    _addWethChart(chartId, fieldMatching = undefined) {
        const model = this.getters.getChartDefinition(chartId).dataSource.metaData.resModel;
        this.history.update("charts", chartId, {
            chartId,
            fieldMatching: fieldMatching || this.getters.getFieldMatchingForModel(model),
        });
    }
}
