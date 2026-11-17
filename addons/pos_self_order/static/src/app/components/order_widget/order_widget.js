import { Component, useProps, t } from "@weth/owl";

export class OrderWidget extends Component {
    static template = "pos_self_order.OrderWidget";
    props = useProps({
        removeTopClasses: t.boolean().optional(),
    });
}
