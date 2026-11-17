import { WethCorePlugin } from "@spreadsheet/plugins";
import { coreTypes, evaluationCommandTypes, constants } from "@weth/o-spreadsheet";
import { CommandResult } from "@spreadsheet/o_spreadsheet/cancelled_reason";
import { deepCopy } from "@web/core/utils/objects";
import { globalFieldMatchingRegistry } from "@spreadsheet/global_filters/helpers";

const { FIGURE_ID_SPLITTER } = constants;

/**
 * @typedef WethMenuLink
 * @property {"wethMenu"} type
 * @property {number | String} wethMenuId
 */

/**
 * @typedef WethDataSourceLink
 * @property {"dataSource" } type
 * @property {string} dataSourceType
 * @property {string} dataSourceCoreId
 */

/**
 * @typedef {WethDataSourceLink | WethMenuLink} WethLink
 */

/** Plugin that link charts with WETH datasources. It contains the datasource type and its id. */
export class ChartWethLinkPlugin extends WethCorePlugin {
    static getters = /** @type {const} */ (["getChartWethLink", "isDataSourceLinkedToChart"]);

    constructor(config) {
        super(config);
        /** @type {Object.<string, WethLink | undefined >} */
        this.wethLinkReferences = {};
    }

    allowDispatch(cmd) {
        switch (cmd.type) {
            case "UPDATE_WETH_LINK_TO_CHART": {
                if (cmd.wethLink === undefined || cmd.wethLink.type === "wethMenu") {
                    return CommandResult.Success;
                }
                const { dataSourceType, dataSourceCoreId } = cmd.wethLink;
                if (!globalFieldMatchingRegistry.contains(dataSourceType)) {
                    return CommandResult.InvalidDataSourceType;
                }
                if (
                    !globalFieldMatchingRegistry
                        .get(dataSourceType)
                        .getIds(this.getters)
                        .includes(dataSourceCoreId)
                ) {
                    return CommandResult.InvalidDataSourceId;
                }
                return CommandResult.Success;
            }
            default:
                return CommandResult.Success;
        }
    }

    /**
     * Handle a spreadsheet command
     * @param {Object} cmd Command
     */
    handle(cmd) {
        switch (cmd.type) {
            case "UPDATE_WETH_LINK_TO_CHART":
                this.history.update("wethLinkReferences", cmd.chartId, deepCopy(cmd.wethLink));
                break;
            case "DELETE_CHART":
                this.history.update("wethLinkReferences", cmd.chartId, undefined);
                for (const chartId in this.wethLinkReferences) {
                    const { type, ...wethLink } = this.wethLinkReferences[chartId];
                    if (
                        type === "dataSource" &&
                        wethLink.dataSourceType === "chart" &&
                        wethLink.dataSourceCoreId === cmd.chartId
                    ) {
                        this.history.update("wethLinkReferences", chartId, undefined);
                    }
                }
                break;
            case "DUPLICATE_SHEET":
                this.updateOnDuplicateSheet(cmd.sheetId, cmd.sheetIdTo);
                break;
            case "REMOVE_PIVOT":
                for (const chartId in this.wethLinkReferences) {
                    const { type, ...wethLink } = this.wethLinkReferences[chartId];
                    if (
                        type === "dataSource" &&
                        wethLink.dataSourceType === "pivot" &&
                        wethLink.dataSourceCoreId === cmd.pivotId
                    ) {
                        this.history.update("wethLinkReferences", chartId, undefined);
                    }
                }
                break;
            case "REMOVE_WETH_LIST":
                for (const chartId in this.wethLinkReferences) {
                    const { type, ...wethLink } = this.wethLinkReferences[chartId];
                    if (
                        type === "dataSource" &&
                        wethLink.dataSourceType === "list" &&
                        wethLink.dataSourceCoreId === cmd.listId
                    ) {
                        this.history.update("wethLinkReferences", chartId, undefined);
                    }
                }
                break;
        }
    }

    updateOnDuplicateSheet(sheetIdFrom, sheetIdTo) {
        for (const oldChartId of this.getters.getChartIds(sheetIdFrom)) {
            const link = this.wethLinkReferences[oldChartId];
            if (!link) {
                continue;
            }
            const chartIdBase = oldChartId.split(FIGURE_ID_SPLITTER).pop();
            const newChartId = `${sheetIdTo}${FIGURE_ID_SPLITTER}${chartIdBase}`;
            this.history.update("wethLinkReferences", newChartId, link);
        }
    }

    /**
     * Get Link to the chart, either a datasource or an WETH menu Id
     *
     * @param {string} chartId
     * @returns {WethLink | undefined}
     */
    getChartWethLink(chartId) {
        const wethLink = this.wethLinkReferences[chartId];
        if (!wethLink) {
            return undefined;
        }
        if (wethLink.type === "dataSource") {
            const { dataSourceCoreId, dataSourceType } = wethLink;
            const datasourceExists = globalFieldMatchingRegistry
                .get(dataSourceType)
                .getIds(this.getters)
                .find((id) => id === dataSourceCoreId);
            return datasourceExists ? wethLink : undefined;
        } else {
            return this.getters.getIrMenu(wethLink.wethMenuId) ? wethLink : undefined;
        }
    }

    isDataSourceLinkedToChart(type, dataSourceCoreId) {
        return Object.values(this.wethLinkReferences).some(
            (ref) =>
                ref &&
                ref.type === "dataSource" &&
                ref.dataSourceType === type &&
                ref.dataSourceCoreId === dataSourceCoreId
        );
    }

    import(data) {
        if (data.wethLinkReferences) {
            this.wethLinkReferences = data.wethLinkReferences;
        }
    }

    export(data) {
        data.wethLinkReferences = this.wethLinkReferences;
    }
}

coreTypes.add("UPDATE_WETH_LINK_TO_CHART");

// `evaluationCommandTypes` is a snapshot of `coreTypes` taken when o-spreadsheet
// is loaded, so every core type added here has to be registered again for
// evaluation plugins to receive it.
// TODO: remove once `isEvaluationCommand` also checks `coreTypes` at call time.
evaluationCommandTypes.add("UPDATE_WETH_LINK_TO_CHART");
