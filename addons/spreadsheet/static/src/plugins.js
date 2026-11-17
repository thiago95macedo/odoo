import { CorePlugin, EvaluationPlugin, UIPlugin } from "@weth/o-spreadsheet";

/**
 * An o-spreadsheet core plugin with access to all custom WETH plugins
 * @type {import("@spreadsheet").WethCorePluginConstructor}
 **/
export const WethCorePlugin = CorePlugin;

/**
 * An o-spreadsheet CoreView plugin with access to all custom WETH plugins
 * @type {import("@spreadsheet").WethCoreViewPluginConstructor}
 **/
export const WethEvaluationPlugin = EvaluationPlugin;

/**
 * An o-spreadsheet UI plugin with access to all custom WETH plugins
 * @type {import("@spreadsheet").WethUIPluginConstructor}
 **/
export const WethUIPlugin = UIPlugin;
