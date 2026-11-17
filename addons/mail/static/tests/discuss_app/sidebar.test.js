import {
    click,
    contains,
    defineMailModels,
    insertText,
    listenStoreFetch,
    openDiscuss,
    openFormView,
    openMessagingMenu,
    setupChatHub,
    start,
    startServer,
    triggerHotkey,
    waitStoreFetch,
    MENU_ACTIVE_IDS,
} from "@mail/../tests/mail_test_helpers";
import { describe, expect, test, waitFor } from "@weth/hoot";
import { animationFrame, press, rightClick } from "@weth/hoot-dom";
import { mockDate } from "@weth/hoot-mock";
import {
    Command,
    getService,
    mockService,
    onRpc,
    serverState,
} from "@web/../tests/web_test_helpers";

import { deserializeDateTime } from "@web/core/l10n/dates";
import { rpc } from "@web/core/network/rpc";
import { getOrigin } from "@web/core/utils/urls";
import { range } from "@web/core/utils/numbers";

describe.current.tags("desktop");
defineMailModels();

test("default thread rendering", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users"].write(serverState.userId, { notification_type: "inbox" });
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    const channelIds = pyEnv["discuss.channel"].create([
        { name: "General", channel_type: "channel" },
        { name: "MyGroup", channel_type: "group" },
        {
            channel_member_ids: [
                Command.create({ partner_id: serverState.partnerId }),
                Command.create({ partner_id: partnerId }),
            ],
            channel_type: "chat",
        },
    ]);
    pyEnv["mail.message"].create({
        body: "Bookmarked message",
        bookmarked_partner_ids: [serverState.partnerId],
        model: "discuss.channel",
        res_id: channelIds[0],
    });
    await start();
    await openDiscuss();
    await contains(".w-mail-MessagingMenu-tab:has(:text('Notifications'))");
    await click(".w-mail-MessagingMenu-tab[data-id='notification']");
    await contains(".w-mail-MessagingMenu-tab.active:has(:text('Notifications'))");
    await contains(".w-mail-MessagingMenuEmpty:has(:text('You\\'re all caught up!'))");
    await click(".w-mail-MessagingMenu-tab[data-id='channel']");
    await click(".w-mail-NotificationItem:has(:text('General'))");
    await contains(
        ".w-mail-MessagingMenuItem:has(.w-mail-NotificationItem.w-active):has(:text('General'))"
    );
    await contains(".w-mail-Thread:has(:text('Welcome to #General!'))");
    await click(".w-mail-MessagingMenu-tab[data-id='chat']");
    await click(".w-mail-NotificationItem:has(:text('MyGroup'))");
    await contains(
        ".w-mail-MessagingMenuItem:has(.w-mail-NotificationItem.w-active):has(:text('MyGroup'))"
    );
    await click(".w-mail-NotificationItem:has(:text('Demo'))");
    await contains(
        ".w-mail-MessagingMenuItem:has(.w-mail-NotificationItem.w-active):has(:text('Demo'))"
    );
    await contains(".w-mail-Thread:has(:text('Demo'))");
});

