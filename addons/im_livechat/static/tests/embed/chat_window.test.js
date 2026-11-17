import { waitUntilSubscribe } from "@bus/../tests/bus_test_helpers";
import {
    defineLivechatModels,
    loadDefaultEmbedConfig,
    postLivechatMessage,
} from "@im_livechat/../tests/livechat_test_helpers";
import { expirableStorage } from "@im_livechat/core/common/expirable_storage";
import {
    assertChatBubbleAndWindowImStatus,
    click,
    contains,
    inputFiles,
    mockGetMedia,
    onRpcBefore,
    setupChatHub,
    start,
    startServer,
    triggerHotkey,
} from "@mail/../tests/mail_test_helpers";
import { Attachment } from "@mail/core/common/attachment_model";
import { describe, expect, mockFetch, test } from "@weth/hoot";
import { Command, patchWithCleanup, serverState, withUser } from "@web/../tests/web_test_helpers";
import { location } from "@web/core/browser/browser";
import { deserializeDateTime } from "@web/core/l10n/dates";
import { rpc } from "@web/core/network/rpc";
import { getOrigin } from "@web/core/utils/urls";
import { session } from "@web/session";

describe.current.tags("desktop");
defineLivechatModels();

test("internal users can upload file to temporary thread", async () => {
    const pyEnv = await startServer();
    await loadDefaultEmbedConfig();
    const [partnerUser] = pyEnv["res.users"].search_read([["id", "=", serverState.partnerId]]);
    await start({ authenticateAs: partnerUser, waitUntilSubscribe: false });
    await click(".w-livechat-LivechatButton");
    const file = new File(["hello, world"], "text.txt", { type: "text/plain" });
    await contains(".w-mail-Composer");
    await click(".w-mail-Composer button[title='More Actions']");
    await contains(".dropdown-item:contains('Attach files')");
    await inputFiles(".w-mail-Composer .o_input_file", [file]);
    await contains(".w-mail-AttachmentContainer:not(.w-isUploading):contains(text.txt)");
    const subscribed = waitUntilSubscribe();
    await triggerHotkey("Enter");
    await subscribed;
    await contains(".w-mail-Message .w-mail-AttachmentContainer:contains(text.txt)");
});

test("The name of the conversation changes based on the agents' names", async () => {
    const pyEnv = await startServer();
    await loadDefaultEmbedConfig();
    pyEnv["res.partner"].write(serverState.partnerId, { user_livechat_username: "MitchellOp" });
    const operatorUserId = serverState.userId;
    await start({ authenticateAs: false, waitUntilSubscribe: false });
    await click(".w-livechat-LivechatButton");
    await contains(".w-mail-ChatWindow-header", { text: "MitchellOp" });
    const subscribed = waitUntilSubscribe();
    await postLivechatMessage("Hello World!");
    await subscribed;
    const [channelId] = pyEnv["discuss.channel"].search([
        ["channel_type", "=", "livechat"],
        [
            "channel_member_ids",
            "in",
            pyEnv["discuss.channel.member"].search([["guest_id", "=", pyEnv.cookie.get("dgid")]]),
        ],
    ]);
    const userId = pyEnv["res.users"].create({
        name: "James",
    });
    pyEnv["res.partner"].create({
        lang: "en_US",
        name: "James",
        user_ids: [userId],
    });
    // Adding a member is reserved to logged-in users: simulate the operator adding the agent,
    // which notifies the visitor through the bus (a guest cannot call add_members themselves).
    await withUser(operatorUserId, () =>
        rpc("/mail/store", {
            fetch_params: [
                ["/discuss/channel/add_members", { channel_id: channelId, user_ids: [userId] }],
            ],
        })
    );
    await contains(".w-mail-ChatWindow-header", { text: "MitchellOp, James" });
});

