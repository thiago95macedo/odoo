import {
    click,
    contains,
    defineMailModels,
    hover,
    insertText,
    onRpcAfter,
    openDiscuss,
    start,
    startServer,
    triggerHotkey,
} from "@mail/../tests/mail_test_helpers";
import { describe, test } from "@weth/hoot";
import { animationFrame, mockDate } from "@weth/hoot-mock";
import { Command, serverState, withUser } from "@web/../tests/web_test_helpers";
import { deserializeDateTime } from "@web/core/l10n/dates";
import { rpc } from "@web/core/network/rpc";
import { user } from "@web/core/user";

describe.current.tags("desktop");
defineMailModels();

test("navigate to sub channel", async () => {
    mockDate("2025-01-01 12:00:00", +1);
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    // Should access sub-thread after its creation.
    await contains(".w-mail-DiscussContent-threadName", { value: "General" });
    await click("button[title='Threads']");
    await click("button[aria-label='Create Thread']");
    await contains(".w-mail-DiscussContent-threadName", { value: "New Thread" });
    // Should access sub-thread when clicking on the menu.
    await click(".w-mail-NotificationItem-name:text(General)");
    await contains(".w-mail-DiscussContent-threadName", { value: "General" });
    await click("button[title='Threads']");
    await click(".w-mail-SubChannelPreview .w-mail-SubChannelPreview-name:text('New Thread')");
    await contains(".w-mail-DiscussContent-threadName", { value: "New Thread" });
    // Should access sub-thread when clicking on the notification.
    await click(".w-mail-NotificationItem-name:text(General)");
    await contains(".w-mail-DiscussContent-threadName", { value: "New Thread" });
    const messages = pyEnv["mail.message"].search_read([["message_type", "=", "notification"]]);
    const time = deserializeDateTime(messages.at(-1).date).toLocaleString(
        luxon.DateTime.TIME_SIMPLE,
        { locale: user.lang }
    );
    await contains(
        `.w-mail-NotificationMessage:text('${serverState.partnerName} started a thread: New Thread. ${time}')`
    );
    await click(".w-mail-NotificationMessage a:text('New Thread')");
    await contains(".w-mail-DiscussContent-threadName", { value: "New Thread" });
});

test("can manually unpin a sub-thread", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    // Open thread so this is pinned
    await contains(".w-mail-DiscussContent-threadName", { value: "General" });
    await click("button[title='Threads']");
    await click("button[aria-label='Create Thread']");
    await contains(".w-mail-DiscussContent-threadName", { value: "New Thread" });
    await click(
        ".w-mail-MessagingMenuItem:has(:text('Gene… New Thread')) [title='Channel Actions']"
    );
    await click(".w-dropdown-item:text('Hide Until New Message')");
    await contains(".w-mail-NotificationItem:has(:text('Gene… New Thread'))", { count: 0 });
});

test("create sub thread from existing message", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        model: "discuss.channel",
        res_id: channelId,
        body: "<p>Selling a training session and selling the products after the training session is more efficient.</p>",
    });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-Message-actions [title='Expand']");
    await click(".w-dropdown-item:contains('Create Thread')");
    await contains(".w-mail-DiscussContent-threadName", {
        value: "Selling a training session and",
    });
    await contains(
        ".w-mail-Message:has(:text('Selling a training session and selling the products after the training session is more efficient.'))"
    );
    await click(".w-mail-NotificationItem:has(.w-mail-NotificationItem-name:text('General'))");
    await click(".w-mail-Message-actions [title='Expand']");
    await contains(".w-dropdown-item:contains('Create Thread')", { count: 0 });
    await contains(".w-mail-SubChannelPreview:contains('Selling a training session and')");
    await click(".w-mail-SubChannelPreview:contains('Selling a training session and')");
    await contains(".w-mail-DiscussContent-threadName", {
        value: "Selling a training session and",
    });
    await contains(".w-mail-SubChannelPreview:contains('Selling a training session and')", {
        count: 0,
    });
});

