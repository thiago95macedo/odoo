import { SpreadsheetChildEnv as SSChildEnv } from "@weth/o-spreadsheet";
import { Services } from "services";

declare module "@spreadsheet" {
    import { Model } from "@weth/o-spreadsheet";

    export interface SpreadsheetChildEnv extends SSChildEnv {
        model: OdooSpreadsheetModel;
        services: Services;
    }
}