test("sidebar: can open chat actions", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId, channel_role: "owner" }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    await start();
    await openDiscuss();
    await contains(".w-mail-MessagingMenuItem");
    await contains(".w-mail-MessagingMenuItem:has(:text('Demo'))");
    await contains(".w-mail-MessagingMenuItem img[alt='Thread Image']");
    await click("[title='Chat Actions']");
    await waitFor(".w-dropdown-item:count(8)", { timeout: 3000 });
    await waitFor(".w-mail-ActionList-group:count(4)");
    const group = range(0, 4).map((i) => `.w-mail-ActionList-group:eq(${i})`);
    await waitFor(`${group[0]} .w-dropdown-item:count(2)`);
    await waitFor(`${group[0]} .w-dropdown-item:eq(0):text('Start Video Call')`);
    await waitFor(`${group[0]} .w-dropdown-item:eq(1):text('Start Call')`);
    await waitFor(`${group[1]} .w-dropdown-item:count(2)`);
    await waitFor(`${group[1]} .w-dropdown-item:eq(0):text('Invite People')`);
    await waitFor(`${group[1]} .w-dropdown-item:eq(1):text('Add to Favorites')`);
    await waitFor(`${group[2]} .w-dropdown-item:count(3)`);
    await waitFor(`${group[2]} .w-dropdown-item:eq(0):text('Mute Conversation')`);
    await waitFor(`${group[2]} .w-dropdown-item:eq(1):text('View Recordings')`);
    await waitFor(`${group[2]} .w-dropdown-item:eq(2):text('Advanced Settings')`);
    await waitFor(`${group[3]} .w-dropdown-item:count(1)`);
    await waitFor(`${group[3]} .w-dropdown-item:text('Hide Until New Message')`);
    await contains(".w-mail-MessagingMenuItem .badge", { count: 0 });
    await click(".w-mail-DiscussApp-sidebar");
    await contains(".w-dropdown-item", { count: 0 });
    // Can also right-click to see messaging menu item actions
    await rightClick(".w-mail-MessagingMenuItem");
    await contains(".w-mail-MessagingMenuItem[data-right-clicking]");
    await waitFor(".w-dropdown-item:count(8)");
});

test("sidebar: dispatch recording action", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId, channel_role: "owner" }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    const expectedAction = {
        type: "ir.actions.act_window",
        res_model: "discuss.call.history",
        views: [[false, "form"]],
        res_id: 42,
    };
    onRpc("discuss.channel", "action_view_recordings", ({ args }) => {
        expect(args).toEqual([[channelId]]);
        expect.step("action_view_recordings");
        return expectedAction;
    });
    mockService("action", {
        doAction(action) {
            if (action.res_model !== "discuss.call.history") {
                return super.doAction(...arguments);
            }
            expect(action).toEqual(expectedAction);
            expect.step("doAction");
        },
    });
    await start();
    await openDiscuss();
    await click("[title='Chat Actions']");
    const recordingGroup = ".w-mail-ActionList-group:eq(2)";
    await waitFor(`${recordingGroup} .w-dropdown-item:eq(0):text('Mute Conversation')`);
    await waitFor(`${recordingGroup} .w-dropdown-item:eq(1):text('View Recordings')`);
    await waitFor(`${recordingGroup} .w-dropdown-item:eq(2):text('Advanced Settings')`);
    await click(`${recordingGroup} .w-dropdown-item:eq(1)`);
    await expect.waitForSteps(["action_view_recordings", "doAction"]);
});

test("sidebar: open pinned channel", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem:has(:text('General'))");
    await contains(".w-mail-Composer-input[placeholder='Message #General…']");
    await contains(".w-mail-DiscussContent-threadName", { value: "General" });
});

test("sidebar: open channel and leave it", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    onRpc("discuss.channel", "action_unfollow", ({ args }) => {
        expect.step("action_unfollow");
        expect(args[0]).toBe(channelId);
    });
    setupChatHub({ opened: [channelId] });
    await start();
    await openDiscuss(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem:has(:text('General'))");
    await contains(".w-mail-DiscussContent-threadName", { value: "General" });
    await expect.waitForSteps([]);
    await click("[title='Channel Actions']");
    await click(".w-dropdown-item:contains('Leave Conversation')");
    await click(".o_dialog button:text('Leave Conversation')");
    await contains(".w-mail-MessagingMenuItem:has(:text('General'))", { count: 0 });
    await contains(".w-mail-DiscussContent:text(No conversation selected.)");
    await expect.waitForSteps(["action_unfollow"]);
});

