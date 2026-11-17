import { animationFrame } from "@weth/hoot-mock";
import { Model, stores } from "@weth/o-spreadsheet";
import { WethDataProvider } from "@spreadsheet/data_sources/weth_data_provider";
import {
    defineActions,
    defineMenus,
    getMockEnv,
    getTestApp,
    makeTestApp,
    onRpc,
    patchWithCleanup,
} from "@web/../tests/web_test_helpers";
import { setCellContent } from "./commands";
import { addRecordsFromServerData, addViewsFromServerData } from "./data";
import { markRaw } from "@weth/owl";

/**
 * @typedef {import("@spreadsheet/../tests/helpers/data").ServerData} ServerData
 * @typedef {import("@spreadsheet/helpers/model").WethSpreadsheetModel} WethSpreadsheetModel
 */

export function setupDataSourceEvaluation(model) {
    model.config.custom.wethDataProvider.addEventListener("data-source-updated", () => {
        const sheetId = model.getters.getActiveSheetId();
        model.dispatch("EVALUATE_CELLS", { sheetId });
    });
}

/**
 * Create a spreadsheet model with a mocked server environnement
 *
 * @param {object} params
 * @param {object} [params.spreadsheetData] Spreadsheet data to import
 * @param {object} [params.modelConfig]
 * @param {ServerData} [params.serverData] Data to be injected in the mock server
 * @param {function} [params.mockRPC] Mock rpc function
 * @returns {Promise<{ model: WethSpreadsheetModel, env: Object }>}
 */
export async function createModelWithDataSource(params = {}) {
    await makeSpreadsheetMockEnv(params);
    const env = getMockEnv();
    const config = params.modelConfig;
    /** @type any*/
    const model = new Model(params.spreadsheetData, {
        ...config,
        custom: {
            env,
            wethDataProvider: new WethDataProvider(env),
            ...config?.custom,
        },
    });
    markRaw(model);
    env.model = model;
    // if (params.serverData) {
    //     await addRecordsFromServerData(params.serverData);
    // }
    setupDataSourceEvaluation(model);
    await animationFrame(); // initial async formulas loading
    return { model, env };
}

/**
 * Create a mocked server environnement
 *
 * @param {object} params
 * @param {object} [params.spreadsheetData] Spreadsheet data to import
 * @param {ServerData} [params.serverData] Data to be injected in the mock server
 * @param {function} [params.mockRPC] Mock rpc function
 * @returns {Promise<void>}
 */
export async function makeSpreadsheetMockEnv(params = {}) {
    if (params.mockRPC) {
        // Note: calling onRpc with only a callback only works for routes such as orm routes that have a default listener
        // For arbitrary rpc request (eg. /web/domain/validate) we need to call onRpc("/my/route", callback)
        onRpc((args) => params.mockRPC(args.route, args)); // separate route from args for legacy (& forward ports) compatibility
    }
    if (params.serverData?.menus) {
        defineMenus(Object.values(params.serverData.menus));
    }
    if (params.serverData?.actions) {
        defineActions(Object.values(params.serverData.actions));
    }
    if (params.serverData?.models) {
        addRecordsFromServerData(params.serverData);
    }
    if (params.serverData?.views) {
        addViewsFromServerData(params.serverData);
    }
    if (!getTestApp()) {
        await makeTestApp();
    }
    patchWithCleanup(stores.GridRenderer.prototype, {
        getBoxesWithAnimations(boxes) {
            // disable animations for tests, as they won't work with hoot patched `requestAnimationFrame`
            return boxes;
        },
    });
}

export function createModelFromGrid(grid) {
    const model = new Model();
    for (const xc in grid) {
        if (grid[xc] !== undefined) {
            setCellContent(model, xc, grid[xc]);
        }
    }
    return model;
}
