import {
    assertChatBubbleAndWindowImStatus,
    assertChatHub,
    click,
    contains,
    defineMailModels,
    focus,
    hover,
    inputFiles,
    insertText,
    isInViewportOf,
    listenStoreFetch,
    openDiscuss,
    openFormView,
    openListView,
    openMessagingMenu,
    patchUiSize,
    scroll,
    setupChatHub,
    SIZES,
    start,
    startServer,
    triggerHotkey,
    waitStoreFetch,
    MENU_ACTIVE_IDS,
} from "@mail/../tests/mail_test_helpers";
import { describe, expect, test, waitFor } from "@weth/hoot";
import { mockDate, tick } from "@weth/hoot-mock";
import {
    Command,
    contains as webContains,
    getService,
    preloadBundle,
    serverState,
    withUser,
} from "@web/../tests/web_test_helpers";

import { rpc } from "@web/core/network/rpc";
import { range } from "@web/core/utils/numbers";

describe.current.tags("desktop");
defineMailModels();
preloadBundle("web.assets_emoji");

test("Mobile: chat window shouldn't open automatically after receiving a new message", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    const userId = pyEnv["res.users"].create({ partner_id: partnerId });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    patchUiSize({ size: SIZES.SM });
    await start();
    await contains(".o_menu_systray i[aria-label='Messages']");
    await contains(".w-mail-MessagingMenuInDropdown-counter", { count: 0 });
    // simulate receiving a message
    withUser(userId, () =>
        rpc("/mail/message/post", {
            post_data: { body: "hu", message_type: "comment" },
            thread_id: channelId,
            thread_model: "discuss.channel",
        })
    );
    await contains(".w-mail-MessagingMenuInDropdown-counter:text('1')");
    await contains(".w-mail-ChatWindow", { count: 0 });
});

test('chat window: post message on channel with "CTRL-Enter" keyboard shortcut for small screen size', async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({});
    patchUiSize({ size: SIZES.SM });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-ChatWindow .w-mail-Composer-input", "Test");
    triggerHotkey("control+Enter");
    await contains(".w-mail-Message");
});

test("load messages from opening chat window from messaging menu", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "channel",
        group_public_id: false,
        name: "General",
    });
    for (let i = 0; i <= 20; i++) {
        pyEnv["mail.message"].create({
            body: "not empty",
            model: "discuss.channel",
            res_id: channelId,
        });
    }
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-Message", { count: 21 });
});

test("chat window: basic rendering", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-ChatWindow");
    await contains(".w-mail-ChatWindow-header:text('General')");
    await contains(".w-mail-ChatWindow-header .w-mail-ChatWindow-threadAvatar");
    await contains(".w-mail-ChatWindow-header button", { count: 5 });
    await contains("[title='Start Call']");
    await contains("[title='Start Video Call']");
    await contains("[title='Open Actions Menu']");
    await contains("[title='Fold']");
    await contains("[title*='Close Chat Window']");
    await contains(".w-mail-ChatWindow .w-mail-Thread:has(:text('Welcome to #General!'))");
    // dropdown requires an extra delay before click (because handler is registered in useEffect)
    await contains("[title='Open Actions Menu']");
    await click("[title='Open Actions Menu']");
    await contains(".w-dropdown-item", { count: 14 });
    await contains(".w-dropdown-item:text('Open in Discuss')");
    await contains(".w-dropdown-item:text('Attachments')");
    await contains(".w-dropdown-item:text('Pinned Messages')");
    await contains(".w-dropdown-item:text('Members')");
    await contains(".w-dropdown-item:text('Threads')");
    await contains(".w-dropdown-item:text('Invite People')");
    await contains(".w-dropdown-item:text('Search Messages')");
    await contains(".w-dropdown-item:text('Rename Thread')");
    await contains(".w-dropdown-item:text('Notification Settings')");
    await contains(".w-dropdown-item:text('Add to Favorites')");
    await contains(".w-dropdown-item:text('Voice & Video Settings')");
    await contains(".w-dropdown-item:text('View Recordings')");
    await contains(".w-dropdown-item:text('Hide Until New Message')");
    await contains(".w-dropdown-item:text('Leave Conversation')");
});

test("light user's chat window has no Open in Discuss action", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "General" });
    serverState.isRegularUser = false;
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await waitFor(".w-mail-ChatWindow .w-mail-Thread:has(:text('Welcome to #General!'))");
    await click("[title='Open Actions Menu']");
    await waitFor(".w-dropdown-item:count(13)");
    await waitFor(".w-dropdown-item:text('Attachments')");
    await waitFor(".w-dropdown-item:text('Pinned Messages')");
    await waitFor(".w-dropdown-item:text('Members')");
    await waitFor(".w-dropdown-item:text('Threads')");
    await waitFor(".w-dropdown-item:text('Invite People')");
    await waitFor(".w-dropdown-item:text('Search Messages')");
    await waitFor(".w-dropdown-item:text('Rename Thread')");
    await waitFor(".w-dropdown-item:text('Notification Settings')");
    await waitFor(".w-dropdown-item:text('Add to Favorites')");
    await waitFor(".w-dropdown-item:text('Voice & Video Settings')");
    await waitFor(".w-dropdown-item:text('View Recordings')");
    await waitFor(".w-dropdown-item:text('Hide Until New Message')");
    await waitFor(".w-dropdown-item:text('Leave Conversation')");
});

