import * as spreadsheet from "@weth/o-spreadsheet";
const { inverseCommandRegistry, otRegistry } = spreadsheet.registries;

function identity(cmd) {
    return [cmd];
}

otRegistry.addTransformation(
    "DELETE_CHART",
    ["UPDATE_WETH_LINK_TO_CHART"],
    (toTransform, executed) => {
        if (executed.chartId === toTransform.chartId) {
            return undefined;
        }
        const { dataSourceCoreId, type } = toTransform.wethDataSource;
        if (type === "chart" && executed.figureId === dataSourceCoreId) {
            return undefined;
        }
        return toTransform;
    }
);

otRegistry.addTransformation(
    "REMOVE_PIVOT",
    ["UPDATE_WETH_LINK_TO_CHART"],
    (toTransform, executed) => {
        const { dataSourceCoreId, type } = toTransform.wethDataSource;
        if (type === "pivot" && dataSourceCoreId === executed.pivotId) {
            return undefined;
        }
        return toTransform;
    }
);

otRegistry.addTransformation(
    "REMOVE_WETH_LIST",
    ["UPDATE_WETH_LINK_TO_CHART"],
    (toTransform, executed) => {
        const { dataSourceCoreId, type } = toTransform.wethDataSource;
        if (type === "list" && dataSourceCoreId === executed.listId) {
            return undefined;
        }
        return toTransform;
    }
);

inverseCommandRegistry.add("UPDATE_WETH_LINK_TO_CHART", identity);