test("should allow creating a thread from an existing thread", async () => {
    mockDate("2025-01-01 12:00:00", +1);
    const pyEnv = await startServer();
    const parent_channel_id = pyEnv["discuss.channel"].create({ name: "General" });
    const sub_channel_id = pyEnv["discuss.channel"].create({
        name: "sub channel",
        parent_channel_id: parent_channel_id,
    });
    pyEnv["mail.message"].create({
        model: "discuss.channel",
        res_id: sub_channel_id,
        body: "<p>hello alex</p>",
    });
    await start();
    await openDiscuss(sub_channel_id);
    await click(".w-mail-Message-actions [title='Expand']");
    await click(".w-dropdown-item:contains('Create Thread')");
    await contains(".w-mail-DiscussContent-threadName", { value: "hello alex" });
    await click(".w-mail-NotificationItem:has(.w-mail-NotificationItem-name:text('General'))");
    await contains(
        ".w-mail-NotificationMessage:text('" +
        serverState.partnerName +
        " started a thread: hello alex. 1:00 PM')"
    );
});

test("view sub thread of a message when not a member of the sub thread", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Bob" });
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const messageId = pyEnv["mail.message"].create({
        model: "discuss.channel",
        res_id: channelId,
        body: "<p>Hello world</p>",
    });
    pyEnv["discuss.channel"].create({
        channel_member_ids: [Command.create({ partner_id: partnerId })],
        from_message_id: messageId,
        name: "Bob's thread",
        parent_channel_id: channelId,
    });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-Message-actions [title='Expand']");
    await click(".w-dropdown-item:contains('View Thread')");
    await contains(".w-mail-DiscussContent-threadName", { value: "Bob's thread" });
});

test("view sub thread created by another user from an open channel", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Bob" });
    const userId = pyEnv["res.users"].create({ name: "Bob", partner_id: partnerId });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        name: "General",
    });
    const messageId = pyEnv["mail.message"].create({
        author_id: partnerId,
        body: "<p>Hello world</p>",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message-body:text('Hello world')");
    await withUser(userId, () =>
        rpc("/discuss/channel/sub_channel/create", {
            from_message_id: messageId,
            parent_channel_id: channelId,
        })
    );
    await click(
        ".w-mail-Message:has(.w-mail-Message-body:text('Hello world')) .w-mail-Message-actions [title='Expand']"
    );
    await click(".w-dropdown-item:contains('View Thread')");
    await contains(".w-mail-DiscussContent-threadName", { value: "Hello world" });
});

test("create sub thread from existing message (slow network)", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        model: "discuss.channel",
        res_id: channelId,
        body: "<p>Selling a training session and selling the products after the training session is more efficient.</p>",
    });
    const { promise, resolve } = Promise.withResolvers();
    onRpcAfter("/discuss/channel/sub_channel/create", async () => await promise);
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-Message-actions [title='Expand']");
    await click(".w-dropdown-item:contains('Create Thread')");
    await animationFrame();
    resolve();
    await contains(".w-mail-DiscussContent-threadName", {
        value: "Selling a training session and",
    });
    await contains(
        ".w-mail-Message:has(:text('Selling a training session and selling the products after the training session is more efficient.'))"
    );
});

test("create sub thread from sub-thread list", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await contains(".w-discuss-ChannelMemberList"); // wait for auto-open of this panel
    await click("button[title='Threads']");
    await contains(".w-mail-SubChannelList:text('This conversation has no threads yet.')");
    await click("button[aria-label='Create Thread']");
    await contains(".w-mail-DiscussContent-threadName", { value: "New Thread" });
    await click(".w-mail-NotificationItem:has(.w-mail-NotificationItem-name:text('General'))");
    await contains(".w-mail-DiscussContent-threadName", { value: "General" });
    await click(".w-mail-DiscussContent-header button[title='Threads']");
    await insertText(
        ".w-mail-ActionPanel:has(.w-mail-SubChannelList) .w-mail-SearchInput input",
        "MyEpicThread"
    );
    await contains(".w-mail-SubChannelList:text('No threads found.')");
    await click("button[aria-label='Create Thread']");
    await contains(".w-mail-DiscussContent-threadName", { value: "MyEpicThread" });
});

test("'Thread' menu available in threads", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
    });
    const subChannelID = pyEnv["discuss.channel"].create({
        name: "ThreadOne",
        parent_channel_id: channelId,
    });
    await start();
    await openDiscuss(subChannelID);
    await click(".w-mail-NotificationItem:has(:text('ThreadOne'))");
    await contains(".w-mail-DiscussContent-threadName", { value: "ThreadOne" });
    await click("button[title='Threads']");
    await insertText(".w-mail-ActionPanel input[placeholder='Search by name']", "ThreadTwo");
    await click(".w-mail-ActionPanel button:text('Create')");
    await click(".w-mail-NotificationItem:has(.w-mail-NotificationItem-name :text('ThreadTwo'))");
});

