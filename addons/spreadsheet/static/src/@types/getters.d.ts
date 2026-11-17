import { CorePlugin, Model, UID } from "@weth/o-spreadsheet";
import { ChartWethLinkPlugin, WethChartCorePlugin, WethChartCoreViewPlugin } from "@spreadsheet/chart";
import { CurrencyPlugin } from "@spreadsheet/currency/plugins/currency";
import { AccountingPlugin } from "addons/spreadsheet_account/static/src/plugins/accounting_plugin";
import { GlobalFiltersCorePlugin, GlobalFiltersCoreViewPlugin } from "@spreadsheet/global_filters";
import { ListCorePlugin, ListCoreViewPlugin } from "@spreadsheet/list";
import { IrMenuPlugin } from "@spreadsheet/ir_ui_menu/ir_ui_menu_plugin";
import { PivotWethCorePlugin } from "@spreadsheet/pivot";
import { PivotCoreGlobalFilterPlugin } from "@spreadsheet/pivot/plugins/pivot_core_global_filter_plugin";

type Getters = Model["getters"];
type CoreGetters = CorePlugin["getters"];

/**
 * Union of all getter names of a plugin.
 *
 * e.g. With the following plugin
 * @example
 * class MyPlugin {
 *   static getters = [
 *     "getCell",
 *     "getCellValue",
 *   ] as const;
 *   getCell() { ... }
 *   getCellValue() { ... }
 * }
 * type Names = GetterNames<typeof MyPlugin>
 * // is equivalent to "getCell" | "getCellValue"
 */
type GetterNames<Plugin extends { getters: readonly string[] }> = Plugin["getters"][number];

/**
 * Extract getter methods from a plugin, based on its `getters` static array.
 * @example
 * class MyPlugin {
 *   static getters = [
 *     "getCell",
 *     "getCellValue",
 *   ] as const;
 *   getCell() { ... }
 *   getCellValue() { ... }
 * }
 * type MyPluginGetters = PluginGetters<typeof MyPlugin>;
 * // MyPluginGetters is equivalent to:
 * // {
 * //   getCell: () => ...,
 * //   getCellValue: () => ...,
 * // }
 */
type PluginGetters<Plugin extends { new(...args: unknown[]): any; getters: readonly string[] }> =
    Pick<InstanceType<Plugin>, GetterNames<Plugin>>;

declare module "@spreadsheet" {
    /**
     * Add getters from custom plugins defined in weth
     */

    interface WethCoreGetters extends CoreGetters { }
    interface WethCoreGetters extends PluginGetters<typeof GlobalFiltersCorePlugin> { }
    interface WethCoreGetters extends PluginGetters<typeof ListCorePlugin> { }
    interface WethCoreGetters extends PluginGetters<typeof WethChartCorePlugin> { }
    interface WethCoreGetters extends PluginGetters<typeof ChartWethLinkPlugin> { }
    interface WethCoreGetters extends PluginGetters<typeof IrMenuPlugin> { }
    interface WethCoreGetters extends PluginGetters<typeof PivotWethCorePlugin> { }
    interface WethCoreGetters extends PluginGetters<typeof PivotCoreGlobalFilterPlugin> { }

    interface WethGetters extends Getters { }
    interface WethGetters extends WethCoreGetters { }
    interface WethGetters extends PluginGetters<typeof GlobalFiltersCoreViewPlugin> { }
    interface WethGetters extends PluginGetters<typeof ListCoreViewPlugin> { }
    interface WethGetters extends PluginGetters<typeof WethChartCoreViewPlugin> { }
    interface WethGetters extends PluginGetters<typeof CurrencyPlugin> { }
    interface WethGetters extends PluginGetters<typeof AccountingPlugin> { }
}