test("chat window: clicking chat correspondent avatars in start message opens avatar card", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({
        email: "mario@example.com",
        name: "Mario",
    });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    setupChatHub({ opened: [channelId] });
    await start();
    await contains(".w-mail-ChatWindow .w-mail-Thread");
    await contains(".w-mail-Thread:has(:text('This is the start of your direct chat with Mario'))");
    await click(".w-mail-Thread-avatarChatWindow");
    await contains(".o_avatar_card");
    await contains(".w-mail-avatar-card-name:text('Mario')");
});

test.skip("Fold state of chat window is sync among browser tabs", async () => {
    // AKU TODO: fix crosstab
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "General" });
    const env1 = await start({ asTab: true });
    const env2 = await start({ asTab: true, waitUntilSubscribe: false });
    await click(`${env1.selector} .o_menu_systray i[aria-label='Messages']`);
    await click(`${env1.selector} .w-mail-NotificationItem`);
    await contains(`${env2.selector} .w-mail-ChatWindow-header`);
    await click(`${env1.selector} .w-mail-ChatWindow-header`); // Fold
    await contains(`${env1.selector} .w-mail-Thread`, { count: 0 });
    await contains(`${env2.selector} .w-mail-Thread`, { count: 0 });
    await click(`${env2.selector} .w-mail-ChatBubble`); // Unfold
    await contains(`${env1.selector} .w-mail-ChatWindow .w-mail-Thread`);
    await contains(`${env2.selector} .w-mail-ChatWindow .w-mail-Thread`);
    await click(`${env1.selector} [title*='Close Chat Window']`);
    await contains(`${env1.selector} .w-mail-ChatWindow`, { count: 0 });
    await contains(`${env2.selector} .w-mail-ChatWindow`, { count: 0 });
});

test("chat window: fold", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({});
    await start();
    // Open Thread
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-ChatWindow .w-mail-Thread");
    assertChatHub({ opened: [channelId] });
    // Fold chat window
    await click(".w-mail-ChatWindow-header [title='Fold']");
    await contains(".w-mail-ChatWindow .w-mail-Thread", { count: 0 });
    assertChatHub({ folded: [channelId] });
    // Unfold chat window
    await click(".w-mail-ChatBubble");
    await contains(".w-mail-ChatWindow .w-mail-Thread");
    assertChatHub({ opened: [channelId] });
});

test("chat window: open / close", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({});
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await contains(".w-mail-ChatWindow", { count: 0 });
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-ChatWindow");
    assertChatHub({ opened: [channelId] });
    await click(".w-mail-ChatWindow-header [title*='Close Chat Window']");
    await contains(".w-mail-ChatWindow", { count: 0 });
    assertChatHub({});
    // Reopen chat window
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-ChatWindow");
    assertChatHub({ opened: [channelId] });
});

test("Open chatwindow as a non member", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [],
        name: "General",
        message_needaction: true,
    });
    const messageId = pyEnv["mail.message"].create({
        model: "discuss.channel",
        body: "A needaction message to have it in messaging menu",
        author_id: serverState.wethbotId,
        needaction: true,
        res_id: channelId,
    });
    pyEnv["mail.notification"].create({
        mail_message_id: messageId,
        notification_status: "sent",
        notification_type: "inbox",
        res_partner_id: serverState.partnerId,
    });
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-ChatWindow");
});

test("open chat on very narrow device should work", async () => {
    const pyEnv = await startServer();
    patchUiSize({ width: 200 });
    pyEnv["discuss.channel"].create({});
    await start();
    const store = getService("mail.store");
    expect(store.chatHub.WINDOW).toBeGreaterThan(200, {
        message: "Device is narrower than usual chat window width",
    }); // scenario where this might fail
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-ChatWindow");
});

test("chat window: close on ESCAPE", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({});
    setupChatHub({ opened: [channelId] });
    await start();
    await contains(".w-mail-ChatWindow");
    await focus(".w-mail-Composer-input");
    triggerHotkey("Escape");
    await contains(".w-mail-ChatWindow", { count: 0 });
    assertChatHub({});
});

test("chat window: close on ESCAPE (multi)", async () => {
    const pyEnv = await startServer();
    const channelIds = pyEnv["discuss.channel"].create(
        range(4).map((i) => ({ name: `channel_${i}` }))
    );
    patchUiSize({ width: 1920 });
    setupChatHub({ opened: channelIds.reverse() });
    await start();
    await contains(".w-mail-ChatWindow", { count: 4 }); // expected order: 3, 2, 1, 0
    await contains(".w-mail-ChatWindow-header:eq(0):has(:text('channel_3'))");
    await contains(".w-mail-ChatWindow-header:eq(1):has(:text('channel_2'))");
    await contains(".w-mail-ChatWindow-header:eq(2):has(:text('channel_1'))");
    await contains(".w-mail-ChatWindow-header:eq(3):has(:text('channel_0'))");
    await focus(".w-mail-Composer-input:eq(3)");
    triggerHotkey("Escape");
    await contains(".w-mail-ChatWindow", { count: 3 });
    await contains(".w-mail-ChatWindow-header:eq(0):has(:text('channel_3'))");
    await contains(".w-mail-ChatWindow-header:eq(1):has(:text('channel_2'))");
    await contains(".w-mail-ChatWindow-header:eq(2):has(:text('channel_1'))");
    await contains(".w-mail-ChatWindow:eq(2) .w-mail-Composer.w-focused");
    await focus(".w-mail-Composer-input:eq(0)");
    triggerHotkey("Escape");
    await contains(".w-mail-ChatWindow", { count: 2 });
    await contains(".w-mail-ChatWindow-header:eq(0):has(:text('channel_2'))");
    await contains(".w-mail-ChatWindow-header:eq(1):has(:text('channel_1'))");
    await contains(".w-mail-ChatWindow:eq(0) .w-mail-Composer.w-focused");
    triggerHotkey("Escape");
    await contains(".w-mail-ChatWindow", { count: 1 });
    await contains(".w-mail-ChatWindow-header:eq(0):has(:text('channel_1'))");
    triggerHotkey("Escape");
    await contains(".w-mail-ChatWindow", { count: 0 });
    assertChatHub({});
});

