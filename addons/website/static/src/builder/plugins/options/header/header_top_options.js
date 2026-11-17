import { Component, useProps, t } from "@weth/owl";

export class HeaderTopOptions extends Component {
    static template = "website.HeaderTopOptions";
    props = useProps({
        openEditMenu: t.function(),
    });
}