test("sub thread is available for channel and group, not for chat", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
    });
    pyEnv["discuss.channel"].create({
        name: "Group",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "group",
    });
    pyEnv["discuss.channel"].create({
        channel_type: "chat",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-discuss-ChannelMemberList"); // wait for auto-open of this panel
    await click("button[title='Threads']");
    await insertText(
        ".w-mail-ActionPanel input[placeholder='Search by name']",
        "Sub thread for channel"
    );
    await click(".w-mail-ActionPanel button:text('Create')");
    await click(
        ".w-mail-NotificationItem:has(.w-mail-NotificationItem-name :text('Sub thread for channel'))"
    );
    await click(".w-mail-MessagingMenu-tab[data-id='chat']");
    await click(".w-mail-NotificationItem:has(:text('Group'))");
    await contains(".w-mail-DiscussContent-threadName", { value: "Group" });
    await click("button[title='Threads']");
    await insertText(
        ".w-mail-ActionPanel input[placeholder='Search by name']",
        "Sub thread for group"
    );
    await click(".w-mail-ActionPanel button:text('Create')");
    await click(".w-mail-MessagingMenu-tab[data-id='channel']");
    await click(".w-mail-NotificationItem:has(:text('Sub thread for group'))");
    await click(".w-mail-MessagingMenu-tab[data-id='chat']");
    await click(".w-mail-NotificationItem:has(:text('Demo'))");
    await contains("button[title='Threads']", { count: 0 });
});

test("mention suggestions in thread match channel restrictions", async () => {
    const pyEnv = await startServer();
    const groupId = pyEnv["res.groups"].create({ name: "testGroup" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
        group_public_id: groupId,
    });
    pyEnv["discuss.channel"].create({
        name: "Thread",
        parent_channel_id: channelId,
    });
    pyEnv["res.users"].write(serverState.userId, { group_ids: [Command.link(groupId)] });
    const [partnerId_1, partnerId_2] = pyEnv["res.partner"].create([
        { email: "p1@weth.com.br", name: "p1" },
        { email: "p2@weth.com.br", name: "p2" },
    ]);
    pyEnv["res.users"].create([
        { partner_id: partnerId_1, group_ids: [Command.link(groupId)] },
        { partner_id: partnerId_2 },
    ]);
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-NotificationItem.w-active:has(:text('General'))");
    await insertText(".w-mail-Composer-input", "@");
    await contains(".w-mail-Composer-suggestion", { count: 2 });
    await contains(".w-mail-Composer-suggestion:has(:text('Mitchell Admin'))");
    await contains(".w-mail-Composer-suggestion:has(:text('p1'))");
    await click(".w-mail-NotificationItem:has(:text('Thread'))");
    await contains(".w-mail-NotificationItem.w-active:has(:text('Thread'))");
    await insertText(".w-mail-Composer-input", "@");
    await contains(".w-mail-Composer-suggestion", { count: 2 });
    await contains(".w-mail-Composer-suggestion:has(:text('Mitchell Admin'))");
    await contains(".w-mail-Composer-suggestion:has(:text('p1'))");
});

test("sub-thread is visually muted when mute is active", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-DiscussContent-threadName", { value: "General" });
    await click("button[title='Threads']");
    await click("button[aria-label='Create Thread']");
    await contains(".w-mail-NotificationItem.opacity-50:has(:text('New Thread'))", { count: 0 });
    await click(".w-mail-NotificationItem:has(:text('Gene… New Thread'))");
    await click("button[title='Notification Settings']");
    await hover("button:has(:text('Mute Conversation'))");
    await click(".w-dropdown-item:contains('Until I turn it back on')");
    await contains(".w-mail-NotificationItem.opacity-50:has(:text('New Thread'))");
});

test("show notification when clicking on deleted thread", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "Test Channel" });
    const activeThreadId = pyEnv["discuss.channel"].create({
        name: "Message 1",
        parent_channel_id: channelId,
    });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: `<div class="o_mail_notification"> started a thread:<a href="#" class="o_channel_redirect" data-oe-id="${activeThreadId}" data-oe-model="discuss.channel">Message 1</a></div>`,
        message_type: "notification",
        model: "discuss.channel",
        res_id: channelId,
    });
    pyEnv["discuss.channel"].unlink(activeThreadId);
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-NotificationMessage a:text('Message 1')");
    await contains(
        ".o_notification:has(.o_notification_bar.bg-danger):text('This thread is no longer available.')"
    );
});

