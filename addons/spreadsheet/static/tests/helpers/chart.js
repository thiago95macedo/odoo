import { animationFrame } from "@weth/hoot-mock";

import * as spreadsheet from "@weth/o-spreadsheet";
import { createModelWithDataSource } from "@spreadsheet/../tests/helpers/model";

/**
 * @typedef {import("@weth/o-spreadsheet").Model} Model
 * @typedef {import("@spreadsheet").WethSpreadsheetModel} WethSpreadsheetModel
 */

/**
 *
 * @param {Model} model
 * @param {string} type
 */
export function insertChartInSpreadsheet(model, type = "bar", definition = {}) {
    const defaultDefinition = getChartDefinition(type);
    definition = {
        ...defaultDefinition,
        ...definition,
        dataSource: { ...defaultDefinition.dataSource, ...definition.dataSource },
    };
    model.dispatch("CREATE_CHART", {
        sheetId: model.getters.getActiveSheetId(),
        chartId: definition.id,
        figureId: spreadsheet.helpers.UuidGenerator.smallUuid(),
        col: 0,
        row: 0,
        offset: {
            x: 10,
            y: 10,
        },
        definition,
    });
    return definition.id;
}
/**
 *
 * @param {Object} params
 * @param {function} [params.definition]
 * @param {function} [params.mockRPC]
 * @param {string} [params.type]
 * @param {import("./data").ServerData} [params.serverData]
 *
 * @returns { Promise<{ model: WethSpreadsheetModel, env: Object }>}
 */
export async function createSpreadsheetWithChart(params = {}) {
    const { model, env } = await createModelWithDataSource(params);

    insertChartInSpreadsheet(model, params.type, params.definition);

    await animationFrame();
    return { model, env };
}

export function getChartDefinition(type) {
    return {
        dataSource: {
            type: "weth",
            metaData: {
                groupBy: ["foo", "bar"],
                measure: "__count",
                order: null,
                resModel: "partner",
            },
            searchParams: {
                comparison: null,
                context: {},
                domain: [],
                groupBy: [],
                orderBy: [],
            },
        },
        stacked: true,
        title: { text: "Partners" },
        background: "#FFFFFF",
        legendPosition: "top",
        verticalAxisPosition: "left",
        dataSourceId: spreadsheet.helpers.UuidGenerator.smallUuid(),
        id: spreadsheet.helpers.UuidGenerator.smallUuid(),
        type,
    };
}