test("Close composer suggestions in chat window with ESCAPE does not also close the chat window", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({
        email: "testpartner@weth.com.br",
        name: "TestPartner",
    });
    pyEnv["res.users"].create({ partner_id: partnerId });
    const channelId = pyEnv["discuss.channel"].create({
        name: "general",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    setupChatHub({ opened: [channelId] });
    await start();
    await insertText(".w-mail-Composer-input", "@");
    triggerHotkey("Escape");
    await contains(".w-mail-ChatWindow");
});

test("Close emoji picker in chat window with ESCAPE does not also close the chat window", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    setupChatHub({ opened: [channelId] });
    await start();
    await click("button[title='Add Emojis']");
    triggerHotkey("Escape");
    await contains(".w-EmojiPicker", { count: 0 });
    await contains(".w-mail-ChatWindow");
});

test.tags("focus required");
test("Closing seen-by dialog on ESCAPE should not close the chat window", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo User" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "chat",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    const messageId = pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "Hello",
        model: "discuss.channel",
        res_id: channelId,
    });
    const [memberId] = pyEnv["discuss.channel.member"].search([
        ["channel_id", "=", channelId],
        ["partner_id", "=", partnerId],
    ]);
    pyEnv["discuss.channel.member"].write([memberId], {
        seen_message_id: messageId,
    });
    setupChatHub({ opened: [channelId] });
    await start();
    await contains(".w-mail-ChatWindow");
    await click(".w-mail-MessageSeenIndicator");
    await contains(".w-mail-MessageSeenIndicatorDialog :focus");
    triggerHotkey("Escape");
    await contains(".w-mail-MessageSeenIndicatorDialog", { count: 0 });
    await contains(".w-mail-ChatWindow");
});

test("Close active thread action in chatwindow on ESCAPE", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    setupChatHub({ opened: [channelId] });
    await start();
    await contains(".w-mail-ChatWindow");
    // dropdown requires an extra delay before click (because handler is registered in useEffect)
    await contains(".w-mail-ChatWindow-moreActions:text('General')");
    await click(".w-mail-ChatWindow-moreActions:text('General')");
    await click(".w-dropdown-item:text('Invite People')");
    await contains(".w-discuss-ChannelInvitation");
    triggerHotkey("Escape");
    await contains(".w-discuss-ChannelInvitation", { count: 0 });
    await contains(".w-mail-ChatWindow");
});

test("ESC cancels thread rename", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    setupChatHub({ opened: [channelId] });
    await start();
    // dropdown requires an extra delay before click (because handler is registered in useEffect)
    await contains(".w-mail-ChatWindow-moreActions:text('General')");
    await click(".w-mail-ChatWindow-moreActions:text('General')");
    await click(".w-dropdown-item:text('Rename Thread')");
    await contains(".w-mail-AutoresizeInput.w-focused[title='General']");
    await insertText(".w-mail-AutoresizeInput", "New", { replace: true });
    triggerHotkey("Escape");
    await contains(".w-mail-AutoresizeInput.w-focused", { count: 0 });
    await contains(".w-mail-ChatWindow-moreActions:text('General')");
});

test.tags("focus required");
test("open 2 different chat windows: enough screen width", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create([{ name: "Channel_1" }, { name: "Channel_2" }]);
    patchUiSize({ width: 1920 });
    await start();
    const store = getService("mail.store");
    expect(
        store.chatHub.WINDOW_GAP * 2 + store.chatHub.WINDOW * 2 + store.chatHub.WINDOW_INBETWEEN
    ).toBeLessThan(1920, {
        message: "should have enough space to open 2 chat windows simultaneously",
    });
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem-name:text('Channel_1')");
    await contains(".w-mail-ChatWindow:has(:text('Channel_1'))", {
        contains: [".w-mail-Composer-input:focus"],
    });
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem-name:text('Channel_2')");
    await contains(".w-mail-ChatWindow", { count: 2 });
    await contains(".w-mail-ChatWindow:has(:text('Channel_1'))");
    await contains(".w-mail-ChatWindow:has(:text('Channel_2'))", {
        contains: [".w-mail-Composer-input:focus"],
    });
});

