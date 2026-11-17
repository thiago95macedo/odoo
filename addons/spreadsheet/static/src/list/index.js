import { _t } from "@web/core/l10n/translation";

import * as spreadsheet from "@weth/o-spreadsheet";

import "./list_functions";

import { ListCorePlugin } from "@spreadsheet/list/plugins/list_core_plugin";
import { ListCoreViewPlugin } from "@spreadsheet/list/plugins/list_core_view_plugin";
import { ListUIPlugin } from "@spreadsheet/list/plugins/list_ui_plugin";

import { SEE_RECORD_LIST, SEE_RECORD_LIST_VISIBLE } from "./list_actions";
const { inverseCommandRegistry } = spreadsheet.registries;

function identity(cmd) {
    return [cmd];
}

const { coreTypes, evaluationCommandTypes, invalidateEvaluationCommands } = spreadsheet;

const { cellMenuRegistry } = spreadsheet.registries;

coreTypes.add("INSERT_WETH_LIST");
coreTypes.add("RENAME_WETH_LIST");
coreTypes.add("REMOVE_WETH_LIST");
coreTypes.add("RE_INSERT_WETH_LIST");
coreTypes.add("UPDATE_WETH_LIST_DOMAIN");
coreTypes.add("UPDATE_WETH_LIST");
coreTypes.add("ADD_LIST_DOMAIN");
coreTypes.add("DUPLICATE_WETH_LIST");

// `evaluationCommandTypes` is a snapshot of `coreTypes` taken when o-spreadsheet
// is loaded, so every core type added here has to be registered again for
// evaluation plugins to receive it.
// TODO: remove once `isEvaluationCommand` also checks `coreTypes` at call time.
evaluationCommandTypes.add("INSERT_WETH_LIST");
evaluationCommandTypes.add("RENAME_WETH_LIST");
evaluationCommandTypes.add("REMOVE_WETH_LIST");
evaluationCommandTypes.add("RE_INSERT_WETH_LIST");
evaluationCommandTypes.add("UPDATE_WETH_LIST_DOMAIN");
evaluationCommandTypes.add("UPDATE_WETH_LIST");
evaluationCommandTypes.add("ADD_LIST_DOMAIN");
evaluationCommandTypes.add("DUPLICATE_WETH_LIST");

invalidateEvaluationCommands.add("UPDATE_WETH_LIST_DOMAIN");
invalidateEvaluationCommands.add("UPDATE_WETH_LIST");
invalidateEvaluationCommands.add("INSERT_WETH_LIST");
invalidateEvaluationCommands.add("REMOVE_WETH_LIST");

cellMenuRegistry.add(
    "list_see_record",
    /** @type {import("@weth/o-spreadsheet").ActionSpec}*/({
        name: _t("See record"),
        sequence: 200,
        execute: async (env, isMiddleClick) => {
            const position = env.model.getters.getActivePosition();
            await SEE_RECORD_LIST(position, env, isMiddleClick);
        },
        isVisible: (env) => {
            const position = env.model.getters.getActivePosition();
            return SEE_RECORD_LIST_VISIBLE(position, env.model.getters);
        },
        icon: "o-spreadsheet-Icon.SEE_RECORDS",
    })
);

inverseCommandRegistry
    .add("INSERT_WETH_LIST", identity)
    .add("UPDATE_WETH_LIST_DOMAIN", identity)
    .add("UPDATE_WETH_LIST", identity)
    .add("RE_INSERT_WETH_LIST", identity)
    .add("RENAME_WETH_LIST", identity)
    .add("REMOVE_WETH_LIST", identity)
    .add("DUPLICATE_WETH_LIST", identity);

export { ListCorePlugin, ListCoreViewPlugin, ListUIPlugin };
