import {
    click,
    contains,
    defineMailModels,
    editInput,
    insertText,
    listenStoreFetch,
    openDiscuss,
    patchUiSize,
    scroll,
    SIZES,
    start,
    startServer,
    waitStoreFetch,
} from "@mail/../tests/mail_test_helpers";
import { animationFrame, expect, mockUserAgent, test } from "@weth/hoot";
import { press } from "@weth/hoot-dom";
import { tick } from "@weth/hoot-mock";
import { serverState } from "@web/../tests/web_test_helpers";

import { HIGHLIGHT_CLASS } from "@mail/core/common/message_search_hook";

defineMailModels();

test.tags("desktop");
test("Should have a search button", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await contains("[title='Search Messages']");
});

test.tags("desktop");
test("Should open the search panel when search button is clicked", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await contains(".w-discuss-ChannelMemberList"); // wait for auto-open of this panel
    await click("[title='Search Messages']");
    await contains(".w-mail-SearchMessagesPanel");
    await contains(".w-mail-ActionPanel-header .w-mail-SearchMessageInput");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput input");
});

test.tags("desktop");
test("Should open the search panel with hotkey 'f'", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "This is a message",
        attachment_ids: [],
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message");
    await press("alt+f");
    await contains(".w-mail-SearchMessagesPanel");
});

test.tags("desktop");
test("Search a message", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "This is a message",
        attachment_ids: [],
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message");
    await click("button[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput input");
    await editInput(
        document.body,
        ".w-mail-SearchMessageInput .w-mail-SearchInput input",
        "message"
    );
    await contains(".w-mail-SearchMessagesPanel .w-mail-Message");
    expect(".w-mail-SearchMessageInput .w-mail-SearchInput input").toHaveValue("message");
    await click("button[aria-label='Clear']");
    await contains(".w-mail-SearchMessagesPanel:not(:has(.w-mail-Message))");
    expect(".w-mail-SearchMessageInput .w-mail-SearchInput input").toHaveValue("");
});

test.tags("desktop");
test("Searching messages shows spinner icon", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "This is a message",
        attachment_ids: [],
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
    });
    let blockedFetchMessages = Promise.withResolvers();
    listenStoreFetch("/discuss/channel/messages", {
        logParams: ["/discuss/channel/messages"],
        async onRpc(request) {
            await blockedFetchMessages.promise;
            blockedFetchMessages = Promise.withResolvers();
        },
    });
    await start();
    await openDiscuss(channelId);
    blockedFetchMessages.resolve();
    await contains(".w-mail-Message");
    await waitStoreFetch([
        [
            "/discuss/channel/messages",
            { channel_id: channelId, fetch_params: { limit: 60, around: 0 } },
        ],
    ]);
    await click("button[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput input");
    await editInput(
        document.body,
        ".w-mail-SearchMessageInput .w-mail-SearchInput input",
        "message"
    );
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput.w-searching");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput i.oi.oi-spin");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput i.oi[data-icon='search']", {
        count: 0,
    });
    blockedFetchMessages.resolve();
    await waitStoreFetch([
        [
            "/discuss/channel/messages",
            {
                channel_id: channelId,
                fetch_params: { search_term: "message", before: false },
            },
        ],
    ]);
    await contains(".w-mail-SearchMessagesPanel .w-mail-Message");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput:not(.w-searching)");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput i.oi[data-icon='search']");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput i.oi.oi-spin", { count: 0 });
});