test.tags("focus required");
test("focus next visible chat window when closing current chat window with ESCAPE", async () => {
    const pyEnv = await startServer();
    const channelIds = pyEnv["discuss.channel"].create([{ name: "General" }, { name: "MyTeam" }]);
    patchUiSize({ width: 1920 });
    setupChatHub({ opened: channelIds });
    await start();
    const store = getService("mail.store");
    expect(
        store.chatHub.WINDOW_GAP * 2 + store.chatHub.WINDOW * 2 + store.chatHub.WINDOW_INBETWEEN
    ).toBeLessThan(1920, {
        message: "should have enough space to open 2 chat windows simultaneously",
    });
    await contains(".w-mail-ChatWindow .w-mail-Composer-input", { count: 2 });
    await focus(".w-mail-Composer-input", {
        parent: [".w-mail-ChatWindow:has(:text('MyTeam'))"],
    });
    triggerHotkey("Escape");
    await contains(".w-mail-ChatWindow");
    await contains(".w-mail-ChatWindow:has(:text('General'))", {
        contains: [".w-mail-Composer-input:focus"],
    });
});

test.tags("focus required");
test("chat window: switch on TAB", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create([{ name: "channel1" }, { name: "channel2" }]);
    patchUiSize({ width: 1920 });
    await start();
    const store = getService("mail.store");
    expect(
        store.chatHub.WINDOW_GAP * 2 + store.chatHub.WINDOW * 2 + store.chatHub.WINDOW_INBETWEEN
    ).toBeLessThan(1920, {
        message: "should have enough space to open 2 chat windows simultaneously",
    });
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem-name:text('channel1')");
    await contains(".w-mail-ChatWindow", { count: 1 });
    await contains(".w-mail-ChatWindow:has(:text('channel1'))", {
        contains: [".w-mail-Composer-input:focus"],
    });
    triggerHotkey("Tab");
    await contains(".w-mail-ChatWindow:has(:text('channel1'))", {
        contains: [".w-mail-Composer-input:focus"],
    });
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem-name:text('channel2')");
    await contains(".w-mail-ChatWindow", { count: 2 });
    await contains(".w-mail-ChatWindow:has(:text('channel2'))", {
        contains: [".w-mail-Composer-input:focus"],
    });
    triggerHotkey("Tab");
    await contains(".w-mail-ChatWindow:has(:text('channel1'))", {
        contains: [".w-mail-Composer-input:focus"],
    });
});

test.tags("focus required");
test("chat window: TAB cycle with 3 open chat windows", async () => {
    const pyEnv = await startServer();
    const channelIds = pyEnv["discuss.channel"].create([
        { name: "General" },
        { name: "MyTeam" },
        { name: "MyProject" },
    ]);
    patchUiSize({ width: 1920 });
    setupChatHub({ opened: channelIds.reverse() });
    await start();
    const store = getService("mail.store");
    expect(
        store.chatHub.WINDOW_GAP * 3 + store.chatHub.WINDOW * 3 + store.chatHub.WINDOW_INBETWEEN * 2
    ).toBeLessThan(1920, {
        message: "should have enough space to open 3 chat windows simultaneously",
    });
    // FIXME: assumes ordering: MyProject, MyTeam, General
    await contains(".w-mail-ChatWindow .w-mail-Composer-input", { count: 3 });
    await focus(".w-mail-Composer-input", {
        parent: [".w-mail-ChatWindow:has(:text('MyProject'))"],
    });
    triggerHotkey("Tab");
    await contains(".w-mail-ChatWindow:has(:text('MyTeam'))", {
        contains: [".w-mail-Composer-input:focus"],
    });
    triggerHotkey("Tab");
    await contains(".w-mail-ChatWindow:has(:text('General'))", {
        contains: [".w-mail-Composer-input:focus"],
    });
    triggerHotkey("Tab");
    await contains(".w-mail-ChatWindow:has(:text('MyProject'))", {
        contains: [".w-mail-Composer-input:focus"],
    });
});

test("chat window should open when receiving a new DM", async () => {
    mockDate("2023-01-03 12:00:00"); // so that it's after last interest (mock server is in 2019 by default!)
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "DemoUser" });
    const userId = pyEnv["res.users"].create({ partner_id: partnerId, im_status: "online" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({
                unpin_dt: "2021-01-01 12:00:00",
                last_interest_dt: "2021-01-01 10:00:00",
                partner_id: serverState.partnerId,
            }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    listenStoreFetch("init_messaging");
    await start();
    await waitStoreFetch("init_messaging");
    await contains(".w-mail-ChatHub");
    withUser(userId, () =>
        rpc("/mail/message/post", {
            post_data: {
                body: "Hi, are you here?",
                message_type: "comment",
                subtype_xmlid: "mail.mt_comment",
            },
            thread_id: channelId,
            thread_model: "discuss.channel",
        })
    );
    await contains(".w-mail-ChatBubble");
    await contains(".w-mail-ChatBubble-counter:text('1')");
    await contains(".w-mail-ChatBubble .w-mail-ImStatus[title='User is online']");
    await assertChatBubbleAndWindowImStatus("DemoUser", 1);
});

test("chat window should not open when receiving a new DM from wethbot", async () => {
    mockDate("2023-01-03 12:00:00"); // so that it's after last interest (mock server is in 2019 by default!)
    const pyEnv = await startServer();
    const userId = pyEnv["res.users"].create({ partner_id: serverState.wethbotId });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({
                unpin_dt: "2021-01-01 12:00:00",
                last_interest_dt: "2021-01-01 10:00:00",
                partner_id: serverState.partnerId,
            }),
            Command.create({ partner_id: serverState.wethbotId }),
        ],
        channel_type: "chat",
    });
    await start();
    await contains(".w-mail-ChatHub");
    withUser(userId, () =>
        rpc("/mail/message/post", {
            post_data: { body: "Hello, I'm new", message_type: "comment" },
            thread_id: channelId,
            thread_model: "discuss.channel",
        })
    );
    await contains(".w-mail-ChatWindow", { count: 0 });
});

