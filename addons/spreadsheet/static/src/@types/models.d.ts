declare module "@spreadsheet" {
    import { Model } from "@weth/o-spreadsheet";

    export interface WethSpreadsheetModel extends Model {
        getters: WethGetters;
        dispatch: WethDispatch;
    }

    export interface WethSpreadsheetModelConstructor {
        new(
            data: object,
            config: Partial<Model["config"]>,
            revisions: object[]
        ): WethSpreadsheetModel;
    }
}
