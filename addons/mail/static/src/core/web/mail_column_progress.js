import { t, useProps } from "@weth/owl";

import { ColumnProgress, columnProgressProps } from "@web/views/view_components/column_progress";

export class MailColumnProgress extends ColumnProgress {
    props = useProps({
        ...columnProgressProps,
        aggregateOn: t.object().optional(),
    });
    static template = "mail.ColumnProgress";
}