test("chat window should scroll to the newly posted message just after posting it", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({});
    for (let i = 0; i < 10; i++) {
        pyEnv["mail.message"].create({
            body: "not empty",
            model: "discuss.channel",
            res_id: channelId,
        });
    }
    setupChatHub({ opened: [channelId] });
    await start();
    await contains(".w-mail-Message", { count: 10 });
    await insertText(".w-mail-Composer-input", "WOLOLO");
    triggerHotkey("Enter");
    await contains(".w-mail-Message", { count: 11 });
    await contains(".w-mail-Thread", { scroll: "bottom" });
});

test("chat window should remain folded when new message is received", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    const userId = pyEnv["res.users"].create({
        name: "Foreigner user",
        partner_id: partnerId,
    });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    setupChatHub({ folded: [channelId] });
    await start();
    await contains(".w-mail-ChatBubble");
    await contains(".w-mail-ChatBubble-counter", { count: 0 });
    withUser(userId, () =>
        rpc("/mail/message/post", {
            post_data: { body: "New Message", message_type: "comment" },
            thread_id: channelId,
            thread_model: "discuss.channel",
        })
    );
    await contains(".w-mail-ChatBubble-counter:text('1')");
    await contains(".w-mail-ChatBubble");
});

test("chat window: composer state conservation on toggle discuss", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({});
    const textFile1 = new File(
        ["hello, world"],
        "text state conversation on toggle home menu.txt",
        { type: "text/plain" }
    );
    const textFile2 = new File(
        ["hello, xdu is da best man"],
        "text2 state conversation on toggle home menu.txt",
        { type: "text/plain" }
    );
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    // Set content of the composer of the chat window
    await insertText(".w-mail-Composer-input", "XDU for the win !");
    await contains(".w-mail-Composer-footer .w-mail-AttachmentList .w-mail-AttachmentContainer", {
        count: 0,
    });
    // Set attachments of the composer
    await inputFiles(".w-mail-Composer .o_input_file", [textFile1, textFile2]);
    await contains(".w-mail-AttachmentContainer:not(.w-isUploading)", { count: 2 });
    await openDiscuss();
    await contains(".w-mail-ChatWindow", { count: 0 });
    await openFormView("discuss.channel", channelId);
    await contains(
        ".w-mail-Composer-footer .w-mail-AttachmentList .w-mail-AttachmentContainer:not(.w-isUploading)",
        { count: 2 }
    );
    await contains(".w-mail-Composer-input", { value: "XDU for the win !" });
});

test("don't show chat hub options when discuss is open", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({});
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-ChatWindow");
    await contains(".w-mail-ChatHub [title='Chat Options']");
    await openDiscuss();
    await contains(".w-mail-ChatWindow", { count: 0 });
    await contains(".w-mail-ChatHub [title='Chat Options']", { count: 0 });
});

test("chat window: scroll conservation on toggle discuss", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({});
    for (let i = 0; i < 100; i++) {
        pyEnv["mail.message"].create({
            body: "not empty",
            model: "discuss.channel",
            res_id: channelId,
        });
    }
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-Message", { count: 30 });
    await contains(".w-mail-ChatWindow .w-mail-Thread", { scroll: 0 });
    await tick(); // wait for the scroll to first unread to complete
    await scroll(".w-mail-ChatWindow .w-mail-Thread", 142);
    await openDiscuss();
    await contains(".w-mail-ChatWindow", { count: 0 });
    await openListView("discuss.channel", { res_id: channelId });
    await contains(".w-mail-Message", { count: 30 });
    await contains(".w-mail-ChatWindow .w-mail-Thread", { scroll: 142 });
});

test("chat window with a thread: keep scroll position in message list on folded", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({});
    for (let i = 0; i < 100; i++) {
        pyEnv["mail.message"].create({
            body: "not empty",
            model: "discuss.channel",
            res_id: channelId,
        });
    }
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-Message", { count: 30 });
    await contains(".w-mail-ChatWindow .w-mail-Thread", { scroll: 0 });
    await tick(); // wait for the scroll to first unread to complete
    await scroll(".w-mail-ChatWindow .w-mail-Thread", 142);
    // fold chat window
    await click(".w-mail-ChatWindow-header [title='Fold']");
    await contains(".w-mail-Message", { count: 0 });
    await contains(".w-mail-ChatWindow .w-mail-Thread", { count: 0 });
    // unfold chat window
    await click(".w-mail-ChatBubble");
    await contains(".w-mail-Message", { count: 30 });
    await contains(".w-mail-ChatWindow .w-mail-Thread", { scroll: 142 });
});

test("chat window with a thread: keep scroll position in message list on toggle discuss when folded", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({});
    for (let i = 0; i < 100; i++) {
        pyEnv["mail.message"].create({
            body: "not empty",
            model: "discuss.channel",
            res_id: channelId,
        });
    }
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-Message", { count: 30 });
    await contains(".w-mail-ChatWindow .w-mail-Thread", { scroll: 0 });
    await tick(); // wait for the scroll to first unread to complete
    await scroll(".w-mail-ChatWindow .w-mail-Thread", 142);
    // fold chat window
    await click(".w-mail-ChatWindow-header [title='Fold']");
    await openDiscuss();
    await contains(".w-mail-ChatWindow", { count: 0 });
    await openListView("discuss.channel", { res_id: channelId });
    // unfold chat window
    await click(".w-mail-ChatBubble");
    await contains(".w-mail-ChatWindow .w-mail-Message", { count: 30 });
    await contains(".w-mail-ChatWindow .w-mail-Thread", { scroll: 142 });
});

