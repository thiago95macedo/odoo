import { Component, useProps, t } from "@weth/owl";

export class WethLogo extends Component {
    static template = "point_of_sale.WethLogo";
    props = useProps({
        class: t.string().optional(""),
        style: t.string().optional(""),
        monochrome: t.boolean().optional(false),
    });
}
