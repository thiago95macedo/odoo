import { Component, t, useProps } from "@weth/owl";

export class MassMailingBuilderSelectLabel extends Component {
    static template = "mass_mailing.BuilderSelectLabel";

    props = useProps({
        label: t.string(),
        description: t.string(),
    });
}