test.tags("focus required");
test("chat - channel should count unread message", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    pyEnv["res.users"].create({ partner_id: partnerId, im_status: "offline" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ message_unread_counter: 1, partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    pyEnv["mail.message"].create({
        author_id: partnerId,
        body: "<p>Test</p>",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss();
    await contains(".w-mail-MessagingMenu-tab:has(:text('Chats')) .w-discuss-badge:text(1)");
    await contains(".w-mail-NotificationItem:has(:text('Demo')) .w-discuss-badge:text(1)");
    await click(".w-mail-NotificationItem:has(:text('Demo'))");
    await contains(".w-mail-Message");
    await contains(".w-discuss-badge", { count: 0 });
});

test.tags("focus required");
test("mark channel as seen on last message visible", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ message_unread_counter: 1, partner_id: serverState.partnerId }),
        ],
    });
    pyEnv["mail.message"].create({
        body: "not empty",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem.w-interest:has(:text(test))");
    await contains(".w-mail-Message");
    await contains(".w-mail-NotificationItem.w-interest:has(:text(test))", { count: 0 });
});

test("sidebar: public channel rendering", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({
        name: "channel1",
        channel_type: "channel",
        group_public_id: false,
    });
    await start();
    await openDiscuss(MENU_ACTIVE_IDS.CHANNEL);
    await contains(".w-mail-MessagingMenuItem:has(:text('channel1'))", {
        contains: ["[data-icon='public']"],
    });
});

test("channel - avatar: should have correct avatar", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        avatar_cache_key: "notaDateCache",
    });
    await start();
    await openDiscuss(MENU_ACTIVE_IDS.CHANNEL);
    await contains(".w-mail-MessagingMenuItem img");
    await contains(
        `img[data-src='${getOrigin()}/web/image/discuss.channel/${channelId}/avatar_128?unique=notaDateCache']`
    );
});

test("channel - avatar: should update avatar url from bus", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        avatar_cache_key: "notaDateCache",
        name: "test",
    });
    await start();
    await openDiscuss(channelId);
    await contains(
        `img[data-src='${getOrigin()}/web/image/discuss.channel/${channelId}/avatar_128?unique=notaDateCache']`,
        { count: 2 }
    );
    await getService("orm").call("discuss.channel", "write", [
        [channelId],
        { image_128: "This field does not matter" },
    ]);
    const result = pyEnv["discuss.channel"].search_read([["id", "=", channelId]]);
    const newCacheKey = result[0]["avatar_cache_key"];
    await contains(
        `img[data-src='${getOrigin()}/web/image/discuss.channel/${channelId}/avatar_128?unique=${newCacheKey}']`,
        { count: 3 }
    );
});

test("chat - avatar: should have correct avatar", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    pyEnv["res.users"].create({ partner_id: partnerId, im_status: "offline" });
    const partner = pyEnv["res.partner"].search_read([["id", "=", partnerId]])[0];
    pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    await start();
    await openDiscuss();
    await contains(".w-mail-MessagingMenuItem img");
    await contains(
        `img[data-src='${getOrigin()}/web/image/res.partner/${partnerId}/avatar_128?unique=${deserializeDateTime(partner.write_date).ts
        }']`
    );
});

test("chat should be sorted by last activity time", async () => {
    const pyEnv = await startServer();
    const [demo_id, yoshi_id] = pyEnv["res.partner"].create([{ name: "Demo" }, { name: "Yoshi" }]);
    pyEnv["res.users"].create([{ partner_id: demo_id }, { partner_id: yoshi_id }]);
    pyEnv["discuss.channel"].create([
        {
            channel_member_ids: [
                Command.create({
                    last_interest_dt: "2000-01-01 10:00:00",
                    partner_id: serverState.partnerId,
                }),
                Command.create({ partner_id: demo_id }),
            ],
            channel_type: "chat",
        },
        {
            channel_member_ids: [
                Command.create({
                    last_interest_dt: "2000-02-01 10:00:00",
                    partner_id: serverState.partnerId,
                }),
                Command.create({ partner_id: yoshi_id }),
            ],
            channel_type: "chat",
        },
    ]);
    await start();
    await openDiscuss();
    await contains(".w-mail-MessagingMenuItem:has(:text('Yoshi'))", {
        before: [".w-mail-MessagingMenuItem:has(:text('Demo'))"],
    });
    await click(".w-mail-NotificationItem:has(:text('Demo'))");
    await insertText(".w-mail-Composer-input[placeholder='Message Demo…']", "Blabla");
    await press("Enter");
    await contains(".w-mail-Message:has(:text('Blabla'))");
    await contains(".w-mail-MessagingMenuItem:has(:text('Demo'))", {
        before: [".w-mail-MessagingMenuItem:has(:text('Yoshi'))"],
    });
});