test.tags("desktop");
test("Clearing message input while pending search should empty message results", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "This is a message",
        attachment_ids: [],
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
    });
    let blockedFetchMessages = Promise.withResolvers();
    listenStoreFetch("/discuss/channel/messages", {
        logParams: ["/discuss/channel/messages"],
        async onRpc(request) {
            await blockedFetchMessages.promise;
            blockedFetchMessages = Promise.withResolvers();
        },
    });
    await start();
    await openDiscuss(channelId);
    blockedFetchMessages.resolve();
    await contains(".w-mail-Message");
    await waitStoreFetch([
        [
            "/discuss/channel/messages",
            { channel_id: channelId, fetch_params: { limit: 60, around: 0 } },
        ],
    ]);
    await click("button[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput input");
    await editInput(
        document.body,
        ".w-mail-SearchMessageInput .w-mail-SearchInput input",
        "This is"
    );
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput.w-searching");
    blockedFetchMessages.resolve();
    await waitStoreFetch([
        [
            "/discuss/channel/messages",
            {
                channel_id: channelId,
                fetch_params: { search_term: "This is", before: false },
            },
        ],
    ]);
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput:not(.w-searching)");
    await contains(".w-mail-SearchMessageResult .w-mail-Message");
    await editInput(
        document.body,
        ".w-mail-SearchMessageInput .w-mail-SearchInput input",
        "This is a message"
    );
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput.w-searching");
    await click("button[aria-label='Clear']");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput input", { value: "" });
    blockedFetchMessages.resolve();
    await waitStoreFetch([
        [
            "/discuss/channel/messages",
            {
                channel_id: channelId,
                fetch_params: { search_term: "This is a message", before: false },
            },
        ],
    ]);
    await animationFrame();
    await contains(".w-mail-SearchMessageResult .w-mail-Message", { count: 0 });
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput input", { value: "" });
});

test.tags("desktop");
test("Clearing message input while a search is queued should not show its results", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "This is a message",
        attachment_ids: [],
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
    });
    let blockedFetchMessages = Promise.withResolvers();
    listenStoreFetch("/discuss/channel/messages", {
        logParams: ["/discuss/channel/messages"],
        async onRpc(request) {
            await blockedFetchMessages.promise;
            blockedFetchMessages = Promise.withResolvers();
        },
    });
    await start();
    await openDiscuss(channelId);
    blockedFetchMessages.resolve();
    await contains(".w-mail-Message");
    await waitStoreFetch([
        [
            "/discuss/channel/messages",
            { channel_id: channelId, fetch_params: { limit: 60, around: 0 } },
        ],
    ]);
    await click("button[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput input");
    await editInput(document.body, ".w-mail-SearchMessageInput .w-mail-SearchInput input", "This");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput.w-searching");
    await editInput(
        document.body,
        ".w-mail-SearchMessageInput .w-mail-SearchInput input",
        "This is"
    );
    await animationFrame();
    await click("button[aria-label='Clear']");
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput input", { value: "" });
    blockedFetchMessages.resolve();
    await waitStoreFetch([
        [
            "/discuss/channel/messages",
            { channel_id: channelId, fetch_params: { search_term: "This", before: false } },
        ],
    ]);
    blockedFetchMessages.resolve();
    await animationFrame();
    expect.verifySteps([]);
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput input", { value: "" });
    await contains(".w-mail-SearchMessageResult .w-mail-Message", { count: 0 });
});

test.tags("desktop");
test("Search should be hightlighted", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "This is a message",
        attachment_ids: [],
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message");
    await click("[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    await insertText(".w-mail-SearchMessageInput .w-mail-SearchInput input", "message");
    await contains(`.w-mail-SearchMessagesPanel .w-mail-Message .${HIGHLIGHT_CLASS}`);
});

test.tags("desktop");
test("Should close the search panel when search button is clicked again", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await contains(".w-discuss-ChannelMemberList"); // wait for auto-open of this panel
    await click("[title='Search Messages']");
    await click("[title='Close Search']");
    await contains(".w-mail-SearchMessagesPanel");
});

