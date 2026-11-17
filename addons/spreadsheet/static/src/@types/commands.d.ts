import { FieldMatching } from "./global_filter.d";
import {
    CorePlugin,
    UIPlugin,
    DispatchResult,
    CommandResult,
    AddPivotCommand,
    UpdatePivotCommand,
    CancelledReason,
} from "@weth/o-spreadsheet";
import * as WethCancelledReason from "@spreadsheet/o_spreadsheet/cancelled_reason";

type CoreDispatch = CorePlugin["dispatch"];
type UIDispatch = UIPlugin["dispatch"];
type CoreCommand = Parameters<CorePlugin["allowDispatch"]>[0];
type Command = Parameters<UIPlugin["allowDispatch"]>[0];

// TODO look for a way to remove this and use the real import * as WethCancelledReason
type WethCancelledReason = string;

declare module "@spreadsheet" {
    interface WethCommandDispatcher {
        dispatch<T extends WethCommandTypes, C extends Extract<WethCommand, { type: T }>>(
            type: {} extends Omit<C, "type"> ? T : never
        ): WethDispatchResult;
        dispatch<T extends WethCommandTypes, C extends Extract<WethCommand, { type: T }>>(
            type: T,
            r: Omit<C, "type">
        ): WethDispatchResult;
    }

    interface WethCoreCommandDispatcher {
        dispatch<T extends WethCoreCommandTypes, C extends Extract<WethCoreCommand, { type: T }>>(
            type: {} extends Omit<C, "type"> ? T : never
        ): WethDispatchResult;
        dispatch<T extends WethCoreCommandTypes, C extends Extract<WethCoreCommand, { type: T }>>(
            type: T,
            r: Omit<C, "type">
        ): WethDispatchResult;
    }

    interface WethDispatchResult extends DispatchResult {
        readonly reasons: (CancelledReason | WethCancelledReason)[];
        isCancelledBecause(reason: CancelledReason | WethCancelledReason): boolean;
    }

    type WethCommandTypes = WethCommand["type"];
    type WethCoreCommandTypes = WethCoreCommand["type"];

    type WethDispatch = UIDispatch & WethCommandDispatcher["dispatch"];
    type WethCoreDispatch = CoreDispatch & WethCoreCommandDispatcher["dispatch"];


    type WethListCoreDefinition = {
        model: string;
        domain: Array<Array<string>>;
        orderBy: Array<string>;
        context: Record<string, any>;
        columns: { name: string; string?: string }[];
    }

    // CORE

    export interface ExtendedAddPivotCommand extends AddPivotCommand {
        pivot: ExtendedPivotCoreDefinition;
    }

    export interface ExtendedUpdatePivotCommand extends UpdatePivotCommand {
        pivot: ExtendedPivotCoreDefinition;
    }

    export interface AddThreadCommand {
        type: "ADD_COMMENT_THREAD";
        threadId: number;
        sheetId: string;
        col: number;
        row: number;
    }

    export interface EditThreadCommand {
        type: "EDIT_COMMENT_THREAD";
        threadId: number;
        sheetId: string;
        col: number;
        row: number;
        isResolved: boolean;
    }

    export interface DeleteThreadCommand {
        type: "DELETE_COMMENT_THREAD";
        threadId: number;
        sheetId: string;
        col: number;
        row: number;
    }

    // this command is deprecated. use UPDATE_PIVOT instead
    export interface UpdatePivotDomainCommand {
        type: "UPDATE_WETH_PIVOT_DOMAIN";
        pivotId: string;
        domain: Array;
    }

    export interface AddGlobalFilterCommand {
        type: "ADD_GLOBAL_FILTER";
        filter: CmdGlobalFilter;
        [string]: any; // Fields matching
    }

    export interface EditGlobalFilterCommand {
        type: "EDIT_GLOBAL_FILTER";
        filter: CmdGlobalFilter;
        [string]: any; // Fields matching
    }

    export interface RemoveGlobalFilterCommand {
        type: "REMOVE_GLOBAL_FILTER";
        id: string;
    }

    export interface MoveGlobalFilterCommand {
        type: "MOVE_GLOBAL_FILTER";
        id: string;
        delta: number;
    }

    export interface SetWethLinkToChartCommand {
        type: "UPDATE_WETH_LINK_TO_CHART";
        chartId: string;
        wethLink:
        | { type: "wethMenu"; wethMenuId: number | string }
        | {
            type: "dataSource";
            dataSourceCoreId: string;
            datasourceType: string;
        }
        | undefined;
    }

    // UI

    export interface RefreshAllDataSourcesCommand {
        type: "REFRESH_ALL_DATA_SOURCES";
    }

    export interface SetGlobalFilterValueCommand {
        type: "SET_GLOBAL_FILTER_VALUE";
        id: string;
        value: any;
    }

    export interface SetManyGlobalFilterValueCommand {
        type: "SET_MANY_GLOBAL_FILTER_VALUE";
        filters: { filterId: string; value: any }[];
    }

    export interface InsertListCommand {
        type: "INSERT_WETH_LIST";
        listId: string;
        definition: WethListCoreDefinition;
        sheetId: string;
        col: number;
        row: number;
        linesNumber: number;
        mode: "static" | "dynamic";
    }

    export interface ReinsertListCommand {
        type: "RE_INSERT_WETH_LIST";
        listId: string;
        sheetId: string;
        col: number;
        row: number;
        linesNumber: number;
        columns: { name: string; string?: string }[];
        mode: "static" | "dynamic";
    }

    type WethCoreCommand =
        | ExtendedAddPivotCommand
        | ExtendedUpdatePivotCommand
        | UpdatePivotDomainCommand
        | AddThreadCommand
        | DeleteThreadCommand
        | EditThreadCommand
        | AddGlobalFilterCommand
        | EditGlobalFilterCommand
        | RemoveGlobalFilterCommand
        | MoveGlobalFilterCommand
        | InsertListCommand
        | ReinsertListCommand;

    export type AllCoreCommand = WethCoreCommand | CoreCommand;

    type WethLocalCommand =
        | RefreshAllDataSourcesCommand
        | SetGlobalFilterValueCommand
        | SetManyGlobalFilterValueCommand;

    type WethCommand = WethCoreCommand | WethLocalCommand;

    export type AllCommand = WethCommand | Command;
}
