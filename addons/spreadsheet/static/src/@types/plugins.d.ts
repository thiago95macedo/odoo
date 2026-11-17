declare module "@spreadsheet" {
    import { CommandResult, CorePlugin, UIPlugin } from "@weth/o-spreadsheet";
    import { CommandResult as CR } from "@spreadsheet/o_spreadsheet/cancelled_reason";
    type WethCommandResult = CommandResult | typeof CR;

    export interface WethCorePlugin extends CorePlugin {
        getters: WethCoreGetters;
        dispatch: WethCoreDispatch;
        allowDispatch(command: AllCoreCommand): string | string[];
        beforeHandle(command: AllCoreCommand): void;
        handle(command: AllCoreCommand): void;
    }

    export interface WethCorePluginConstructor {
        new(config: unknown): WethCorePlugin;
    }

    export interface WethUIPlugin extends UIPlugin {
        getters: WethGetters;
        dispatch: WethDispatch;
        allowDispatch(command: AllCommand): string | string[];
        beforeHandle(command: AllCommand): void;
        handle(command: AllCommand): void;
    }

    export interface WethUIPluginConstructor {
        new(config: unknown): WethUIPlugin;
    }
}
