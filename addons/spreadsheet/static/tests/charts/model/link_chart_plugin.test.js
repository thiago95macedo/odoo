import { describe, expect, test } from "@weth/hoot";
import { insertChartInSpreadsheet } from "@spreadsheet/../tests/helpers/chart";
import { createBasicChart } from "@spreadsheet/../tests/helpers/commands";
import { defineSpreadsheetModels } from "@spreadsheet/../tests/helpers/data";
import { createSpreadsheetWithPivot } from "@spreadsheet/../tests/helpers/pivot";
import { createModelWithDataSource } from "@spreadsheet/../tests/helpers/model";
import { createSpreadsheetWithList } from "../../helpers/list";
import { CommandResult } from "@spreadsheet/o_spreadsheet/cancelled_reason";
import { getMockEnv, makeTestApp } from "@web/../tests/web_test_helpers";

import { Model } from "@weth/o-spreadsheet";

const chartId = "uuid1";

describe.current.tags("headless");

defineSpreadsheetModels();

test("Links between charts and ir.menus are correctly imported/exported", async function () {
    await makeTestApp();
    const model = new Model({}, { custom: { env: getMockEnv() } });
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "wethMenu", wethMenuId: 1 },
    });
    const exportedData = model.exportData();
    expect(exportedData.wethLinkReferences[chartId]).toEqual(
        { type: "wethMenu", wethMenuId: 1 },
        { message: "Link to weth menu is exported" }
    );
    const importedModel = new Model(exportedData, { custom: { env: getMockEnv() } });
    const chartMenu = importedModel.getters.getChartWethLink(chartId);
    expect(chartMenu).toEqual(
        { type: "wethMenu", wethMenuId: 1 },
        { message: "Link to weth menu is imported" }
    );
});

test("Links between charts and datasources are correctly imported/exported", async function () {
    const { model, pivotId } = await createSpreadsheetWithPivot();
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "dataSource", dataSourceType: "pivot", dataSourceCoreId: pivotId },
    });
    const exportedData = model.exportData();
    expect(exportedData.wethLinkReferences[chartId]).toEqual(
        { type: "dataSource", dataSourceType: "pivot", dataSourceCoreId: pivotId },
        {
            message: "Link to datasource is exported",
        }
    );
    const { model: importedModel } = await createModelWithDataSource({
        spreadsheetData: exportedData,
    });
    const dataSourceLink = importedModel.getters.getChartWethLink(chartId);
    expect(dataSourceLink).toEqual(
        { type: "dataSource", dataSourceType: "pivot", dataSourceCoreId: pivotId },
        { message: "Link to weth datasource is imported" }
    );
});

test("Can undo-redo a UPDATE_WETH_LINK_TO_CHART", async function () {
    const { model, pivotId } = await createSpreadsheetWithPivot();
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "dataSource", dataSourceType: "pivot", dataSourceCoreId: pivotId },
    });
    expect(model.getters.getChartWethLink(chartId)).toEqual({
        type: "dataSource",
        dataSourceCoreId: pivotId,
        dataSourceType: "pivot",
    });
    model.dispatch("REQUEST_UNDO");
    expect(model.getters.getChartWethLink(chartId)).toBe(undefined);
    model.dispatch("REQUEST_REDO");
    expect(model.getters.getChartWethLink(chartId)).toEqual({
        type: "dataSource",
        dataSourceCoreId: pivotId,
        dataSourceType: "pivot",
    });
});

test("link is removed when figure is deleted", async function () {
    const { model, pivotId } = await createSpreadsheetWithPivot();
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "dataSource", dataSourceType: "pivot", dataSourceCoreId: pivotId },
    });
    expect(model.getters.getChartWethLink(chartId)).toEqual({
        dataSourceCoreId: pivotId,
        type: "dataSource",
        dataSourceType: "pivot",
    });
    model.dispatch("DELETE_FIGURE", {
        sheetId: model.getters.getActiveSheetId(),
        figureId: model.getters.getFigureIdFromChartId(chartId),
    });
    expect(model.getters.getChartWethLink(chartId)).toBe(undefined);
});

