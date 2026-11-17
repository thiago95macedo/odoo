import { Component, useProps, t } from "@weth/owl";

export class BackButton extends Component {
    static template = "point_of_sale.BackButton";
    props = useProps({
        onClick: t.function(),
        class: t.object().optional(),
    });
}