test("Can unpin chat channel", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    await start();
    await openDiscuss();
    await contains(".w-mail-MessagingMenuItem:has(:text('Mitchell Admin'))");
    await click("[title='Chat Actions']");
    await click(".w-dropdown-item:text('Hide Until New Message')");
    await contains(".w-mail-MessagingMenuItem:has(:text('Mitchell Admin'))", { count: 0 });
});

test("No 'Hide Until New Message' on conversation with self in call", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Partner1" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "chat",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    const [memberId] = pyEnv["discuss.channel.member"].search([
        ["partner_id", "=", partnerId],
        ["channel_id", "=", channelId],
    ]);
    pyEnv["discuss.channel.rtc.session"].create({
        channel_id: channelId,
        channel_member_id: memberId,
    });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Join Call']");
    await contains(".w-discuss-Call.w-selfInCall");
    await click("[title='Chat Actions']");
    await contains(".w-dropdown-item:text('Invite People')");
    await contains(".w-dropdown-item:text('Hide Until New Message')", { count: 0 });
    await click("button[title='Disconnect']");
    await contains(".w-discuss-Call.w-selfInCall", { count: 0 });
    await click("[title='Chat Actions']");
    await contains(".w-dropdown-item:text('Hide Until New Message')");
});

test("opening a hidden channel re-pins it", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create([
        {
            channel_type: "channel",
            name: "InitialChannel",
        },
        {
            channel_type: "channel",
            channel_member_ids: [
                Command.create({
                    partner_id: serverState.partnerId,
                    unpin_dt: "2021-01-01 12:00:00",
                }),
            ],
            name: "General",
        },
    ]);
    await start();
    await openDiscuss(MENU_ACTIVE_IDS.CHANNEL);
    await contains(".w-mail-MessagingMenuItem:has(:text('InitialChannel'))");
    await contains(".w-mail-MessagingMenuItem:has(:text('General'))", { count: 0 });
    await triggerHotkey("control+k");
    await click(".w-mail-DiscussCommand-nameContainer:text('General')");
    await contains(".w-mail-MessagingMenuItem:has(:text('General'))");
});

test("Can leave channel", async () => {
    mockDate("2023-01-03 12:00:00");
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
        channel_type: "channel",
        channel_member_ids: [
            Command.create({
                partner_id: serverState.partnerId,
                last_interest_dt: "2021-01-03 12:00:00",
            }),
        ],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-MessagingMenuItem:has(:text('General'))");
    await click("[title='Channel Actions']");
    await click(".w-dropdown-item:contains('Leave Conversation')");
    await click(".o_dialog button:text('Leave Conversation')");
    await contains(".w-mail-MessagingMenuItem:has(:text('General'))", { count: 0 });
});

test("Leaving channel does not open another conversation", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["discuss.channel"].create({ name: "Sales" });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-DiscussContent-threadName", { value: "General" });
    await contains(
        ".w-mail-MessagingMenuItem:has(.w-mail-NotificationItem.w-active):has(:text('General'))"
    );
    await contains(".w-mail-NotificationItem.w-active");
    await click(".w-mail-MessagingMenuItem:has(:text('General')) [title='Channel Actions']");
    await click(".w-dropdown-item:contains('Leave Conversation')");
    await click(".o_dialog button:text('Leave Conversation')");
    await contains(".w-mail-MessagingMenuItem:has(:text('General'))", { count: 0 });
    await contains(".w-mail-MessagingMenuItem:has(:text('Sales'))");
    await contains(".w-mail-DiscussContent:text(No conversation selected.)");
    await contains(".w-mail-NotificationItem.w-active", { count: 0 });
});

