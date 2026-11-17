import {
    click,
    contains,
    hover,
    openDiscuss,
    openFormView,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";
import { expect, mockTouch, mockUserAgent, queryFirst } from "@weth/hoot";
import { serverState } from "@web/../tests/web_test_helpers";

export async function mailCanAddMessageReactionMobile() {
    mockTouch(true);
    mockUserAgent("android");
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create([
        {
            body: "Hello world",
            res_id: channelId,
            message_type: "comment",
            model: "discuss.channel",
        },
        {
            body: "Hello Weth",
            res_id: channelId,
            message_type: "comment",
            model: "discuss.channel",
        },
    ]);
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message", { count: 2 });
    await contains(".w-mail-Message:contains('Hello world')");
    await click(".w-mail-Message:contains('Hello world') [title='Expand']");
    await click(".w-dropdown-item:contains('Add a Reaction')");
    await contains(".w-overlay-item:has(.modal .w-EmojiPicker)");
    const emojiPickerZIndex = parseInt(
        getComputedStyle(queryFirst(".w-overlay-item:has(.modal .w-EmojiPicker)")).zIndex
    );
    const chatWindowZIndex = parseInt(getComputedStyle(queryFirst(".w-mail-ChatWindow")).zIndex);
    expect(chatWindowZIndex).toBeLessThan(emojiPickerZIndex, {
        message: "emoji picker modal should be above chat window",
    });
    await click(".modal .w-EmojiPicker .w-Emoji:contains('😀')");
    await contains(".w-mail-MessageReaction:contains('😀')");
    // Can add new reactions to a message that already has some
    await click(".w-mail-Message:contains('Hello world') [title='Expand']");
    await click(".w-dropdown-item:contains('Add a Reaction')");
    await click(".modal .w-EmojiPicker .w-Emoji:contains('🤣')");
    await contains(".w-mail-MessageReaction:contains('🤣')");
    await contains(".w-mail-MessageReaction:contains('😀')");
}

export async function mailCanCopyTextToClipboardMobile() {
    mockTouch(true);
    mockUserAgent("android");
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create([
        {
            body: "Hello world",
            res_id: channelId,
            message_type: "comment",
            model: "discuss.channel",
        },
        {
            body: "Hello Weth",
            res_id: channelId,
            message_type: "comment",
            model: "discuss.channel",
        },
    ]);
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message", { count: 2 });
    await contains(".w-mail-Message:contains('Hello world')");
    await click(".w-mail-Message:contains('Hello world') [title='Expand']");
    await contains(".w-dropdown-item:contains('Copy Text')");
}

export async function mailChatterMessageActionsInvisibleWhenNotHovered() {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "TestPartner" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "Hello world",
        model: "res.partner",
        res_id: partnerId,
        message_type: "comment",
    });
    const isNodeVisible = (selector) => {
        const { visibility } = getComputedStyle(queryFirst(selector));
        return visibility === "visible";
    };
    await start();
    await openFormView("res.partner", partnerId);
    await contains(".w-mail-Message-actions.invisible");
    await contains(".w-mail-Message-actions button", { count: 2 });
    expect(isNodeVisible(".w-mail-Message-actions button:eq(0)")).toBe(false);
    expect(isNodeVisible(".w-mail-Message-actions button:eq(1)")).toBe(false);
    await hover(".w-mail-Message");
    await contains(".w-mail-Message-actions:not(.invisible)");
    await contains(".w-mail-Message-actions button", { count: 2 });
    expect(isNodeVisible(".w-mail-Message-actions button:eq(0)")).toBe(true);
    expect(isNodeVisible(".w-mail-Message-actions button:eq(1)")).toBe(true);
}
