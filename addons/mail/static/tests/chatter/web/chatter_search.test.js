import {
    SIZES,
    click,
    contains,
    defineMailModels,
    editInput,
    insertText,
    openFormView,
    patchUiSize,
    scroll,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";
import { describe, test } from "@weth/hoot";
import { serverState } from "@web/../tests/web_test_helpers";

import { HIGHLIGHT_CLASS } from "@mail/core/common/message_search_hook";

describe.current.tags("desktop");
defineMailModels();

test("Chatter should display search icon", async () => {
    const pyEnv = await startServer();
    patchUiSize({ size: SIZES.XXL });
    await start();
    const partnerId = pyEnv["res.partner"].create({ name: "John Doe" });
    await openFormView("res.partner", partnerId);
    await contains("[title='Search Messages']");
});

test("Click on the search icon should open the search form", async () => {
    const pyEnv = await startServer();
    patchUiSize({ size: SIZES.XXL });
    await start();
    const partnerId = pyEnv["res.partner"].create({ name: "John Doe" });
    await openFormView("res.partner", partnerId);
    await click("[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    await contains(".w-mail-SearchInput input");
});

test("Search in chatter", async () => {
    patchUiSize({ size: SIZES.XXL });
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "John Doe" });
    pyEnv["mail.message"].create({
        body: "not empty",
        model: "res.partner",
        res_id: partnerId,
    });
    await start();
    await openFormView("res.partner", partnerId);
    await click("[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput input");
    await editInput(document.body, ".w-mail-SearchInput input", "empty");
    await contains(".w-mail-SearchMessageResult .w-mail-Message");
    await click(".w-mail-MessageCard-jump");
    await contains(".w-mail-Message.w-highlighted .w-mail-Message-content:text('not empty')");
});

test("Close button should close the search panel", async () => {
    patchUiSize({ size: SIZES.XXL });
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "John Doe" });
    pyEnv["mail.message"].create({
        body: "not empty",
        model: "res.partner",
        res_id: partnerId,
    });
    await start();
    await openFormView("res.partner", partnerId);
    await click(".w-mail-Chatter-topbar [title='Search Messages']");
    await insertText(".w-mail-SearchInput input", "empty");
    await contains(".w-mail-SearchMessageResult .w-mail-Message");
    await click(".w-mail-SearchMessageInput [title='Close']");
    await contains(".w-mail-SearchMessageInput", { count: 0 });
});

test("opening search in chatter hides files and pinned messages panels", async () => {
    patchUiSize({ size: SIZES.XXL });
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "John Doe" });
    pyEnv["mail.message"].create({
        body: "Pinned message",
        model: "res.partner",
        pinned_at: "2025-01-01 00:00:00",
        res_id: partnerId,
    });
    pyEnv["ir.attachment"].create({
        mimetype: "text/plain",
        name: "A.txt",
        res_id: partnerId,
        res_model: "res.partner",
    });
    await start();
    await openFormView("res.partner", partnerId);
    await click("button[aria-label='Attach files']:text('1')");
    await contains(".w-mail-AttachmentBox");
    await click("[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    await contains(".w-mail-AttachmentBox", { count: 0 });
    await contains("button[title='Attach files']:enabled:text('1')");
    await click("button[title='Pinned Messages']:enabled");
    await contains(".w-mail-pinnedMessages");
    await click("[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    await contains(".w-mail-pinnedMessages", { count: 0 });
});

test("Search in chatter should be hightligted", async () => {
    patchUiSize({ size: SIZES.XXL });
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "John Doe" });
    pyEnv["mail.message"].create({
        body: "not empty",
        model: "res.partner",
        res_id: partnerId,
    });
    await start();
    await openFormView("res.partner", partnerId);
    await click("[title='Search Messages']");
    await insertText(".w-mail-SearchInput input", "empty");
    await contains(`.w-mail-SearchMessageResult .w-mail-Message .${HIGHLIGHT_CLASS}`);
});

test("Scrolling bottom in non-aside chatter should load more searched message", async () => {
    patchUiSize({ size: SIZES.LG }); // non-aside
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "John Doe" });
    for (let i = 0; i < 60; i++) {
        pyEnv["mail.message"].create({
            author_id: serverState.partnerId,
            body: "This is a message",
            attachment_ids: [],
            message_type: "comment",
            model: "res.partner",
            res_id: partnerId,
        });
    }
    await start();
    await openFormView("res.partner", partnerId);
    await click("[title='Search Messages']");
    await insertText(".w-mail-SearchInput input", "message");
    await contains(".w-mail-SearchMessageResult .w-mail-Message", { count: 30 });
    await scroll(".o_content", "bottom");
    await contains(".w-mail-SearchMessageResult .w-mail-Message", { count: 60 });
});

test("Switching chatter filters after empty result should show messages", async () => {
    const pyEnv = await startServer();
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "res.partner",
        res_id: serverState.partnerId,
        subtype_id: pyEnv["mail.message.subtype"].search([
            ["subtype_xmlid", "=", "mail.mt_comment"],
        ])[0],
    });
    await start();
    await openFormView("res.partner", serverState.partnerId);
    await click("[title='Search Messages']");
    await click("[title='Filter Messages']");
    await click(".w-dropdown-item:text('Changes')");
    await contains(".w-mail-MessageCardList:text('No messages found')");
    await click("[title='Filter Messages']");
    await click(".w-dropdown-item:text('Messages')");
    await contains(".w-mail-SearchMessageResult .w-mail-Message-content:text('not empty')");
});