test("Do no channel_info after unpin", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "chat",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    listenStoreFetch("discuss.channel");
    setupChatHub({ opened: [channelId] });
    await start();
    // ensure onRpc is at least set up properly (because then it is asserted negatively)
    await waitStoreFetch("discuss.channel");
    await openDiscuss(channelId);
    await click("[title='Chat Actions']");
    await click(".w-dropdown-item:contains('Hide Until New Message')");
    rpc("/mail/message/post", {
        thread_id: channelId,
        thread_model: "discuss.channel",
        post_data: {
            body: "Hello world",
            message_type: "comment",
        },
    });
    // weak test, no guarantee that we waited long enough for the potential rpc to be done
    await animationFrame();
    await waitStoreFetch();
});

test.tags("focus required");
test("Tab unread counter up to date after mention is marked as seen", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Chuck" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "group",
    });
    const messageId = pyEnv["mail.message"].create({
        author_id: partnerId,
        model: "discuss.channel",
        res_id: channelId,
        body: "@Mitchell Admin",
        needaction: true,
    });
    pyEnv["mail.notification"].create([
        {
            mail_message_id: messageId,
            notification_type: "inbox",
            res_partner_id: serverState.partnerId,
        },
    ]);
    await start();
    await openDiscuss();
    await contains(".w-mail-MessagingMenuItem .w-discuss-badge");
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-MessagingMenuItem .w-discuss-badge", { count: 0 });
});

test("Unpinning channel closes its chat window", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "Sales" });
    await start();
    await openFormView("discuss.channel");
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await contains(".w-mail-ChatWindow-displayName:text('Sales')");
    await openDiscuss(MENU_ACTIVE_IDS.CHANNEL);
    await click("[title='Channel Actions']");
    await click(".w-dropdown-item:contains('Leave Conversation')");
    await openFormView("discuss.channel");
    await contains(".w-mail-ChatWindow-displayName:text('Sales')", { count: 0 });
});

test.tags("focus required");
test("Update channel data via bus notification", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "Sales",
        channel_type: "channel",
        create_uid: serverState.userId,
    });
    const env1 = await start({ asTab: true });
    const env2 = await start({ asTab: true, waitUntilSubscribe: false });
    await openDiscuss(channelId, { target: env1 });
    await openDiscuss(channelId, { target: env2 });
    await contains(`${env1.selector} .w-mail-MessagingMenuItem:has(:text('Sales'))`);
    await insertText(`${env1.selector} .w-mail-DiscussContent-threadName`, "test");
    await triggerHotkey("Enter");
    await contains(`${env2.selector} .w-mail-MessagingMenuItem:has(:text('Salestest'))`);
});

test("Redirect to the thread containing the bookmark and highlight the message", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
    });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        model: "discuss.channel",
        res_id: channelId,
        body: "<p>Hello there!!!</p>",
    });
    await start();
    await openDiscuss(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem:has(:text('General'))");
    await contains(".w-mail-Message");
    await rightClick(".w-mail-Message");
    await click(".w-dropdown-item:contains('Bookmark')");
    await click(".w-mail-MessagingMenu-tab[data-id='bookmark']:has(.badge:text(1))");
    await contains(".w-mail-MessagingMenu-tab.active:has(:text('Bookmarks'))");
    await click(".w-mail-NotificationItem:has(:text('You: Hello there!!!'))");
    await contains(".w-mail-NotificationItem:has(:text('General'))");
    await contains(".w-mail-Message.w-highlighted:has(:text('Hello there!!!'))");
});

