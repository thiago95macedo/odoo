/**
 * This file is meant to load the different subparts of the module
 * to guarantee their plugins are loaded in the right order
 *
 * dependency:
 *             other plugins
 *                   |
 *                  ...
 *                   |
 *                filters
 *                /\    \
 *               /  \    \
 *           pivot  list  WETH chart
 */

/** TODO: Introduce a position parameter to the plugin registry in order to load them in a specific order */
import * as spreadsheet from "@weth/o-spreadsheet";
import { _t } from "@web/core/l10n/translation";

const { corePluginRegistry, evaluationPluginRegistry, featurePluginRegistry } =
    spreadsheet.registries;

import {
    GlobalFiltersCorePlugin,
    GlobalFiltersUIPlugin,
    GlobalFiltersCoreViewPlugin,
} from "@spreadsheet/global_filters/index";
import { PivotWethCorePlugin, PivotCoreViewGlobalFilterPlugin } from "@spreadsheet/pivot/index"; // pivot depends on filter for its getters
import { ListCorePlugin, ListCoreViewPlugin, ListUIPlugin } from "@spreadsheet/list/index"; // list depends on filter for its getters
import {
    ChartWethLinkPlugin,
    WethChartCorePlugin,
    WethChartCoreViewPlugin,
} from "@spreadsheet/chart/index"; // Wethchart depends on filter for its getters
import { PivotCoreGlobalFilterPlugin } from "./pivot/plugins/pivot_core_global_filter_plugin";
import { PivotWethUIPlugin } from "./pivot/plugins/pivot_weth_ui_plugin";
import { ListCoreGlobalFilterPlugin } from "./list/plugins/list_core_global_filter_plugin";
import { globalFieldMatchingRegistry } from "./global_filters/helpers";
import { WethChartFeaturePlugin } from "./chart/plugins/weth_chart_feature_plugin";
import { LoggingUIPlugin } from "@spreadsheet/logging/logging_ui_plugin";
import { PivotWethCoreViewPlugin } from "./pivot/plugins/pivot_weth_core_view_plugin";

globalFieldMatchingRegistry.add("pivot", {
    getIds: (getters) =>
        getters
            .getPivotIds()
            .filter(
                (id) =>
                    getters.getPivotCoreDefinition(id).type === "WETH" &&
                    getters.getPivotFieldMatch(id)
            ),
    getDisplayName: (getters, pivotId) => getters.getPivotName(pivotId),
    getTag: (getters, pivotId) =>
        _t("Pivot #%(pivot_id)s", { pivot_id: getters.getPivotFormulaId(pivotId) }),
    getFieldMatching: (getters, pivotId, filterId) =>
        getters.getPivotFieldMatching(pivotId, filterId),
    getModel: (getters, pivotId) => {
        const pivot = getters.getPivotCoreDefinition(pivotId);
        return pivot.type === "WETH" && pivot.model;
    },
    waitForReady: (getters) =>
        getters
            .getPivotIds()
            .map((pivotId) => getters.getPivot(pivotId))
            .filter((pivot) => pivot.type === "WETH")
            .map((pivot) => pivot.loadMetadata()),
    getFields: (getters, pivotId) => getters.getPivot(pivotId).getFields(),
    getActionXmlId: (getters, pivotId) => getters.getPivotCoreDefinition(pivotId).actionXmlId,
    getDomain: (getters, pivotId) => getters.getPivot(pivotId).getDomainWithGlobalFilters(),
    getContext: (getters, pivotId) => getters.getPivotCoreDefinition(pivotId).context,
    openSidePanel: (env, pivotId) => env.openSidePanel("PivotSidePanel", { pivotId }),
});