test("Renaming a thread should update the message notification in parent channel", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-DiscussContent-threadName", { value: "General" });
    await click("button[title='Threads']");
    await click("button[aria-label='Create Thread']");
    await contains("input.w-mail-DiscussContent-threadName:value(New Thread)");
    await insertText(".w-mail-DiscussContent-threadName:enabled", "Renamed Thread", {
        replace: true,
    });
    triggerHotkey("Enter");
    await click(".w-mail-NotificationItem-name:text(General)");
    await contains(".w-mail-NotificationMessage a:text('Renamed Thread')");
});

test("Can delete channel thread as author of thread", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const subChannelID = pyEnv["discuss.channel"].create({
        name: "test thread",
        parent_channel_id: channelId,
    });
    await start();
    await openDiscuss(subChannelID);
    await contains(".w-mail-DiscussContent-threadName[title='test thread']");
    await click(".w-mail-NotificationItem:has(:text('test thread')) [title='Channel Actions']");
    await click(".w-dropdown-item:contains('Delete Thread')");
    await click(".modal button:contains('Delete Thread')");
    await contains(".w-mail-DiscussContent-threadName[title='General']");
    await contains(
        `.w-mail-NotificationMessage :text(Mitchell Admin deleted the thread "test thread")`
    );
});

test("can mention all group chat members inside its sub-thread", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Lilibeth" });
    const groupChannelId = pyEnv["discuss.channel"].create({
        name: "Our channel",
        channel_type: "group",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    const groupSubChannelId = pyEnv["discuss.channel"].create({
        name: "New Thread",
        parent_channel_id: groupChannelId,
        channel_member_ids: [Command.create({ partner_id: serverState.partnerId })],
    });
    await start();
    await openDiscuss(groupSubChannelId);
    await insertText(".w-mail-Composer-input", "@");
    await contains(".w-mail-Composer-suggestion", { count: 2 });
});

test("should temporarily repin unpinned thread while it is being viewed", async () => {
    mockDate("2023-06-07T06:07:00");
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "Main Channel",
        channel_member_ids: [Command.create({ partner_id: serverState.partnerId })],
    });
    const [subChannelId] = pyEnv["discuss.channel"].create([
        {
            name: "Sub Channel 1",
            parent_channel_id: channelId,
            channel_member_ids: [
                Command.create({
                    partner_id: serverState.partnerId,
                    unpin_dt: "2023-06-06 06:07:00",
                    last_interest_dt: "2023-06-05 06:07:00",
                }),
            ],
        },
        {
            name: "Sub Channel 2",
            parent_channel_id: channelId,
        },
    ]);
    await start();
    await openDiscuss(subChannelId);
    await contains(".w-mail-NotificationItem:has(:text('Sub Channel 2'))");
    await contains(".w-mail-NotificationItem.w-active:has(:text('Sub Channel 1'))");
    await click(".w-mail-NotificationItem:has(:text('Sub Channel 2'))");
    await contains(".w-mail-NotificationItem:has(:text('Sub Channel 1'))", { count: 0 });
    // Sub channel 1 is expired and disappears when its not active thread
    await contains(".w-mail-NotificationItem.w-active:has(:text('Sub Channel 2'))");
    await click("button[title='Threads']");
    await contains(".w-mail-SubChannelPreview-name:eq(0):text('Sub Channel 2')");
    await contains(".w-mail-SubChannelPreview-name:eq(1):text('Sub Channel 1')");
    await click(".w-mail-SubChannelPreview-name:text('Sub Channel 1')");
    await contains(".w-mail-NotificationItem:has(:text('Sub Channel 2'))");
    await contains(".w-mail-NotificationItem.w-active:has(:text('Sub Channel 1'))");
    // Sub channel 1 is persistently pinned when posting a message
    await insertText(".w-mail-Composer-input", "Batman");
    await click(".w-mail-Composer button[title='Send']:enabled");
    await click(".w-mail-NotificationItem:has(:text('Sub Channel 2'))");
    await contains(".w-mail-NotificationItem:has(:text('Sub Channel 1'))");
    await contains(".w-mail-NotificationItem.w-active:has(:text('Sub Channel 2'))");
});
