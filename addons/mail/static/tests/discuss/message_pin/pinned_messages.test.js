import {
    click,
    contains,
    defineMailModels,
    isInViewportOf,
    openDiscuss,
    scroll,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";
import { describe, test, expect } from "@weth/hoot";
import { disableAnimations } from "@weth/hoot-mock";

describe.current.tags("desktop");
defineMailModels();

async function assertPinnedPanelUnpinCount(expectedCount) {
    await contains(".dropdown-item", { text: "Unpin", count: expectedCount });
    await click(".w-mail-DiscussContent-header button[title='Pinned Messages']");
    await contains(".w-discuss-PinnedMessagesPanel .w-mail-Message", {
        text: "Test pinned message",
    });
    expect(".w-discuss-PinnedMessagesPanel button[title='Unpin']").toHaveCount(expectedCount);
}

test("Pin message", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        body: "Hello world!",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-discuss-ChannelMemberList"); // wait for auto-open of this panel
    await click(".w-mail-DiscussContent-header button[title='Pinned Messages']");
    await contains(
        '.w-discuss-PinnedMessagesPanel p:text("This channel doesn\'t have any pinned messages.")'
    );
    await click(".w-mail-Message [title='Expand']");
    await click(".dropdown-item:text('Pin')");
    await click(".modal-footer button:text('Pin Message')");
    await contains(".w-discuss-PinnedMessagesPanel .w-mail-Message:has(:text('Hello world!'))");
});

test("Unpin message", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        body: "Hello world!",
        model: "discuss.channel",
        res_id: channelId,
        pinned_at: "2023-03-30 11:27:11",
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-discuss-ChannelMemberList"); // wait for auto-open of this panel
    await click(".w-mail-DiscussContent-header button[title='Pinned Messages']");
    await contains(".w-discuss-PinnedMessagesPanel .w-mail-Message");
    await click(".w-mail-Message [title='Expand']");
    await click(".dropdown-item:text('Unpin')");
    await click(".modal-footer button:text('Unpin Message')");
    await contains(".w-discuss-PinnedMessagesPanel .w-mail-Message", { count: 0 });
});

test("Open pinned panel from notification", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        body: "Hello world!",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss(channelId);
    await click(":nth-child(1 of .w-mail-Message) [title='Expand']");
    await click(".dropdown-item:text('Pin')");
    await click(".modal-footer button:text('Pin Message')");
    await contains(".w-discuss-PinnedMessagesPanel", { count: 0 });
    await click(".o_mail_notification a:text('See all pinned messages')");
    await contains(".w-discuss-PinnedMessagesPanel");
});

test("Jump to message", async () => {
    disableAnimations();
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        body: "Hello world!",
        model: "discuss.channel",
        res_id: channelId,
        pinned_at: "2023-04-03 08:15:04",
    });
    for (let i = 0; i < 20; i++) {
        pyEnv["mail.message"].create({
            body: "Non Empty Body ".repeat(25),
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
        });
    }
    await start();
    await openDiscuss(channelId);
    await contains(".w-discuss-ChannelMemberList"); // wait for auto-open of this panel
    await click(".w-mail-DiscussContent-header button[title='Pinned Messages']");
    await click(".w-discuss-PinnedMessagesPanel a[role='button']:text('Jump')");
    await contains(".w-mail-Thread .w-mail-Message-body:text('Hello world!')", { visible: true });
});

test("Jump to message after a jump that needs no scroll", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        body: "First pinned",
        model: "discuss.channel",
        res_id: channelId,
        pinned_at: "2023-04-03 08:15:04",
    });
    for (let i = 0; i < 20; i++) {
        pyEnv["mail.message"].create({
            body: "Non Empty Body ".repeat(25),
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
        });
    }
    pyEnv["mail.message"].create({
        body: "Last pinned",
        model: "discuss.channel",
        res_id: channelId,
        pinned_at: "2023-04-03 08:16:04",
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-discuss-ChannelMemberList");
    await click(".w-mail-DiscussContent-header button[title='Pinned Messages']");
    await contains(".w-mail-Thread", { setScroll: 0 });
    await click(".card:has(:text(First pinned)) .w-mail-MessageCard-jump");
    await contains(".w-mail-Message.w-highlighted:has(:text(First pinned))");
    await click(".card:has(:text(Last pinned)) .w-mail-MessageCard-jump");
    await isInViewportOf(".w-mail-Thread .w-mail-Message-body:text(Last pinned)", ".w-mail-Thread");
});

test("Jump to message from notification", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        body: "Hello world!",
        model: "discuss.channel",
        res_id: channelId,
    });
    for (let i = 0; i < 20; i++) {
        pyEnv["mail.message"].create({
            body: "Non Empty Body ".repeat(25),
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
        });
    }
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message", { count: 21 });
    await click(":nth-child(1 of .w-mail-Message) [title='Expand']");
    await click(".dropdown-item:text('Pin')");
    await click(".modal-footer button:text('Pin Message')");
    await contains(".o_mail_notification");
    await scroll(".w-mail-Thread", "bottom");
    await contains(".w-mail-Thread", { scroll: "bottom" });
    await click(".o_mail_notification a:text('message')");
    await contains(".w-mail-Thread", { count: 0, scroll: "bottom" });
});

test("can add reactions from pinned panel", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        body: "Hello world!",
        model: "discuss.channel",
        res_id: channelId,
        pinned_at: "2025-10-09 11:15:04",
    });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-Message-actions [title='Add a Reaction']");
    await click(".w-mail-QuickReactionMenu button:text('👍')");
    await contains(".w-mail-MessageReaction:text('👍 1')");
    await click(".w-mail-DiscussContent-header button[title='Pinned Messages']");
    await click(".w-discuss-PinnedMessagesPanel .w-mail-Message [title='Add a Reaction']");
    await click(".w-mail-QuickReactionMenu button:text('👍')");
    await contains(".w-mail-MessageReaction", { count: 0 });
});

test("Guest user cannot see unpin button", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
        channel_type: "channel",
    });
    pyEnv["mail.message"].create({
        body: "Test pinned message",
        model: "discuss.channel",
        res_id: channelId,
        pinned_at: "2023-03-30 11:27:11",
    });
    await start({ authenticateAs: false });
    await openDiscuss(channelId);
    await contains(".w-mail-Message", { text: "Test pinned message" });
    await click(".w-mail-Message [title='Expand']");
    await contains(".dropdown-item", { text: "Reply" });
    await contains(".dropdown-item", { text: "Unpin", count: 0 });
    await assertPinnedPanelUnpinCount(0);
});

test("Internal user can see unpin button", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        body: "Test pinned message",
        model: "discuss.channel",
        res_id: channelId,
        pinned_at: "2023-03-30 11:27:11",
    });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-Message [title='Expand']");
    await assertPinnedPanelUnpinCount(1);
});
