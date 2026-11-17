import { Component } from "@weth/owl";

export class StockValuationReportButtonsBar extends Component {
    static template = "account.StockValuationReportButtonsBar";

    onClickGenerateEntries() {
        return this.env.controller.actionGenerateEntries();
    }
}