test("Sidebar channels show correct notification counter based on settings", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: serverState.userId,
        channel_notifications: "all",
    });
    const partnerId = pyEnv["res.partner"].create({ name: "Chuck" });
    const mentionsChannelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "channel",
        name: "Mentions",
    });
    const regularChannelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "channel",
        name: "Regular",
    });
    const mentionMessageId = pyEnv["mail.message"].create({
        author_id: partnerId,
        model: "discuss.channel",
        res_id: mentionsChannelId,
        body: "@Mitchell Admin",
        needaction: true,
    });
    pyEnv["mail.notification"].create([
        {
            mail_message_id: mentionMessageId,
            notification_type: "inbox",
            res_partner_id: serverState.partnerId,
        },
    ]);
    pyEnv["mail.message"].create([
        {
            author_id: partnerId,
            model: "discuss.channel",
            res_id: mentionsChannelId,
            body: "test",
        },
        {
            author_id: partnerId,
            model: "discuss.channel",
            res_id: regularChannelId,
            body: "test",
        },
    ]);
    await start();
    await openDiscuss(MENU_ACTIVE_IDS.CHANNEL);
    await contains(".w-mail-MessagingMenuItem:has(:text('Mentions')) .badge:text('2')");
    await contains(".w-mail-MessagingMenuItem:has(:text('Regular')) .badge:text('1')");
    rpc("/discuss/settings/custom_notifications", { custom_notifications: false }); // default: @mention only
    await contains(".w-mail-MessagingMenuItem:has(:text('Mentions')) .badge:text('1')");
    await contains(".w-mail-MessagingMenuItem:has(:text('Regular')) .badge.w-empty");
    rpc("/discuss/settings/custom_notifications", { custom_notifications: "no_notif" });
    await contains(".w-mail-MessagingMenuItem:has(:text('Mentions')) .badge.w-empty");
    await contains(".w-mail-MessagingMenuItem:has(:text('Regular')) .badge.w-empty");
});

test("add and remove channel from favorites updates sidebar", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({
        name: "General",
        channel_type: "channel",
    });
    await start();
    await openDiscuss(MENU_ACTIVE_IDS.CHANNEL);
    await click(
        ".w-mail-NotificationItem:has(:text('General')) .w-mail-MessagingMenu-actions button"
    );
    await click(".w-dropdown-item:contains('Add to Favorites')");
    await contains(".w-mail-MessagingMenuItem:has(:text('General')) [data-icon='star']");
    await click(
        ".w-mail-NotificationItem:has(:text('General')) .w-mail-MessagingMenu-actions button"
    );
    await click(".w-dropdown-item:contains('Remove from Favorites')");
    await contains(".w-mail-MessagingMenuItem:has(:text('General')) [data-icon='star']", {
        count: 0,
    });
});

test("Muted group chats show notification counter from mentions-only", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Chuck" });
    const [channelId_1, channelId_2] = pyEnv["discuss.channel"].create([
        {
            channel_member_ids: [
                Command.create({ partner_id: serverState.partnerId }),
                Command.create({ partner_id: partnerId }),
            ],
            channel_type: "group",
            name: "Sales Team",
        },
        {
            channel_member_ids: [
                Command.create({ partner_id: serverState.partnerId }),
                Command.create({ partner_id: partnerId }),
            ],
            channel_type: "group",
            name: "Development Team",
        },
    ]);
    const messageIds = pyEnv["mail.message"].create([
        {
            author_id: partnerId,
            model: "discuss.channel",
            res_id: channelId_2,
            body: "@Mitchell Admin",
            needaction: true,
        },
        {
            author_id: partnerId,
            model: "discuss.channel",
            res_id: channelId_1,
            body: "test",
        },
        {
            author_id: partnerId,
            model: "discuss.channel",
            res_id: channelId_2,
            body: "test",
        },
    ]);
    pyEnv["mail.notification"].create([
        {
            mail_message_id: messageIds[0],
            notification_type: "inbox",
            res_partner_id: serverState.partnerId,
        },
    ]);
    await start();
    await openDiscuss();
    await contains(".w-mail-MessagingMenuItem:has(:text('Sales Team')) .badge:text('1')");
    await contains(".w-mail-MessagingMenuItem:has(:text('Development Team')) .badge:text('2')");
    rpc("/discuss/settings/mute", { minutes: -1, channel_id: channelId_1 });
    rpc("/discuss/settings/mute", { minutes: -1, channel_id: channelId_2 });
    await contains(".w-mail-MessagingMenuItem:has(:text('Sales Team')) .badge", { count: 0 });
    await contains(".w-mail-MessagingMenuItem:has(:text('Development Team')) .badge:text('1')");
});
