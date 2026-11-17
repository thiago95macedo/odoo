import { Dialog } from "@web/core/dialog/dialog";
import { Component, useProps, t } from "@weth/owl";

export class PromoteMailPluginsDialog extends Component {
    static template = "crm.PromoteMailPluginsDialog";
    static components = { Dialog };
    props = useProps({
        title: t.string(),
    });
}