test("Portal users should not be able to start a call", async () => {
    mockGetMedia();
    const pyEnv = await startServer();
    await loadDefaultEmbedConfig();
    const joelUid = pyEnv["res.users"].create({
        name: "Joel",
        share: true,
        login: "joel",
        password: "joel",
    });
    const joelPid = pyEnv["res.partner"].create({
        name: "Joel",
        user_ids: [joelUid],
    });
    pyEnv["res.partner"].write(serverState.partnerId, { user_livechat_username: "MitchellOp" });
    await start({ authenticateAs: { login: "joel", password: "joel" }, waitUntilSubscribe: false });
    await click(".w-livechat-LivechatButton");
    await contains(".w-mail-ChatWindow-header:text('MitchellOp')");
    const subscribed = waitUntilSubscribe();
    await postLivechatMessage("Hello MitchellOp!");
    await subscribed;
    await contains(".w-mail-Message[data-persistent]:contains('Hello MitchellOp!')");
    await contains(".w-mail-ChatWindow-header .w-mail-ActionList-button", { count: 2 });
    await contains(".w-mail-ChatWindow-header .w-mail-ActionList-button[title='Fold']");
    await contains(".w-mail-ChatWindow-header .w-mail-ActionList-button[title*='Close']");
    await contains(".w-discuss-Call", { count: 0 });
    // simulate operator starts call
    const [channelId] = pyEnv["discuss.channel"].search([
        ["channel_type", "=", "livechat"],
        [
            "channel_member_ids",
            "in",
            pyEnv["discuss.channel.member"].search([["partner_id", "=", joelPid]]),
        ],
    ]);
    await withUser(serverState.userId, () =>
        rpc("/mail/rtc/channel/join_call", { channel_id: channelId }, { silent: true })
    );
    await contains(".w-discuss-Call button", { count: 2 });
    await contains(".w-discuss-Call button[title='Join Video Call']");
    await contains(".w-discuss-Call button[title='Join Call']");
    // still same actions in header
    await contains(".w-mail-ChatWindow-header .w-mail-ActionList-button", { count: 2 });
    await contains(".w-mail-ChatWindow-header .w-mail-ActionList-button[title='Fold']");
    await contains(".w-mail-ChatWindow-header .w-mail-ActionList-button[title*='Close']");
});

test("avatar url contains access token for non-internal users", async () => {
    const pyEnv = await startServer();
    await loadDefaultEmbedConfig();
    pyEnv["res.partner"].write(serverState.partnerId, { user_livechat_username: "MitchellOp" });
    const [partner] = pyEnv["res.partner"].search_read([["id", "=", serverState.partnerId]]);
    await start({ authenticateAs: false, waitUntilSubscribe: false });
    await click(".w-livechat-LivechatButton");
    await contains(
        `.w-mail-ChatWindow-threadAvatar img[data-src="${getOrigin()}/web/image/res.partner/${partner.id
        }/avatar_128?access_token=${partner.id}&unique=${deserializeDateTime(partner.write_date).ts
        }"]`
    );
    await contains(
        `.w-mail-Message-avatar[data-src="${getOrigin()}/web/image/res.partner/${partner.id
        }/avatar_128?access_token=${partner.id}&unique=${deserializeDateTime(partner.write_date).ts
        }"]`
    );
    const subscribed = waitUntilSubscribe();
    await postLivechatMessage("Hello World!");
    await subscribed;
    const guestId = pyEnv.cookie.get("dgid");
    const [guest] = pyEnv["mail.guest"].read(guestId);
    await contains(
        `.w-mail-Message-avatar[data-src="${getOrigin()}/web/image/mail.guest/${guest.id
        }/avatar_128?access_token=${guest.id}&unique=${deserializeDateTime(guest.write_date).ts}"]`
    );
    await contains(
        `.w-mail-ChatWindow-threadAvatar img[data-src="${getOrigin()}/web/image/res.partner/${partner.id
        }/avatar_128?access_token=${partner.id}&unique=${deserializeDateTime(partner.write_date).ts
        }"]`
    );
});

test("can close confirm livechat with keyboard", async () => {
    await startServer();
    await loadDefaultEmbedConfig();
    onRpcBefore((route) => {
        if (route === "/im_livechat/visitor_leave_session") {
            expect.step(route);
        }
    });
    await start({ authenticateAs: false, waitUntilSubscribe: false });
    await click(".w-livechat-LivechatButton");
    await contains(".w-mail-ChatWindow");
    const subscribed = waitUntilSubscribe();
    await postLivechatMessage("Hello");
    await subscribed;
    await contains(".w-mail-Thread:not([data-transient])");
    await triggerHotkey("Escape");
    await contains(
        ".w-livechat-CloseConfirmation:has(:text('Leaving will end the live chat with Mitchell Admin. Are you sure you want to continue?'))"
    );
    await triggerHotkey("Escape");
    await contains(".w-livechat-CloseConfirmation", { count: 0 });
    await triggerHotkey("Escape");
    await contains(
        ".w-livechat-CloseConfirmation:has(:text('Leaving will end the live chat with Mitchell Admin. Are you sure you want to continue?'))"
    );
    await triggerHotkey("Enter");
    await expect.waitForSteps(["/im_livechat/visitor_leave_session"]);
    await contains(".w-mail-ChatWindow", { text: "Did we correctly answer your question?" });
});

