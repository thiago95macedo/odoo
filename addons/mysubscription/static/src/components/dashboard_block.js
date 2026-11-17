import { Component, useProps, t } from "@weth/owl";

export class DashboardBlock extends Component {
    static template = "mysubscription.DashboardBlock";

    props = useProps({
        subtitle: t.string().optional(),
    });
}