test("folded chat window should hide member-list and settings buttons", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({});
    await start();
    // Open Thread
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    // dropdown requires an extra delay before click (because handler is registered in useEffect)
    await contains("[title='Open Actions Menu']");
    await click("[title='Open Actions Menu']");
    await contains(".w-dropdown-item:text('Members')");
    await contains(".w-dropdown-item:text('Voice & Video Settings')");
    await click(".w-mail-ChatWindow-header"); // click away to close the more menu
    await contains(".w-dropdown-item:text('Members')", { count: 0 });
    // Fold chat window
    await click(".w-mail-ChatWindow-header [title='Fold']");
    await contains("[title='Open Actions Menu']", { count: 0 });
    await contains(".w-dropdown-item:text('Members')", { count: 0 });
    await contains(".w-dropdown-item:text('Voice & Video Settings')", { count: 0 });
    // Unfold chat window
    await click(".w-mail-ChatBubble");
    // dropdown requires an extra delay before click (because handler is registered in useEffect)
    await contains("[title='Open Actions Menu']");
    await click("[title='Open Actions Menu']");
    await contains(".w-dropdown-item:text('Members')");
    await contains(".w-dropdown-item:text('Voice & Video Settings')");
});

test("chat window: fold (mobile)", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({});
    patchUiSize({ size: SIZES.SM });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-ChatWindow");
    await click(".w-mail-ChatWindow-header [title='Fold']");
    await contains(".w-mail-ChatWindow", { count: 0 });
    await contains(".w-mail-ChatBubble", { count: 0 });
    await openListView("discuss.channel", { res_id: channelId });
    await contains(".w-mail-ChatBubble");
    assertChatHub({ folded: [channelId] });
});

test("Synced chat windows should open at page load on mobile", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({});
    patchUiSize({ size: SIZES.SM });
    setupChatHub({ opened: [channelId] });
    await start();
    await contains(".w-mail-ChatHub");
    await contains(".w-mail-ChatWindow");
});

test("Should not auto-open direct chat window without self", async () => {
    // Chat hub state is saved locally on device. If logging out then loggin in with another user,
    // this shouldn't open direct chat from previous user that the new user not have access.
    // Normally this is prevented with being unable to fetch the channel, but admin can still fetch.
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    const channelIds = pyEnv["discuss.channel"].create([
        {
            channel_member_ids: [
                Command.create({ partner_id: serverState.partnerId }),
                Command.create({ partner_id: partnerId }),
            ],
            channel_type: "chat",
        },
        {
            channel_member_ids: [
                Command.create({ partner_id: serverState.wethbotId }),
                Command.create({ partner_id: partnerId }),
            ],
            channel_type: "chat",
        },
    ]);
    setupChatHub({ opened: channelIds }); // simulate having both conversations open when logged in as "Demo User"
    await start();
    await contains(".w-mail-ChatHub");
    await contains(".w-mail-ChatWindow");
    await contains(".w-mail-ChatWindow-displayName:text(Demo)");
});

test("chat window of channels should not have 'Open in Discuss' (mobile)", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    patchUiSize({ size: SIZES.SM });
    await start();
    await openDiscuss(channelId);
    // dropdown requires an extra delay before click (because handler is registered in useEffect)
    await contains("[title='Open Actions Menu']");
    await click("[title='Open Actions Menu']");
    await contains(".w-dropdown-item:text('Open in Discuss')", { count: 0 });
});

test("Open chat window of new inviter", async () => {
    const pyEnv = await startServer();
    await start();
    const partnerId = pyEnv["res.partner"].create({ name: "Newbie" });
    pyEnv["res.users"].create({ partner_id: partnerId });
    // simulate receiving notification of new connection of inviting user
    const [partner] = pyEnv["res.partner"].read(serverState.partnerId);
    pyEnv["bus.bus"]._sendone(partner, "res.users/connection", {
        username: "Newbie",
        partnerId,
    });
    await contains(".w-mail-ChatWindow-displayName:text('Newbie')");
    await contains(
        ".o_notification:text('Newbie just connected for the first time. Wish them luck!')"
    );
});

test.tags("focus required");
test("keyboard navigation ArrowUp/ArrowDown on message action dropdown in chat window", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "not empty",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-ChatWindow .w-mail-Composer-input:focus");
    await webContains(".w-mail-Message").hover();
    await webContains(".w-mail-Message [title='Expand']").click();
    await contains(".w-mail-Message-moreMenu.dropdown-menu");
    triggerHotkey("ArrowDown");
    await contains(".w-mail-Message-moreMenu .dropdown-item:eq(0).focus");
    triggerHotkey("ArrowDown");
    await contains(".w-mail-Message-moreMenu .dropdown-item:eq(1).focus");
});

test("Close dropdown in chat window with ESCAPE does not also close the chat window", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "not empty",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await webContains(".w-mail-Message").hover();
    await webContains(".w-mail-Message [title='Expand']").click();
    await contains(".w-mail-Message-moreMenu.dropdown-menu");
    triggerHotkey("Escape");
    await contains(".w-mail-Message-moreMenu.dropdown-menu", { count: 0 });
    await contains(".w-mail-ChatWindow");
});

