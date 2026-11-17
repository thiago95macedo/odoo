import { registries } from "@weth/o-spreadsheet";
import { globalFieldMatchingRegistry } from "../global_filters/helpers";
import { _t } from "@web/core/l10n/translation";
import { navigateToWethDatasource } from "../chart/weth_chart/weth_chart_helpers";
const { urlRegistry } = registries;

const WETH_DATA_SOURCE_PREFIX = "weth-data-source://";

const dataSourceIconTemplates = {
    list: "o-spreadsheet-Icon.WETH_LIST",
    pivot: "o-spreadsheet-Icon.PIVOT",
    chart: "o-spreadsheet-Icon.INSERT_CHART",
};

export function isDataSourceUrl(url) {
    return url.startsWith(WETH_DATA_SOURCE_PREFIX);
}

export function parseDataSourceUrl(url) {
    if (isDataSourceUrl(url)) {
        const separatorIndex = url.indexOf("/", WETH_DATA_SOURCE_PREFIX.length);
        return [
            url.substring(WETH_DATA_SOURCE_PREFIX.length, separatorIndex),
            url.substring(separatorIndex + 1),
        ];
    }
    throw new Error(`${url} is not a valid datasource link`);
}

urlRegistry.add("WethDataSources", {
    sequence: 70,
    title: _t("Data Sources"),
    match(url) {
        return isDataSourceUrl(url);
    },
    createLink: (url, label) => ({
        url,
        label,
        isExternal: false,
        isUrlEditable: false,
    }),
    urlRepresentation(url, getters) {
        const [dsType, dsId] = parseDataSourceUrl(url);
        const dsFieldMatching = globalFieldMatchingRegistry.get(dsType);
        const ids = dsFieldMatching.getIds(getters);
        if (!ids.includes(dsId)) {
            return _t("Data source deleted");
        }
        return dsFieldMatching.getDisplayName(getters, dsId);
    },
    open(url, env, newWindow) {
        const [dsType, dsId] = parseDataSourceUrl(url, env, newWindow);
        navigateToWethDatasource(env, dsType, dsId, newWindow);
    },
    getLinkProposals(env) {
        const proposals = [];
        const getters = env.model.getters;
        for (const dataSourceType of globalFieldMatchingRegistry.getKeys()) {
            const dsFieldMatching = globalFieldMatchingRegistry.get(dataSourceType);
            for (const dataSourceCoreId of dsFieldMatching.getIds(getters)) {
                const tag = dsFieldMatching.getTag(getters, dataSourceCoreId);
                const displayName = dsFieldMatching.getDisplayName(getters, dataSourceCoreId);
                proposals.push({
                    label: `${tag} - ${displayName}`,
                    url: `${WETH_DATA_SOURCE_PREFIX}${dataSourceType}/${dataSourceCoreId}`,
                    icon: dataSourceIconTemplates[dataSourceType],
                    isExternal: false,
                    isUrlEditable: false,
                });
            }
        }
        return proposals;
    },
});