test("Should not show IM status of agents", async () => {
    mockGetMedia();
    const pyEnv = await startServer();
    await loadDefaultEmbedConfig();
    const joelUid = pyEnv["res.users"].create({
        name: "Joel",
        share: true,
        login: "joel",
        password: "joel",
    });
    pyEnv["res.partner"].create({ name: "Joel", user_ids: [joelUid] });
    pyEnv["res.partner"].write(serverState.partnerId, { user_livechat_username: "MitchellOp" });
    await start({ authenticateAs: { login: "joel", password: "joel" }, waitUntilSubscribe: false });
    await click(".w-livechat-LivechatButton");
    await contains(".w-mail-ChatWindow-header:text('MitchellOp')");
    const subscribed = waitUntilSubscribe();
    await postLivechatMessage("Hello MitchellOp!");
    await subscribed;
    await contains(".w-mail-Message[data-persistent]:contains('Hello MitchellOp!')");
    await click(".w-mail-ChatWindow-header");
    await contains(".w-mail-ChatBubble");
    await assertChatBubbleAndWindowImStatus("MitchellOp", 0);
});

test("Displays the name of agent in welcome message", async () => {
    const pyEnv = await startServer();
    const agentId = pyEnv["res.partner"].create({
        name: "Jane",
        user_ids: [Command.create({ name: "jane" })],
    });
    const botId = pyEnv["res.partner"].create({
        name: "Bot",
        user_ids: [Command.create({ name: "bot" })],
    });
    const guestId = pyEnv["mail.guest"].create({ name: "Visitor 2" });
    const livechatChannelId = await loadDefaultEmbedConfig();
    patchWithCleanup(session, {
        livechatData: {
            ...session.livechatData,
            options: {
                ...session.livechatData?.options,
                default_message: "Hello, how may I help you?",
            },
        },
    });
    const [chatAsAgent, chatAsBot] = pyEnv["discuss.channel"].create([
        {
            channel_member_ids: [
                Command.create({ partner_id: agentId, livechat_member_type: "agent" }),
                Command.create({ guest_id: guestId, livechat_member_type: "visitor" }),
            ],
            livechat_channel_id: livechatChannelId,
            channel_type: "livechat",
        },
        {
            channel_member_ids: [
                Command.create({ partner_id: botId, livechat_member_type: "bot" }),
                Command.create({ guest_id: guestId, livechat_member_type: "visitor" }),
            ],
            livechat_channel_id: livechatChannelId,
            channel_type: "livechat",
        },
    ]);
    setupChatHub({ opened: [chatAsAgent, chatAsBot] });
    await start({ authenticateAs: false });
    await contains(".w-mail-ChatWindow", { count: 2 });
    await contains(
        ".w-mail-ChatWindow:eq(0) .w-mail-Message:has(:text('Hello, how may I help you?')) .w-mail-Message-author:text('Jane')"
    );
    await contains(
        ".w-mail-ChatWindow:eq(1) .w-mail-Message:has(:text('Hello, how may I help you?')) .w-mail-Message-author:text('Bot')"
    );
});

test("should not make XMLHttpRequest to server file content when embedded externally", async () => {
    patchWithCleanup(location, {
        origin: "https://www.hoot.test",
    });
    patchWithCleanup(session, {
        origin: window.location.origin,
    });
    mockFetch(() => {
        throw new Error("Should not fetch from external to weth");
    });
    patchWithCleanup(HTMLAnchorElement.prototype, {
        click() {
            const url = new URL(this.href);
            expect.step(`${url.origin} ${url.searchParams.get("filename")}`);
        },
    });

    const pyEnv = await startServer();
    await loadDefaultEmbedConfig();

    const [partnerUser] = pyEnv["res.users"].search_read([["id", "=", serverState.partnerId]]);
    await start({ authenticateAs: partnerUser, waitUntilSubscribe: false });
    await click(".w-livechat-LivechatButton");
    const textFile = new File(["hello, world"], "test.txt", { type: "text/plain" });
    await contains(".w-mail-Composer");

    await click(".w-mail-Composer button[title='More Actions']");
    await contains(".dropdown-item:contains('Attach files')");
    await inputFiles(".w-mail-Composer .o_input_file", [textFile]);
    await contains(".w-mail-AttachmentContainer:not(.w-isUploading):contains(test.txt)");
    await click(".w-mail-Composer button[title='Send']:enabled");
    await contains(".w-mail-Message .w-mail-AttachmentContainer:contains(test.txt)");
    await click(
        ".w-mail-Message .w-mail-AttachmentContainer:contains(test.txt) [title='Download']"
    );

    expect.verifySteps([`${session.origin} test.txt`]);
});