test.tags("desktop");
test("Search a message in 60 messages should return 30 message first", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    for (let i = 0; i < 60; i++) {
        pyEnv["mail.message"].create({
            author_id: serverState.partnerId,
            body: "This is a message",
            attachment_ids: [],
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
        });
    }
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message", { count: 30 });
    await click("[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    await insertText(".w-mail-SearchMessageInput .w-mail-SearchInput input", "message");
    await contains(".w-mail-SearchMessagesPanel .w-mail-Message", { count: 30 });
    // give enough time to useVisible to potentially load more (unexpected) messages
    await tick();
    await contains(".w-mail-SearchMessagesPanel .w-mail-Message", { count: 30 });
});

test.tags("desktop");
test("Scrolling to the bottom should load more searched message", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    for (let i = 0; i < 90; i++) {
        pyEnv["mail.message"].create({
            author_id: serverState.partnerId,
            body: "This is a message",
            attachment_ids: [],
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
        });
    }
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message", { count: 30 });
    await click("[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    await insertText(".w-mail-SearchMessageInput .w-mail-SearchInput input", "message");
    await contains(".w-mail-SearchMessagesPanel .w-mail-Message", { count: 30 });
    await scroll(".w-mail-SearchMessagesPanel .w-mail-ActionPanel", "bottom");
    await contains(".w-mail-SearchMessagesPanel .w-mail-Message", { count: 60 });
    // give enough time to useVisible to potentially load more (unexpected) messages
    await tick();
    await contains(".w-mail-SearchMessagesPanel .w-mail-Message", { count: 60 });
});

test.tags("desktop");
test("Search a message containing round brackets", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "This is a (message)",
        attachment_ids: [],
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message");
    await click("button[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    await insertText(".w-mail-SearchMessageInput .w-mail-SearchInput input", "(message");
    await contains(".w-mail-SearchMessagesPanel .w-mail-Message");
});

test.tags("desktop");
test("Search a message containing single quotes", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        body: "<p>I can't do it</p>",
        model: "discuss.channel",
        res_id: channelId,
        message_type: "comment",
    });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    await insertText(".w-mail-SearchMessageInput .w-mail-SearchInput input", "can't");
    await contains(".w-mail-SearchMessagesPanel .w-mail-Message");
});

test.tags("mobile");
test("Close message search panel when navigating back on mobile", async () => {
    mockUserAgent("android");
    patchUiSize({ size: SIZES.SM });
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-ChatWindow-moreActions");
    await click("button:text('Search Messages')");
    await contains(".w-mail-SearchMessagesPanel");
    history.back();
    await contains(".w-mail-SearchMessagesPanel", { count: 0 });
});

test.tags("desktop");
test("Search should trigger a single store fetch", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "This is a message");
    await click(".w-sendMessageActive:enabled");
    await contains(".w-mail-Message");
    await click("button[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    listenStoreFetch("/discuss/channel/messages");
    await insertText(".w-mail-SearchMessageInput .w-mail-SearchInput input", "message");
    await waitStoreFetch("/discuss/channel/messages");
    await waitStoreFetch();
});

test.tags("desktop");
test("Empty search should not trigger rpc", async () => {
    listenStoreFetch("/discuss/channel/messages", {
        logParams: ["/discuss/channel/messages"]
    });
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "This is a message",
        attachment_ids: [],
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message");
    await click("button[title='Search Messages']");
    await waitStoreFetch([
        [
            "/discuss/channel/messages",
            { channel_id: channelId, fetch_params: { limit: 60, around: 0 } },
        ],
    ]);
    await contains(".w-mail-SearchMessageInput .w-mail-SearchInput input");
    await editInput(document.body, ".w-mail-SearchMessageInput .w-mail-SearchInput input", "          ");
    await animationFrame();
    await insertText(".w-mail-SearchMessageInput .w-mail-SearchInput input", "m", { replace: true });
    await contains(".w-mail-SearchMessagesPanel .w-mail-Message");
    await waitStoreFetch([
        [
            "/discuss/channel/messages",
            { channel_id: channelId, fetch_params: { search_term: "m", before: false } },
        ],
    ]);
});
