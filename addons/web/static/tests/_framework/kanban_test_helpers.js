import { animationFrame, queryAll, queryAllAttributes, queryAllTexts, queryOne } from "@weth/hoot";
import { getDropdownMenu } from "./component_test_helpers";
import { contains } from "./dom_test_helpers";
import { buildSelector } from "./view_test_helpers";

/**
 * @param {number} [columnIndex=0]
 */
export function clickKanbanLoadMore(columnIndex = 0) {
    return contains(".w_kanban_load_more button", { root: getKanbanColumn(columnIndex) }).click();
}

/**
 * @param {SelectorOptions} [options]
 */
export async function clickKanbanRecord(options) {
    await contains(buildSelector(`.w_kanban_record`, options)).click();
}

export async function createKanbanRecord() {
    await contains(".w_control_panel_main_buttons button.w-kanban-button-new").click();
    return animationFrame(); // the kanban quick create is rendered in a second animation frame
}

export function discardKanbanRecord() {
    return contains(".w_kanban_quick_create .w_kanban_cancel").click();
}

/**
 * @param {string} value
 */
export function editKanbanColumnName(value) {
    return contains(".w_column_quick_create input").edit(value);
}

export function editKanbanRecord() {
    return contains(".w_kanban_quick_create .w_kanban_edit").click();
}

/**
 * @param {string} fieldName
 * @param {string} value
 */
export function editKanbanRecordQuickCreateInput(fieldName, value) {
    return contains(`.w_kanban_quick_create .w_field_widget[name=${fieldName}] input`).edit(value, {
        confirm: "tab",
    });
}

/**
 * @param {number} [columnIndex=0]
 * @param {boolean} [ignoreFolded=false]
 */
export function getKanbanColumn(columnIndex = 0, ignoreFolded = false) {
    let selector = ".w_kanban_group";
    if (ignoreFolded) {
        selector += ":not(.w_column_folded)";
    }
    return queryAll(selector).at(columnIndex);
}

/**
 * @param {number} [columnIndex=0]
 * @param {boolean} [ignoreFolded=false]
 */
export function getKanbanColumnDropdownMenu(columnIndex = 0, ignoreFolded = false) {
    const column = getKanbanColumn(columnIndex, ignoreFolded);
    return getDropdownMenu(column);
}

/**
 * @param {number} [columnIndex]
 */
export function getKanbanColumnTooltips(columnIndex) {
    queryAllAttributes;
    const root = columnIndex >= 0 && getKanbanColumn(columnIndex);
    return queryAllAttributes(".w_column_progress .progress-bar.w_bar_has_records", "data-tooltip", { root });
}

export function getKanbanCounters() {
    return queryAllTexts(".w_animated_number");
}

/**
 * @param {number} [columnIndex=0]
 */
export function getKanbanProgressBars(columnIndex = 0) {
    const column = getKanbanColumn(columnIndex);
    return queryAll(".w_column_progress .progress-bar.w_bar_has_records", { root: column });
}

/**
 * @param {SelectorOptions} options
 */
export function getKanbanRecord(options) {
    return queryOne(buildSelector(`.w_kanban_record`, options));
}

/**
 * @param {number} [columnIndex]
 */
export function getKanbanRecordTexts(columnIndex) {
    const root = columnIndex >= 0 && getKanbanColumn(columnIndex);
    return queryAllTexts(".w_kanban_record:not(.w_kanban_ghost)", { root });
}

export function quickCreateKanbanColumn() {
    return contains(".w_column_quick_create.w_quick_create_folded div").click();
}

/**
 * @param {number} [columnIndex=0]
 */
export async function quickCreateKanbanRecord(columnIndex = 0) {
    await contains(".w_kanban_quick_add", { root: getKanbanColumn(columnIndex) }).click();
    return animationFrame(); // the kanban quick create is rendered in a second animation frame
}

/**
 * @param {number} [columnIndex=0]
 */
export async function toggleKanbanColumnActions(columnIndex = 0) {
    const column = getKanbanColumn(columnIndex);
    await contains(".w_group_config .dropdown-toggle", { root: column, visible: false }).click();
    return (buttonText) => {
        const menu = getDropdownMenu(column);
        return contains(`.dropdown-item:contains(/\\b${buttonText}\\b/i)`, { root: menu }).click();
    };
}

/**
 * @param {number} [recordIndex=0]
 */
export function toggleKanbanRecordDropdown(recordIndex = 0) {
    return contains(`.w_kanban_record:eq(${recordIndex}) .w_dropdown_kanban .dropdown-toggle`, {
        visible: false,
    }).click();
}

export function validateKanbanColumn() {
    return contains(".w_column_quick_create .w_kanban_add").click();
}

export function validateKanbanRecord() {
    return contains(".w_kanban_quick_create .w_kanban_add").click();
}