test("mark as read when opening chat window", async () => {
    const pyEnv = await startServer();
    const bobPartnerId = pyEnv["res.partner"].create({ name: "bob" });
    const bobUserId = pyEnv["res.users"].create({ name: "bob", partner_id: bobPartnerId });
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "chat",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: bobPartnerId }),
        ],
    });
    listenStoreFetch("/discuss/channel/messages");
    await start();
    await openMessagingMenu();
    await click(".w-mail-NotificationItem-name:text('bob')");
    await waitStoreFetch("/discuss/channel/messages");
    await contains(".w-mail-ChatWindow .w-mail-ChatWindow-header:text('bob')");
    // message list fully loaded
    await contains(
        ".w-mail-ChatWindow .w-mail-Thread-empty:has(:text('This is the start of your direct chat with bob'))"
    );
    // composer is focused by default, we remove that focus
    await contains(".w-mail-Composer-input:focus");
    document.querySelector(".w-mail-Composer-input").blur();
    await contains(".w-mail-Composer-input:not(:focus");
    await withUser(bobUserId, () =>
        rpc("/mail/message/post", {
            post_data: {
                body: "Hello, how are you?",
                message_type: "comment",
                subtype_xmlid: "mail.mt_comment",
            },
            thread_id: channelId,
            thread_model: "discuss.channel",
        })
    );
    await contains(".w-mail-ChatWindow-counter:text('1')");
    await click(".w-mail-ChatWindow-header [title*='Close Chat Window']");
    await contains(".w-mail-ChatWindow", { count: 0 });
    await openMessagingMenu();
    await click(".w-mail-NotificationItem-name:text('bob')");
    await contains(".w-mail-ChatWindow .w-mail-ChatWindow-header:text('bob')");
    await contains(".w-mail-ChatWindow-counter", { count: 0 });
});

test("Notification settings rendering in chatwindow", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "general", channel_type: "channel" });
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem-name:text('general')");
    await contains(".w-mail-ChatWindow", { count: 1 });
    // dropdown requires an extra delay before click (because handler is registered in useEffect)
    await contains("[title='Open Actions Menu']");
    await click("[title='Open Actions Menu']");
    await click(".w-dropdown-item:text('Notification Settings')");
    await contains("button:has(:text('All Messages'))");
    await contains("button:has(:text('Mentions Only'))", { count: 2 }); // the extra is in the Use Default as subtitle
    await contains("button:has(:text('Nothing'))");
    // dropdown requires an extra delay before click (because handler is registered in useEffect)
    await contains("button:has(:text('Mute Conversation'))");
    await hover("button:has(:text('Mute Conversation'))");
    await contains(".w-dropdown-item:text('For 15 minutes')");
    await contains(".w-dropdown-item:text('For 1 hour')");
    await contains(".w-dropdown-item:text('For 3 hours')");
    await contains(".w-dropdown-item:text('For 8 hours')");
    await contains(".w-dropdown-item:text('For 24 hours')");
    await contains(".w-dropdown-item:text('Until I turn it back on')");
});

test("open channel in chat window from push notification", async () => {
    const pyEnv = await startServer();
    const [channelId, salesId] = pyEnv["discuss.channel"].create([
        { name: "General" },
        { name: "Sales" },
    ]);
    setupChatHub({ opened: [salesId] });
    await start();
    await contains(".w-mail-ChatWindow-header:text('Sales')");
    await contains(".w-mail-ChatWindow-header:text('General')", { count: 0 });
    navigator.serviceWorker.dispatchEvent(
        new MessageEvent("message", {
            data: { action: "OPEN_CHANNEL", data: { id: channelId } },
        })
    );
    await contains(".w-mail-ChatWindow-header:text('General')");
});

test("Chat window should be closed when leaving the channel", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "general" });
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-ChatWindow-displayName:text('general')");
    await click("[title='Open Actions Menu']");
    await click(".w-dropdown-item:text('Leave Conversation')");
    await click(".o_dialog button:text('Leave Conversation')");
    await contains(".w-mail-ChatWindow-displayName:text('general')", { count: 0 });
});

test("Chat window should be closed when hiding a chat", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    pyEnv["res.users"].create({ partner_id: partnerId });
    pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    await start();
    await openMessagingMenu();
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-ChatWindow-displayName:text('Demo')");
    await click("[title='Open Actions Menu']");
    await click(".w-dropdown-item:text('Hide Until New Message')");
    await contains(".w-mail-ChatWindow-displayName:text('Demo')", { count: 0 });
});

test.tags("focus required");
test("getting focus of chat window through tab key should jump to new message separator", async () => {
    const pyEnv = await startServer();
    const channel_ids = pyEnv["discuss.channel"].create([
        {
            name: "important channel",
            channel_member_ids: [
                Command.create({
                    partner_id: serverState.partnerId,
                    new_message_separator: 21,
                }),
            ],
        },
        { name: "other channel" },
    ]);
    for (let i = 0; i < 40; i++) {
        pyEnv["mail.message"].create({
            body: `message_${i}`,
            model: "discuss.channel",
            res_id: channel_ids[0],
        });
    }
    patchUiSize({ width: 1920 });
    setupChatHub({ opened: channel_ids });
    await start();
    await contains(".w-mail-ChatWindow", { count: 2 });
    await contains(".w-mail-ChatWindow:eq(0) .w-mail-ChatWindow-header:text('important channel')");
    await contains(".w-mail-ChatWindow:eq(1) .w-mail-ChatWindow-header:text('other channel')");
    await contains(".w-mail-ChatWindow:eq(0) .w-mail-Message", { count: 40 });
    await scroll(".w-mail-ChatWindow:eq(0) .w-mail-Thread", 0);
    await contains(".w-mail-ChatWindow:eq(0) .w-mail-Thread", { scroll: 0 });
    await focus(".w-mail-Composer-input:eq(1)");
    await contains(".w-mail-ChatWindow:eq(1) .w-mail-Composer.w-focused");
    triggerHotkey("Tab");
    await contains(".w-mail-ChatWindow:eq(0) .w-mail-Composer.w-focused");
    await isInViewportOf(
        ".w-mail-Message:contains(message_20)",
        ".w-mail-ChatWindow:eq(0) .w-mail-Thread"
    );
});