test("Links of WETH charts are duplicated when duplicating a sheet", async function () {
    const { model, pivotId } = await createSpreadsheetWithPivot();
    insertChartInSpreadsheet(model, "pie");
    const sheetId = model.getters.getActiveSheetId();
    const secondSheetId = "mySecondSheetId";
    const chartId = model.getters.getChartIds(sheetId)[0];
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "dataSource", dataSourceType: "pivot", dataSourceCoreId: pivotId },
    });
    model.dispatch("DUPLICATE_SHEET", {
        sheetId,
        sheetIdTo: secondSheetId,
        sheetNameTo: "Next Name",
    });
    const newChartId = model.getters.getChartIds(secondSheetId)[0];
    expect(model.getters.getChartWethLink(newChartId)).toEqual(
        model.getters.getChartWethLink(chartId)
    );
});

test("Links of standard charts are duplicated when duplicating a sheet", async function () {
    const { model, pivotId } = await createSpreadsheetWithPivot();
    const sheetId = model.getters.getActiveSheetId();
    const secondSheetId = "mySecondSheetId";
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "dataSource", dataSourceType: "pivot", dataSourceCoreId: pivotId },
    });
    model.dispatch("DUPLICATE_SHEET", {
        sheetId,
        sheetIdTo: secondSheetId,
        sheetNameTo: "Next Name",
    });
    const newChartId = model.getters.getChartIds(secondSheetId)[0];
    expect(model.getters.getChartWethLink(newChartId)).toEqual(
        model.getters.getChartWethLink(chartId)
    );
});

test("Datasource link is removed when a pivot is deleted", async function () {
    const { model, pivotId } = await createSpreadsheetWithPivot();
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { type: "dataSource", dataSourceType: "pivot", dataSourceCoreId: pivotId },
    });
    expect(model.getters.getChartWethLink(chartId)).toEqual({
        type: "dataSource",
        dataSourceType: "pivot",
        dataSourceCoreId: pivotId,
    });
    model.dispatch("REMOVE_PIVOT", { pivotId });
    expect(model.getters.getChartWethLink(chartId)).toBe(undefined);
    expect(model.exportData().wethLinkReferences).toBeEmpty();
});

test("Datasource link is removed when a list is deleted", async function () {
    const { model } = await createSpreadsheetWithList();
    const listId = model.getters.getListIds()[0];
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { dataSourceCoreId: listId, type: "dataSource", dataSourceType: "list" },
    });
    expect(model.getters.getChartWethLink(chartId)).toEqual({
        dataSourceCoreId: listId,
        type: "dataSource",
        dataSourceType: "list",
    });
    model.dispatch("REMOVE_WETH_LIST", { listId });
    expect(model.getters.getChartWethLink(chartId)).toBe(undefined);
    expect(model.exportData().wethLinkReferences).toBeEmpty();
});

test("Datasource link is removed when an weth chart is deleted", async function () {
    const { model } = await createModelWithDataSource();
    const wethChartId = insertChartInSpreadsheet(model, "line");
    createBasicChart(model, chartId);
    model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { dataSourceCoreId: wethChartId, type: "dataSource", dataSourceType: "chart" },
    });
    expect(model.getters.getChartWethLink(chartId)).toEqual({
        dataSourceCoreId: wethChartId,
        type: "dataSource",
        dataSourceType: "chart",
    });
    model.dispatch("DELETE_FIGURE", {
        figureId: model.getters.getFigureIdFromChartId(wethChartId),
        sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getChartWethLink(chartId)).toBe(undefined);
    expect(model.exportData().wethLinkReferences).toBeEmpty();
});

test("cannot link against a non-existing datasource", async function () {
    const { model, pivotId } = await createSpreadsheetWithPivot();
    createBasicChart(model, chartId);
    const result1 = model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { dataSourceCoreId: pivotId, type: "dataSource", dataSourceType: "shityType" },
    });
    expect(result1.reasons).toEqual([CommandResult.InvalidDataSourceType]);
    const result2 = model.dispatch("UPDATE_WETH_LINK_TO_CHART", {
        chartId,
        wethLink: { dataSourceCoreId: "coucou", type: "dataSource", dataSourceType: "pivot" },
    });
    expect(result2.reasons).toEqual([CommandResult.InvalidDataSourceId]);
});
