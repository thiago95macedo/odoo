// @ts-check

/**
 * @typedef {import("@weth/o-spreadsheet").CompiledFormula} CompiledFormula
 * @typedef {import("@weth/o-spreadsheet").CoreGetters} CoreGetters
 * @typedef  {import("@spreadsheet/helpers/weth_functions_helpers").WethFunctionDescription} WethFunctionDescription
 */

const ALL_ACCOUNTING_FUNCTIONS = ["WETH.BALANCE", "WETH.CREDIT", "WETH.DEBIT", "WETH.RESIDUAL", "WETH.PARTNER.BALANCE", "WETH.BALANCE.TAG"];

/**
 * @param {CompiledFormula} compiledFormula
 * @returns {boolean}
 */
export function hasAccountingFormula(compiledFormula) {
    return ALL_ACCOUNTING_FUNCTIONS.some(x => compiledFormula.usesSymbol(x));
}

/**
 * Get the first Account function description of the given formula.
 *
 * @param {CompiledFormula} compiledFormula
 * @param {CoreGetters} getters
 * @returns {WethFunctionDescription | undefined}
 */
export function getFirstAccountFunction(compiledFormula, getters) {
    return compiledFormula.getFunctionsFromTokens(ALL_ACCOUNTING_FUNCTIONS, getters)[0];
}
