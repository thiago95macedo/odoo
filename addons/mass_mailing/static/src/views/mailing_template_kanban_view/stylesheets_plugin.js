import { Plugin, t, useConfig } from "@weth/owl";

export class StyleSheetPlugin extends Plugin {
    promises = useConfig("styleSheetPromises", t.array(t.promise()));
}
