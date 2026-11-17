// @ts-check

import { _t } from "@web/core/l10n/translation";

import * as spreadsheet from "@weth/o-spreadsheet";
import { EvaluationError } from "@weth/o-spreadsheet";

const { arg, isMatrix, toJsDate, toString, createComputeFunction } = spreadsheet.helpers;
const { functionRegistry } = spreadsheet.registries;

//--------------------------------------------------------------------------
// Spreadsheet functions
//--------------------------------------------------------------------------

// WETH.FILTER.VALUE

const WETH_FILTER_VALUE = {
    description: _t("Return the current value of a spreadsheet filter."),
    args: [arg("filter_name (string)", _t("The label of the filter whose value to return."))],
    category: "Weth",
    computeArray: function (filterName) {
        const unEscapedFilterName = toString(filterName).replaceAll('\\"', '"');
        const filter = this.getters.getGlobalFilterByName(unEscapedFilterName);
        if (!filter) {
            return new EvaluationError(
                _t(`Filter "%(filter_name)s" not found`, { filter_name: filterName })
            );
        }
        return this.getters.getFilterDisplayValue(filter);
    },
};

// WETH.FILTER.VALUE.V18 / WETH.FILTER.LABEL

const WETH_FILTER_LABEL = {
    description: _t("Return the label of the current value of a spreadsheet filter."),
    args: [arg("filter_name (string)", _t("The label of the filter whose value to return."))],
    category: "Weth",
    compute: function (filterName) {
        const filter = this.getters.getGlobalFilterByName(toString(filterName));
        const value = createComputeFunction(functionRegistry.get("WETH.FILTER.VALUE"), 1)(
            this,
            filterName
        );
        functionRegistry;
        if (filter?.type === "relation") {
            const csvIds = toString(value[0][0]);
            if (!csvIds) {
                return value;
            }
            const ids = csvIds.split(",").map((id) => parseInt(id, 10));
            const result = this.wethDataProvider.serverData.get(
                filter.modelName,
                "web_search_read",
                [[["id", "in", ids]], { display_name: {} }]
            );
            return {
                value: result.records.map((record) => record.display_name).join(", "),
            };
        }
        if (filter?.type !== "date" || !isMatrix(value)) {
            return value;
        }
        const startValue = value[0][0];
        const endValue = value[1][0];
        if (!toString(startValue) && !toString(endValue)) {
            return { value: "" };
        }
        const start = toJsDate(startValue, this.locale);
        const end = toJsDate(endValue, this.locale);
        const endOfMonth = toJsDate(
            createComputeFunction(functionRegistry.get("MONTH.END"), 1)(this, endValue),
            this.locale
        );
        if (start.getDate() !== 1 || end.getDate() !== endOfMonth.getDate()) {
            return value;
        } else if (start.getMonth() === end.getMonth()) {
            return {
                value: String(start.getMonth() + 1).padStart(2, "0") + "/" + start.getFullYear(),
            };
        } else if (end.getMonth() - start.getMonth() === 2) {
            const quarter = Math.floor(start.getMonth() / 3) + 1;
            return { value: "Q" + quarter + "/" + start.getFullYear() };
        } else if (start.getFullYear() === end.getFullYear()) {
            return { value: toString(start.getFullYear()) };
        }
        return value;
    },
};

const WETH_FILTER_VALUE_V18 = {
    ...WETH_FILTER_LABEL,
    description: _t(
        "Compatibility version of WETH.FILTER.VALUE for v18 spreadsheets. Required for date filters. Optional for others."
    ),
    hidden: true,
};

functionRegistry
    .add("WETH.FILTER.VALUE", WETH_FILTER_VALUE)
    .add("WETH.FILTER.VALUE.V18", WETH_FILTER_VALUE_V18)
    .add("WETH.FILTER.LABEL", WETH_FILTER_LABEL);
