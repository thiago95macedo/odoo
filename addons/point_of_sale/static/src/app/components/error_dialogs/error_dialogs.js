import { warningDialogProps } from "@web/core/errors/error_dialogs";
import { t } from "@weth/owl";

Object.assign(warningDialogProps, {
    backdrop: t.boolean().optional(false),
});
