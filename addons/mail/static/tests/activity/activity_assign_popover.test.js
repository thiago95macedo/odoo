import {
    click,
    contains,
    defineMailModels,
    insertText,
    openFormView,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";
import { describe, test } from "@weth/hoot";
import { onRpc } from "@web/../tests/web_test_helpers";

describe.current.tags("desktop");
defineMailModels();

test("activity assign popover simplest layout", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({});
    pyEnv["mail.activity"].create({
        can_write: true,
        res_id: partnerId,
        res_model: "res.partner",
        user_id: false,
    });

    onRpc("mail.activity", "write", () => {
        throw new Error("RPC 'write' must not be called on discard");
    });

    await start();
    await openFormView("res.partner", partnerId);
    await click(".w-mail-Activity-assign");
    await contains(".w-mail-ActivityAssignPopover");
    await contains(".w-mail-ActivityAssignPopover input[type='text']");
    await contains(".w-mail-ActivityAssignPopover button[aria-label='Assign']");
    await contains(".w-mail-ActivityAssignPopover button[aria-label='Discard']");
    await click(".w-mail-ActivityAssignPopover button[aria-label='Discard']");
    await contains(".w-mail-ActivityAssignPopover", { count: 0 });
});

test("activity assign popover assign user", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({});
    pyEnv["mail.activity"].create({
        can_write: true,
        res_id: partnerId,
        res_model: "res.partner",
        user_id: false,
    });

    await start();
    await openFormView("res.partner", partnerId);
    await click(".w-mail-Activity-assign");
    await insertText(".w-mail-ActivityAssignPopover input[type='text']", "Mitchell");
    await click(".ui-menu-item:text('Mitchell Admin')");
    await click(".w-mail-ActivityAssignPopover button[aria-label='Assign']");
    await contains(".w-mail-ActivityAssignPopover", { count: 0 });
    await contains(".w-mail-Activity-user", { text: "for Mitchell Admin" });
});