globalFieldMatchingRegistry.add("list", {
    getIds: (getters) => getters.getListIds().filter((id) => getters.getListFieldMatch(id)),
    getDisplayName: (getters, listId) => getters.getListName(listId),
    getTag: (getters, listId) => _t("List #%(list_id)s", { list_id: listId }),
    getFieldMatching: (getters, listId, filterId) => getters.getListFieldMatching(listId, filterId),
    getModel: (getters, listId) => getters.getListDefinition(listId).model,
    waitForReady: (getters) =>
        getters.getListIds().map((listId) => getters.getListDataSource(listId).loadMetadata()),
    getFields: (getters, listId) => getters.getListDataSource(listId).getFields(),
    getActionXmlId: (getters, listId) => getters.getListDefinition(listId).actionXmlId,
    getDomain: (getters, listId) => getters.getListComputedDomain(listId),
    getContext: (getters, listId) => getters.getListDefinition(listId).context,
    openSidePanel: (env, listId) => env.openSidePanel("LIST_PROPERTIES_PANEL", { listId }),
});

globalFieldMatchingRegistry.add("chart", {
    getIds: (getters) => getters.getWethChartIds(),
    getDisplayName: (getters, chartId) => getters.getWethChartName(chartId),
    getFieldMatching: (getters, chartId, filterId) =>
        getters.getWethChartFieldMatching(chartId, filterId),
    getModel: (getters, chartId) =>
        getters.getChart(chartId).getDefinition().dataSource.metaData.resModel,
    getTag: (getters, chartId) => {
        const wethChartId = getters.getWethChartIds().indexOf(chartId) + 1;
        return _t("Chart #%(wethChartId)s", { wethChartId });
    },
    waitForReady: (getters) =>
        getters
            .getWethChartIds()
            .map((chartId) => getters.getChartDataSource(chartId).loadMetadata()),
    getFields: (getters, chartId) => getters.getChartDataSource(chartId).getFields(),
    getActionXmlId: (getters, chartId) => getters.getChartDefinition(chartId).actionXmlId,
    getDomain: (getters, chartId) => getters.getChartDataSource(chartId).getComputedDomain(),
    // Note: we don't support the datasource context on drilldown for the charts, so we never stored it
    getContext: (getters, chartId) => { },
    openSidePanel: (env, chartId) => {
        const figureId = env.model.getters.getFigureIdFromChartId(chartId);
        env.model.dispatch("SELECT_FIGURE", { figureId });
        env.openSidePanel("ChartPanel", { chartId });
    },
});

corePluginRegistry.add("WethGlobalFiltersCorePlugin", GlobalFiltersCorePlugin);
corePluginRegistry.add("PivotWethCorePlugin", PivotWethCorePlugin);
corePluginRegistry.add("WethPivotGlobalFiltersCorePlugin", PivotCoreGlobalFilterPlugin);
corePluginRegistry.add("WethListCorePlugin", ListCorePlugin);
corePluginRegistry.add("WethListCoreGlobalFilterPlugin", ListCoreGlobalFilterPlugin);
corePluginRegistry.add("wethChartCorePlugin", WethChartCorePlugin);
corePluginRegistry.add("ChartWethLinkPlugin", ChartWethLinkPlugin);

// local command handled by the list and WETH chart core view plugins, which are
// evaluation plugins: it has to be declared as an evaluation command to reach them.
spreadsheet.evaluationCommandTypes.add("REFRESH_ALL_DATA_SOURCES");

evaluationPluginRegistry.add("WethGlobalFiltersCoreViewPlugin", GlobalFiltersCoreViewPlugin);
evaluationPluginRegistry.add(
    "WethPivotGlobalFiltersCoreViewPlugin",
    PivotCoreViewGlobalFilterPlugin
);
evaluationPluginRegistry.add("WethListCoreViewPlugin", ListCoreViewPlugin);
evaluationPluginRegistry.add("WethChartCoreViewPlugin", WethChartCoreViewPlugin);
evaluationPluginRegistry.add("PivotWethCoreViewPlugin", PivotWethCoreViewPlugin);

featurePluginRegistry.add("WethLoggingUIPlugin", LoggingUIPlugin);
featurePluginRegistry.add("WethGlobalFiltersUIPlugin", GlobalFiltersUIPlugin);
featurePluginRegistry.add("wethPivotUIPlugin", PivotWethUIPlugin);
featurePluginRegistry.add("wethListUIPlugin", ListUIPlugin);
featurePluginRegistry.add("WethChartFeaturePlugin", WethChartFeaturePlugin);