/** @see {@link import("@mail/core/attachment_list_patch").ExternalLivechatDisabledPdfReason} */
test("should not allow preview of PDF attachments when embedded externally", async () => {
    patchWithCleanup(location, {
        origin: "https://www.hoot.test",
    });
    patchWithCleanup(session, {
        origin: window.location.origin,
    });
    patchWithCleanup(Attachment.prototype, {
        get isViewable() {
            const res = super.isViewable;
            if (res) {
                expect.step("fileViewer.isViewable");
            }
            return res;
        },
    });

    const pyEnv = await startServer();
    await loadDefaultEmbedConfig();

    const [partnerUser] = pyEnv["res.users"].search_read([["id", "=", serverState.partnerId]]);
    await start({ authenticateAs: partnerUser, waitUntilSubscribe: false });
    await click(".w-livechat-LivechatButton");
    const pdfFile = new File(["hello, world"], "test.pdf", { type: "application/pdf" });
    await contains(".w-mail-Composer");

    await click(".w-mail-Composer button[title='More Actions']");
    await contains(".dropdown-item:contains('Attach files')");
    await inputFiles(".w-mail-Composer .o_input_file", [pdfFile]);
    await contains(".w-mail-AttachmentContainer:not(.w-isUploading):contains(test.pdf)");
    await click(".w-mail-Composer button[title='Send']:enabled");
    await click(".w-mail-Message .w-mail-AttachmentContainer:contains(test.pdf)");
});

test("Agent sees the visitor avatar on the chat bubble of a live chat", async () => {
    const pyEnv = await startServer();
    const livechatChannelId = await loadDefaultEmbedConfig();
    const bobPartnerId = pyEnv["res.partner"].create({ name: "Bob Operator" });
    const ownSessionId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId, livechat_member_type: "visitor" }),
            Command.create({ partner_id: bobPartnerId, livechat_member_type: "agent" }),
        ],
        channel_type: "livechat",
        livechat_channel_id: livechatChannelId,
    });
    const guestId = pyEnv["mail.guest"].create({ name: "Visitor 11" });
    const visitorSessionId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId, livechat_member_type: "agent" }),
            Command.create({ guest_id: guestId, livechat_member_type: "visitor" }),
        ],
        channel_type: "livechat",
        livechat_channel_id: livechatChannelId,
    });
    expirableStorage.setItem(
        "im_livechat.saved_state",
        JSON.stringify({
            store: { "discuss.channel": [{ id: ownSessionId }] },
            persisted: true,
            livechatUserId: serverState.userId,
        })
    );
    setupChatHub({ folded: [visitorSessionId] });
    await start();
    const [guest] = pyEnv["mail.guest"].read(guestId);
    await contains(
        `.w-mail-ChatBubble img[data-src='${getOrigin()}/web/image/mail.guest/${guestId}/avatar_128?unique=${deserializeDateTime(guest.write_date).ts
        }']`
    );
    await contains(".w-mail-ChatBubble[name='Visitor 11']");
});

test("Agent sees their own avatar on the chat bubble of their own live chat", async () => {
    const pyEnv = await startServer();
    const livechatChannelId = await loadDefaultEmbedConfig();
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [Command.create({ partner_id: serverState.partnerId })],
        channel_type: "livechat",
        livechat_channel_id: livechatChannelId,
    });
    expirableStorage.setItem(
        "im_livechat.saved_state",
        JSON.stringify({
            store: { "discuss.channel": [{ id: channelId }] },
            persisted: true,
            livechatUserId: serverState.userId,
        })
    );
    setupChatHub({ folded: [channelId] });
    await start();
    const [partner] = pyEnv["res.partner"].read(serverState.partnerId);
    await contains(
        `.w-mail-ChatBubble img[data-src='${getOrigin()}/web/image/res.partner/${serverState.partnerId
        }/avatar_128?unique=${deserializeDateTime(partner.write_date).ts}']`
    );
});