test("Ctrl+k opens the @ command palette", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create([
        {
            name: "General",
            channel_member_ids: [Command.create({ partner_id: serverState.partnerId })],
        },
    ]);
    setupChatHub({ opened: channelId });
    await start();
    await focus(".w-mail-ChatWindow:has(.w-mail-ChatWindow-displayName:text('General'))");
    triggerHotkey("control+k");
    await contains(".o_command_palette_search:text('@')");
});

test("Do not squash logged notes", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["discuss.channel"].create({ name: "test channel" });
    const messageId = pyEnv["mail.message"].create([
        {
            model: "discuss.channel",
            body: "Test Message",
            author_id: partnerId,
            needaction: true,
            res_id: partnerId,
        },
        {
            model: "discuss.channel",
            body: "Message",
            author_id: serverState.partnerId,
            needaction: true,
            res_id: partnerId,
        },
        {
            model: "discuss.channel",
            body: "Message Squashed",
            author_id: serverState.partnerId,
            needaction: true,
            res_id: partnerId,
        },
        {
            model: "discuss.channel",
            body: "Hello",
            author_id: serverState.partnerId,
            needaction: true,
            res_id: partnerId,
            subtype_id: pyEnv["mail.message.subtype"].search([
                ["subtype_xmlid", "=", "mail.mt_note"],
            ])[0],
        },
        {
            model: "discuss.channel",
            body: "World!",
            author_id: serverState.partnerId,
            needaction: true,
            res_id: partnerId,
            subtype_id: pyEnv["mail.message.subtype"].search([
                ["subtype_xmlid", "=", "mail.mt_note"],
            ])[0],
        },
    ]);
    pyEnv["mail.notification"].create({
        mail_message_id: messageId[0],
        notification_status: "sent",
        notification_type: "inbox",
        res_partner_id: serverState.partnerId,
    });
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-Message.w-squashed:text('Message Squashed')");
    await contains(".w-mail-Message:not(.w-squashed) .w-mail-Message-content:has(:text('Hello'))");
    await contains(".w-mail-Message:not(.w-squashed) .w-mail-Message-content:has(:text('World!'))");
});

test("Readonly chat window as non-admin shows bottom banner", async () => {
    const pyEnv = await startServer();
    const memberPartnerId = pyEnv["res.partner"].create({ name: "Member User" });
    pyEnv["res.users"].create({
        partner_id: memberPartnerId,
        login: "test_member",
        password: "test_member",
    });
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
        is_readonly: true,
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId, channel_role: "owner" }),
            Command.create({ partner_id: memberPartnerId }),
        ],
    });
    setupChatHub({ opened: [channelId] });
    await start({
        authenticateAs: { login: "test_member", password: "test_member" },
    });
    await contains(".w-mail-ChatWindow span:text('This channel is read-only.')");
    await contains(".w-mail-ChatWindow .w-mail-Composer-input", { count: 0 });
});

test("Readonly chat window as admin shows composer", async () => {
    const pyEnv = await startServer();
    const adminPartnerId = pyEnv["res.partner"].create({ name: "Admin User" });
    pyEnv["res.users"].create({ partner_id: adminPartnerId });
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
        is_readonly: true,
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId, channel_role: "owner" }),
            Command.create({ partner_id: adminPartnerId }),
        ],
    });
    setupChatHub({ opened: [channelId] });
    await start();
    await contains(".w-mail-ChatWindow .w-mail-Composer-input");
    await contains(".w-mail-ChatWindow span:text('This channel is read-only.')", { count: 0 });
});

test("preserve link formatting in chat bubble message preview", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        model: "discuss.channel",
        body: `<a href="https://weth.com.br/">https://weth.com.br</a>`,
        author_id: serverState.partnerId,
        res_id: channelId,
    });
    setupChatHub({ folded: [channelId] });
    await start();
    await hover(".w-mail-ChatBubble[name='General']");
    await contains(`.w-mail-ChatBubble-preview a[href="https://weth.com.br/"]`);
    expect(".w-mail-ChatBubble-preview a").toHaveStyle({ pointerEvents: "none" }); // links in preview should not be clickable
});

test("decorate emojis in chat bubble message preview", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        model: "discuss.channel",
        body: "Hello 😇",
        author_id: serverState.partnerId,
        res_id: channelId,
    });
    setupChatHub({ folded: [channelId] });
    await start();
    await hover(".w-mail-ChatBubble[name='General']");
    await contains(`.w-mail-ChatBubble-preview .w-mail-emoji[title=":innocent: :halo:"]`);
});
