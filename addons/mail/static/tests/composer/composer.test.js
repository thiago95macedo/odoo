import { useSubEnv } from "@web/owl2/utils";
import { pasteHtml, pasteText, tripleClick } from "@html_editor/../tests/_helpers/user_actions";

import {
    SIZES,
    click,
    contains,
    defineMailModels,
    dragenterFiles,
    dropFiles,
    focus,
    inputFiles,
    insertText,
    onRpcBefore,
    openDiscuss,
    openFormView,
    pasteFiles,
    patchUiSize,
    registerArchs,
    scroll,
    setIndexedDB,
    setupChatHub,
    start,
    startServer,
    triggerHotkey,
} from "@mail/../tests/mail_test_helpers";
import { htmlInsertText } from "@mail/../tests/mail_test_helpers_html";
import { beforeEach, describe, expect, test } from "@weth/hoot";
import { advanceTime, animationFrame, tick } from "@weth/hoot-mock";
import {
    Command,
    destroyApp,
    getMockEnv,
    getService,
    assignDialogTestEnv,
    mountWithCleanup,
    onRpc,
    patchWithCleanup,
    serverState,
    withUser,
} from "@web/../tests/web_test_helpers";

import { Composer } from "@mail/core/common/composer";
import { edit, press, queryFirst, waitFor } from "@weth/hoot-dom";
import { MailComposerFormController } from "@mail/chatter/web/mail_composer_form";
import { getIndexedDB } from "../mail_test_helpers";
import { waitNotifications } from "@bus/../tests/bus_test_helpers";

describe.current.tags("desktop");
defineMailModels();

beforeEach(() => {
    // Simulate real user interactions
    patchWithCleanup(Composer.prototype, {
        isEventTrusted() {
            return true;
        },
    });
});

function cut(editor) {
    const clipboardData = new DataTransfer();
    const cutEvent = new ClipboardEvent("cut", { clipboardData });
    editor.editable.dispatchEvent(cutEvent);
    return clipboardData;
}

test("composer text input: basic rendering when posting a message", async () => {
    await startServer();
    await start();
    await openFormView("res.partner", serverState.partnerId);
    await click("button:text('Send message')");
    await contains(
        "textarea.w-mail-Composer-input[placeholder='Send a message to all followers and selected contacts…']"
    );
});

test("composer text input: basic rendering when logging note", async () => {
    await startServer();
    await start();
    await openFormView("res.partner", serverState.partnerId);
    await click("button:text('Log note')");
    await contains("textarea.w-mail-Composer-input[placeholder='Log an internal note…']");
});

test("composer text input: basic rendering when linked thread is a discuss.channel", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "dofus-disco" });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer");
    await contains("textarea.w-mail-Composer-input");
});

test("[text composer] composer text input placeholder should contain channel name when thread does not have specific correspondent", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "channel",
        name: "General",
    });
    await start();
    await openDiscuss(channelId);
    await contains("textarea.w-mail-Composer-input[placeholder='Message #General…']");
});

test.tags("html composer");
test("composer text input placeholder should contain channel name when thread does not have specific correspondent", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "channel",
        name: "General",
    });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(channelId);
    await contains(
        ".w-mail-Composer-html.weth-editor-editable .w-we-hint[o-we-hint-text='Message #General…']"
    );
});

test("[text composer] composer input placeholder in channel thread", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
    });
    const subchannelID = pyEnv["discuss.channel"].create({
        name: "ThreadFromGeneral",
        parent_channel_id: channelId,
    });
    await start();
    await openDiscuss(subchannelID);
    await contains(`.w-mail-Composer-input[placeholder='Message "ThreadFromGeneral"']`);
});

test.tags("html composer");
test("composer input placeholder in channel thread", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
    });
    const subchannelID = pyEnv["discuss.channel"].create({
        name: "ThreadFromGeneral",
        parent_channel_id: channelId,
    });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(subchannelID);
    await contains(
        ".w-mail-Composer-html.weth-editor-editable .w-we-hint[o-we-hint-text='Message \"ThreadFromGeneral\"']"
    );
});

test("[text composer] add an emoji", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "swamp-safari" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await click(".w-Emoji:text('😤')");
    await contains(".w-mail-Composer-input", { value: "😤" });
});

test.tags("html composer");
test("add an emoji", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "swamp-safari" });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await click(".w-Emoji:text('😤')");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('😤')");
});

test.tags("html composer");
test("press Enter with emoji suggestions inserts emoji and does not send", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "swamp-safari" });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(channelId);
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, ":smil");
    await contains(".w-we-SuggestionList .w-navigable:has(:text('😃'))");
    await press("Enter");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('😃')");
});

test("[text composer] emojis are auto-substituted from text", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "swamp-safari" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", ":)");
    await press("Enter");
    await contains(".w-mail-Message-body:text('😊')");
    await insertText(".w-mail-Composer-input", "x'D");
    await press("Enter");
    await contains(".w-mail-Message-body:text('😂')");
    await insertText(".w-mail-Composer-input", ">:)");
    await press("Enter");
    await contains(".w-mail-Message-body:text('😈')");
});

test.tags("html composer");
test("emojis are auto-substituted from text", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, ":)");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('😊')");
    await press("Enter");
    await contains(".w-mail-Message-body:text('😊')");
    await htmlInsertText(editor, "x'D");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('😂')");
    await press("Enter");
    await contains(".w-mail-Message-body:text('😂')");
    await htmlInsertText(editor, ">:)");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('😈')");
    await press("Enter");
    await contains(".w-mail-Message-body:text('😈')");
});

test.tags("focus required");
test("[text composer] Exiting emoji picker brings the focus back to the Composer textarea", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await contains(".w-mail-Composer-input:not(:focus)");
    triggerHotkey("Escape");
    await contains(".w-mail-Composer-input:focus");
});

test.tags("focus required", "html composer");
test("Exiting emoji picker brings the focus back to the Composer textarea", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await click("button[title='Add Emojis']");
    await contains(".w-mail-Composer-html.weth-editor-editable:not(:focus)");
    triggerHotkey("Escape");
    await contains(".w-mail-Composer-html.weth-editor-editable:focus");
});

test("[text composer] add an emoji after some text", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "beyblade-room" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Blabla");
    await contains(".w-mail-Composer-input", { value: "Blabla" });
    await click("button[title='Add Emojis']");
    await click(".w-Emoji:text('🤑')");
    await contains(".w-mail-Composer-input", { value: "Blabla🤑" });
});

test.tags("html composer");
test("add an emoji after some text", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "beyblade-room" });
    await start();
    await openDiscuss(channelId);
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "Blabla");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('Blabla')");
    await click("button[title='Add Emojis']");
    await click(".w-Emoji:text('🤑')");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('Blabla🤑')");
});

test("add emoji replaces (keyboard) text selection", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "pétanque-tournament-14" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Blabla");
    await contains(".w-mail-Composer-input", { value: "Blabla" });
    // simulate selection of all the content by keyboard
    document
        .querySelector(".w-mail-Composer-input")
        .setSelectionRange(0, document.querySelector(".w-mail-Composer-input").value.length);
    await animationFrame(); // wait synced with model selection
    await click("button[title='Add Emojis']");
    await click(".w-Emoji:text('🤠')");
    await contains(".w-mail-Composer-input", { value: "🤠" });
});

test("Cursor is positioned after emoji after adding it", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "pétanque-tournament-14" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Blabla");
    const textarea = document.querySelector(".w-mail-Composer-input");
    textarea.setSelectionRange(2, 2);
    await animationFrame(); // wait synced with model selection
    await click("button[title='Add Emojis']");
    await click(".w-Emoji:text('🤠')");
    await contains(".w-mail-Composer-input", { value: "Bl🤠abla" });
    const expectedPos = 2 + "🤠".length;
    expect(textarea.selectionStart).toBe(expectedPos);
    expect(textarea.selectionEnd).toBe(expectedPos);
});

test("selected text is not replaced after cancelling the selection", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "pétanque-tournament-14" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Blabla");
    await contains(".w-mail-Composer-input", { value: "Blabla" });
    // simulate selection of all the content by keyboard
    document
        .querySelector(".w-mail-Composer-input")
        .setSelectionRange(0, document.querySelector(".w-mail-Composer-input").value.length);
    await animationFrame(); // wait synced with model selection
    await click(".w-mail-DiscussContent");
    await animationFrame(); // wait t-model of Composer input synced with selection reset
    await click("button[title='Add Emojis']");
    await click(".w-Emoji:text('🤠')");
    await contains(".w-mail-Composer-input", { value: "Blabla🤠" });
});

test("Selection is kept when changing channel and going back to original channel", async () => {
    const pyEnv = await startServer();
    const [channelId] = pyEnv["discuss.channel"].create([
        { name: "channel1" },
        { name: "channel2" },
    ]);
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Foo");
    // simulate selection of all the content by keyboard
    const textarea = queryFirst(".w-mail-Composer-input");
    textarea.setSelectionRange(0, textarea.value.length);
    await animationFrame(); // synced with model selection
    await click(":nth-child(2 of .w-mail-MessagingMenuItem) .w-mail-NotificationItem");
    await click(":nth-child(1 of .w-mail-MessagingMenuItem) .w-mail-NotificationItem");
    expect(textarea.selectionStart).toBe(0);
    expect(textarea.selectionEnd).toBe(textarea.value.length);
});

test("click on emoji button, select emoji, then re-click on button should show emoji picker", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "roblox-skateboarding" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await click(".w-Emoji:text('👺')");
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker");
});

test("keep emoji picker scroll value when re-opening it", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "roblox-carsurfing" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    // requires an extra delay (give time for auto scroll before setting new value)
    await contains(".w-EmojiPicker-content", { scroll: 0 });
    await scroll(".w-EmojiPicker-content", 150);
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-content", { count: 0 });
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-content", { scroll: 150 });
});

test("reset emoji picker scroll value after an emoji is picked", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "roblox-fingerskating" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    // requires an extra delay (give time for auto scroll before setting new value)
    await contains(".w-EmojiPicker-content", { scroll: 0 });
    await scroll(".w-EmojiPicker-content", 150);
    await click(".w-Emoji:text('😎')");
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-content", { scroll: 0 });
});

test("keep emoji picker scroll value independent if two or more different emoji pickers are used", async () => {
    const pyEnv = await startServer();
    const channelIds = pyEnv["discuss.channel"].create([
        { name: "roblox-jaywalking" },
        { name: "Sales" },
    ]);
    setupChatHub({ opened: channelIds });
    await start();
    await click("button[title='Add Emojis']", {
        parent: [".w-mail-ChatWindow:has(:text('Sales'))"],
    });
    // requires an extra delay (give time for auto scroll before setting new value)
    await contains(".w-EmojiPicker-content", { scroll: 0 });
    await scroll(".w-EmojiPicker-content", 200);
    await contains(".w-EmojiPicker-content", { scroll: 200 });
    await click("button[title='Add Emojis']", {
        parent: [".w-mail-ChatWindow:has(:text('Sales'))"],
    });
    await contains(".w-EmojiPicker-content", { count: 0 });
    await click("button[title='Add Emojis']", {
        parent: [".w-mail-ChatWindow:has(:text('roblox-jaywalking'))"],
    });
    // requires an extra delay (give time for auto scroll before setting new value)
    await contains(".w-EmojiPicker-content", { scroll: 0 });
    await scroll(".w-EmojiPicker-content", 150);
    await contains(".w-EmojiPicker-content", { scroll: 150 });
    await click("button[title='Add Emojis']", {
        parent: [".w-mail-ChatWindow:has(:text('roblox-jaywalking'))"],
    });
    await click("button[title='Add Emojis']", {
        parent: [".w-mail-ChatWindow:has(:text('Sales'))"],
    });
    await contains(".w-EmojiPicker-content", { scroll: 200 });
});

test("composer text input cleared on message post", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "au-secours-aidez-moi" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "test message");
    await contains(".w-mail-Composer-input", { value: "test message" });
    await press("Enter");
    await contains(".w-mail-Message");
    await contains(".w-mail-Composer-input", { value: "" });
});

test("[text composer] send message only once when ENTER twice quickly", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "nether-picnic" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "test message");
    press("Enter");
    press("Enter");
    await contains(".w-mail-Message");
});

test.tags("html composer");
test("send message only once when ENTER twice quickly", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "nether-picnic" });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(channelId);
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "test message");
    press("Enter");
    press("Enter");
    await contains(".w-mail-Message", { count: 1 });
});

test("Show send button in mobile", async () => {
    const pyEnv = await startServer();
    patchUiSize({ size: SIZES.SM });
    pyEnv["discuss.channel"].create({ name: "minecraft-wii-u" });
    await start();
    await openDiscuss();
    await click("button:text('Channels')");
    await click(".w-mail-NotificationItem-name:text('minecraft-wii-u')");
    await contains(".w-mail-Composer button[title='Send']");
    await contains(".w-mail-Composer button[title='Send'] i[data-icon='send']");
});

test("composer textarea content is retained when changing channel then going back", async () => {
    const pyEnv = await startServer();
    const [channelId] = pyEnv["discuss.channel"].create([
        { name: "minigolf-galaxy-iv" },
        { name: "epic-shrek-lovers" },
    ]);
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "According to all known laws of aviation,");
    await click(".w-mail-NotificationItem:has(:text('epic-shrek-lovers'))");
    await contains("textarea.w-mail-Composer-input[placeholder='Message #epic-shrek-lovers…']");
    await contains(".w-mail-Composer-input", { value: "" });
    await click(".w-mail-NotificationItem:has(:text('minigolf-galaxy-iv'))");
    await contains("textarea.w-mail-Composer-input[placeholder='Message #minigolf-galaxy-iv…']", {
        value: "According to all known laws of aviation,",
    });
});

test("add an emoji after a partner mention", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({
        email: "testpartner@weth.com.br",
        name: "TestPartner",
    });
    const channelId = pyEnv["discuss.channel"].create({
        name: "Mario Party",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-input", { value: "" });
    await insertText(".w-mail-Composer-input", "@Te");
    await click(".w-mail-Composer-suggestion");
    await contains(".w-mail-Composer-input", { value: "@TestPartner " });
    await click("button[title='Add Emojis']");
    await click(".w-Emoji:text('😊')");
    await contains(".w-mail-Composer-input", { value: "@TestPartner 😊" });
});

test("pending mentions are kept when toggling composer", async () => {
    await startServer();
    await start();
    await openFormView("res.partner", serverState.partnerId);
    await click("button:text('Send message')");
    await insertText(".w-mail-Composer-input", "@");
    await click(".w-mail-Composer-suggestion strong:text('Mitchell Admin')");
    await contains(".w-mail-Composer-input", { value: "@Mitchell Admin " });
    await click("button:text('Send message')");
    await contains(".w-mail-Composer-input", { count: 0 });
    await click("button:text('Send message')");
    await click(".w-mail-Composer-send:enabled");
    await contains(".w-mail-Message-body a.o_mail_redirect:text('@Mitchell Admin')");
});

test("composer suggestion should match with input selection", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({
        email: "testpartner@weth.com.br",
        name: "Luigi",
    });
    const channelId = pyEnv["discuss.channel"].create({
        name: "Mario Party",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-input", { value: "" });
    await insertText(".w-mail-Composer-input", "@");
    await contains(".w-mail-Composer-suggestion:has(:text('Luigi'))");
    const textarea = queryFirst(".w-mail-Composer-input");
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await contains(".w-mail-Composer-suggestion:has(:text('Luigi'))");
});

test('[text composer] do not post message on channel with "SHIFT-Enter" keyboard shortcut', async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Test");
    await contains(".w-mail-Message", { count: 0 });
    triggerHotkey("shift+Enter");
    await tick(); // weak test, no guarantee that we waited long enough for the potential message to be posted
    await contains(".w-mail-Message", { count: 0 });
});

test.tags("html composer");
test("do not post message on channel with 'SHIFT-Enter' keyboard shortcut", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer(); // Enable HTML composer mode
    await openDiscuss(channelId);
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "Test");
    await contains(".w-mail-Message", { count: 0 });
    triggerHotkey("shift+Enter");
    await tick(); // Wait for potential message posting
    await contains(".w-mail-Message", { count: 0 });
});

test('[text composer] post message on channel with "Enter" keyboard shortcut', async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    await start();
    await openDiscuss(channelId);
    await focus(".w-mail-Composer-input");
    await edit("Test");
    await contains(".w-mail-Message", { count: 0 });
    await press("Enter");
    await contains(".w-mail-Message");
    // check composition mode doesn't send message
    await edit("test", { composition: true });
    await press("Enter", { isComposing: true });
    await animationFrame();
    await contains(".w-mail-Message");
});

test.tags("html composer");
test("post message on channel with 'Enter' keyboard shortcut", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(channelId);
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "Test");
    await contains(".w-mail-Message", { count: 0 });
    await press("Enter");
    await contains(".w-mail-Message");
    await htmlInsertText(editor, "test");
    await press("Enter", { isComposing: true });
    await animationFrame();
    await contains(".w-mail-Message");
});

test("Can handle leave notification from unknown member", async () => {
    const pyEnv = await startServer();
    const userId = pyEnv["res.users"].create({ name: "Dobby" });
    const partnerId = pyEnv["res.partner"].create({ name: "Dobby", user_ids: [userId] });
    const channelId = pyEnv["discuss.channel"].create({
        name: "general",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    await start();
    await openDiscuss(channelId);
    await withUser(userId, () =>
        getService("orm").call("discuss.channel", "action_unfollow", [channelId])
    );
    await contains(".w-discuss-ChannelMember:text('Mitchell Admin')");
    await contains(".w-discuss-ChannelMember:text('Dobby')", { count: 0 });
});

test("Can post suggestions", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "@Mi");
    await contains(".w-mail-Composer-suggestion strong", { count: 1 });
    triggerHotkey("Enter");
    await contains(".w-mail-Composer-input", { value: "@Mitchell Admin " });
    triggerHotkey("Enter");
    await contains(".w-mail-Message .o_mail_redirect");
});

test("[text composer] composer text input placeholder should contain correspondent name when thread has exactly one correspondent", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Marc Demo" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    await start();
    await openDiscuss(channelId);
    await contains("textarea.w-mail-Composer-input[placeholder='Message Marc Demo…']");
});

test.tags("html composer");
test("composer text input placeholder should contain correspondent name when thread has exactly one correspondent", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Marc Demo" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    await start();
    await openDiscuss(channelId);
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await contains(
        ".w-mail-Composer-html.weth-editor-editable .w-we-hint[o-we-hint-text='Message Marc Demo…']"
    );
});

test.tags("focus required");
test("[text composer] quick edit last self-message from UP arrow", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    pyEnv["mail.message"].create([
        {
            author_id: serverState.partnerId,
            body: "Test-1",
            attachment_ids: [],
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
        },
        {
            author_id: serverState.partnerId,
            body: "Test-2",
            attachment_ids: [],
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
        },
    ]);
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message-content:text('Test-1')");
    await contains(".w-mail-Message-content:text('Test-2')");
    await contains(".w-mail-Message .w-mail-Composer", { count: 0 });
    triggerHotkey("ArrowUp");
    await contains(".w-mail-Message .w-mail-Composer-input", { value: "Test-2" });
    triggerHotkey("Escape");
    await contains(".w-mail-Message .w-mail-Composer", { count: 0 });
    await contains(".w-mail-Composer.w-focused");
    // non-empty composer should not trigger quick edit
    await insertText(".w-mail-Composer-input", "Shrek");
    triggerHotkey("ArrowUp");
    // Navigable List relies on useEffect, which behaves with 2 animation frames
    // Wait 2 animation frames to make sure it doesn't show quick edit
    await tick();
    await tick();
    await contains(".w-mail-Message .w-mail-Composer", { count: 0 });
    // ArrowUp for quick edit last stays on last edit message, does not jump to older messages.
    await insertText(".w-mail-Composer-input", "", { replace: true });
    triggerHotkey("ArrowUp");
    await insertText(".w-mail-Message .w-mail-Composer-input", "", { replace: true });
    triggerHotkey("ArrowUp");
    await contains(".w-mail-Message .w-mail-Composer-input", { value: "" });
    await insertText(".w-mail-Message .w-mail-Composer-input", "edited message", { replace: true });
    triggerHotkey("Enter");
    await contains(".w-mail-Message-content:text('edited message (edited)')");
});

test.tags("focus required", "html composer");
test("quick edit last self-message from UP arrow", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "Test",
        attachment_ids: [],
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(channelId);
    await contains(".w-mail-Message-content:text('Test')");
    await contains(".w-mail-Message .w-mail-Composer", { count: 0 });
    triggerHotkey("ArrowUp");
    await contains(".w-mail-Message .w-mail-Composer");
    triggerHotkey("Escape");
    await contains(".w-mail-Message .w-mail-Composer", { count: 0 });
    await contains(".w-mail-Composer-html.weth-editor-editable:focus");
    // Non-empty composer should not trigger quick edit
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "Shrek");
    triggerHotkey("ArrowUp");
    // Navigable List relies on useEffect, which behaves with 2 animation frames
    // Wait 2 animation frames to make sure it doesn't show quick edit
    await tick();
    await tick();
    await contains(".w-mail-Message .w-mail-Composer", { count: 0 });
});

test("Select composer suggestion via Enter does not send the message", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({
        email: "shrek@weth.com.br",
        name: "Shrek",
    });
    pyEnv["res.users"].create({ partner_id: partnerId });
    const channelId = pyEnv["discuss.channel"].create({
        name: "general",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "@Shrek");
    await contains(".w-mail-Composer-suggestion");
    triggerHotkey("Enter");
    await contains(".w-mail-Composer-input", { value: "@Shrek " });
    // weak test, no guarantee that we waited long enough for the potential message to be posted
    await contains(".w-mail-Message", { count: 0 });
});

test("composer: drop attachments", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const text = new File(["hello, world"], "text.txt", { type: "text/plain" });
    const text2 = new File(["hello, worlduh"], "text2.txt", { type: "text/plain" });
    const text3 = new File(["hello, world"], "text3.txt", { type: "text/plain" });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-input");
    await contains(".w-Dropzone", { count: 0 });
    await contains(".w-mail-AttachmentContainer", { count: 0 });
    const files = [text, text2];
    await dragenterFiles(".w-mail-Composer-input", files);
    await contains(".w-Dropzone");
    await contains(".w-mail-AttachmentContainer", { count: 0 });
    await dropFiles(".w-Dropzone", files);
    await contains(".w-Dropzone", { count: 0 });
    await contains(".w-mail-AttachmentContainer:not(.w-isUploading)", { count: 2 });
    const extraFiles = [text3];
    await dragenterFiles(".w-mail-Composer-input", extraFiles);
    await dropFiles(".w-Dropzone", extraFiles);
    await contains(".w-mail-AttachmentContainer:not(.w-isUploading)", { count: 3 });
});

test("composer: add an attachment", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const text = new File(["hello, world"], "text.txt", { type: "text/plain" });
    await start();
    await openDiscuss(channelId);
    await inputFiles(".w-mail-Composer .o_input_file", [text]);
    await contains(".w-mail-AttachmentContainer:not(.w-isUploading):contains(text.txt)");
    await contains(".w-mail-Composer-footer .w-mail-AttachmentList");
    await contains(
        ".w-mail-Composer-footer .w-mail-AttachmentList .w-mail-AttachmentContainer:not(.w-isUploading):contains(text.txt)"
    );
});

test("composer: send button is disabled if attachment upload is not finished", async () => {
    const pyEnv = await startServer();
    const { promise, resolve } = Promise.withResolvers();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const text = new File(["hello, world"], "text.txt", { type: "text/plain" });
    onRpcBefore("/mail/attachment/upload", async () => await promise);
    await start();
    await openDiscuss(channelId);
    await inputFiles(".w-mail-Composer .o_input_file", [text]);
    await contains(".w-mail-AttachmentContainer.w-isUploading:contains(text.txt)");
    await press("Enter");
    // simulates attachment finishes uploading
    resolve();
    await contains(".w-mail-AttachmentContainer:not(.w-isUploading):contains(text.txt)");
    await contains(".w-mail-AttachmentContainer.w-isUploading", { count: 0 });
    await press("Enter");
});

test("remove an attachment from composer does not need any confirmation", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const text = new File(["hello, world"], "text.txt", { type: "text/plain" });
    await start();
    await openDiscuss(channelId);
    await inputFiles(".w-mail-Composer .o_input_file", [text]);
    await contains(".w-mail-AttachmentContainer:not(.w-isUploading):contains(text.txt)");
    await contains(".w-mail-Composer-footer .w-mail-AttachmentList");
    await click(".w-mail-Attachment-unlink");
    await contains(".w-mail-AttachmentList .w-mail-AttachmentContainer", { count: 0 });
});

test("[text composer] composer: paste attachments", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "test" });
    const text = new File(["hello, world"], "text.txt", { type: "text/plain" });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-input");
    await contains(".w-mail-AttachmentList .w-mail-AttachmentContainer", { count: 0 });
    await pasteFiles(".w-mail-Composer-input", [text]);
    await contains(
        ".w-mail-AttachmentList .w-mail-AttachmentContainer:not(.w-isUploading):contains(text.txt)"
    );
});

test.tags("html composer");
test("composer: paste attachments", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "test" });
    const text = new File(["hello, world"], "text.txt", { type: "text/plain" });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-html.weth-editor-editable");
    await contains(".w-mail-AttachmentList .w-mail-AttachmentContainer", { count: 0 });
    await pasteFiles(".w-mail-Composer-html.weth-editor-editable", [text]);
    await contains(
        ".w-mail-AttachmentList .w-mail-AttachmentContainer:not(.w-isUploading):contains(text.txt)"
    );
});

test.tags("focus required");
test("Replying on a channel should focus composer initially", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "channel",
        name: "general",
    });
    pyEnv["mail.message"].create({
        body: "Hello world",
        res_id: channelId,
        message_type: "comment",
        model: "discuss.channel",
    });
    await start();
    await openDiscuss(channelId);
    await click("[title='Expand']");
    await click(".w-dropdown-item:contains('Reply')");
    await contains(".w-mail-Composer-input:focus");
});

test("removing attachment from composer should not delete it from template", async () => {
    patchWithCleanup(MailComposerFormController.prototype, {
        setup() {
            if (!this.env.dialogData) {
                useSubEnv({ dialogData: {} });
            }
            super.setup();
        },
    });
    const pyEnv = await startServer();
    const attachmentId = pyEnv["ir.attachment"].create({
        name: "TemplateAttachment",
        res_model: "mail.template", // Attachment of mail.template
    });
    const templateId = pyEnv["mail.template"].create({
        name: "TestTemplate",
        attachment_ids: [attachmentId],
    });
    registerArchs({
        "mail.compose.message,false,form": `
            <form string="Compose Email" js_class="mail_composer_form">
                <field name="attachment_ids" widget="mail_composer_attachment_list"/>
            </form>`,
    });
    await start();
    const composer = pyEnv["mail.compose.message"].create({
        model: "res.partner",
        attachment_ids: [attachmentId],
    });
    await openFormView("mail.compose.message", composer);
    await contains(".o_field_mail_composer_attachment_list", { text: "TemplateAttachment" });
    await click(".o_field_mail_composer_attachment_list button");
    await contains(".o_field_mail_composer_attachment_list li", { count: 0 });
    const [updatedTemplate] = pyEnv["mail.template"].read([templateId]);
    expect(updatedTemplate.attachment_ids).toEqual([attachmentId], {
        message: "The attachment must remain on the template after being removed from the composer",
    });
});

test("remove an uploading attachment", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "test" });
    const text = new File(["hello, world"], "text.txt", { type: "text/plain" });
    onRpc("/mail/attachment/upload", () => new Promise(() => { })); // simulates uploading indefinitely
    await start();
    await openDiscuss(channelId);
    await inputFiles(".w-mail-Composer .o_input_file", [text]);
    await contains(".w-mail-AttachmentContainer.w-isUploading:contains(text.txt)");
    await click(".w-mail-Attachment-unlink");
    await contains(".w-mail-Composer .w-mail-AttachmentContainer", { count: 0 });
});

test("Uploading multiple files in the composer create multiple temporary attachments", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "test" });
    const text1 = new File(["hello, world"], "text1.txt", { type: "text/plain" });
    const text2 = new File(["hello, world"], "text2.txt", { type: "text/plain" });
    onRpc("/mail/attachment/upload", () => new Promise(() => { }));
    await start();
    await openDiscuss(channelId);
    await inputFiles(".w-mail-Composer .o_input_file", [text1, text2]);
    await contains(".w-mail-AttachmentContainer.w-isUploading:contains(text1.txt)");
    await contains(".w-mail-AttachmentContainer.w-isUploading:contains(text2.txt)");
    await contains(".w-mail-AttachmentContainer div[title='Uploading']", { count: 2 });
});

test("[technical] does not crash when an attachment is removed before its upload starts", async () => {
    // Uploading multiple files uploads attachments one at a time, this test
    // ensures that there is no crash when an attachment is destroyed before its
    // upload started.
    const pyEnv = await startServer();
    // Promise to block attachment uploading
    const { promise, resolve } = Promise.withResolvers();
    const channelId = pyEnv["discuss.channel"].create({ name: "test" });
    const text1 = new File(["hello, world"], "text1.txt", { type: "text/plain" });
    const text2 = new File(["hello, world"], "text2.txt", { type: "text/plain" });
    onRpcBefore("/mail/attachment/upload", async () => await promise);
    await start();
    await openDiscuss(channelId);
    await inputFiles(".w-mail-Composer .o_input_file", [text1, text2]);
    await contains(".w-mail-AttachmentContainer.w-isUploading:contains(text1.txt)");
    await click(
        ".w-mail-AttachmentContainer.w-isUploading:contains(text2.txt) .w-mail-Attachment-unlink"
    );
    await contains(".w-mail-AttachmentContainer:contains('text2.txt')", { count: 0 });
    // Simulates the completion of the upload of the first attachment
    resolve();
    await contains(".w-mail-AttachmentContainer:not(.w-isUploading):contains(text1.txt)");
});

test("Message is sent only once when pressing enter twice in a row", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Hello World!");
    triggerHotkey("Enter");
    triggerHotkey("Enter");
    // weak test, no guarantee that we waited long enough for the potential second message to be posted
    await contains(".w-mail-Message-content:text('Hello World!')");
});

test('[text composer] display canned response suggestions on typing "::"', async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    pyEnv["mail.canned.response"].create({
        source: "hello",
        substitution: "Hello! How are you?",
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-input");
    await contains(".w-mail-Composer-suggestionList .w-open", { count: 0 });
    await insertText(".w-mail-Composer-input", "::");
    await contains(".w-mail-Composer-suggestionList .w-open");
    await contains(".w-mail-NavigableList-item:text('hello Hello! How are you?')");
});

test.tags("html composer");
test('display canned response suggestions on typing "::"', async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    pyEnv["mail.canned.response"].create({
        source: "hello",
        substitution: "Hello! How are you?",
    });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(channelId);
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "::");
    await contains(".w-mail-Composer-suggestionList .w-open");
    await contains(".w-mail-NavigableList-item:text('hello Hello! How are you?')");
});

test("[text composer] select a canned response suggestion", async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    pyEnv["mail.canned.response"].create({
        source: "hello",
        substitution: "Hello! How are you?",
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-suggestionList");
    await contains(".w-mail-Composer-suggestionList .w-open", { count: 0 });
    await contains(".w-mail-Composer-input", { value: "" });
    await insertText(".w-mail-Composer-input", "::");
    await click(".w-mail-Composer-suggestion");
    await contains(".w-mail-Composer-input", { value: "Hello! How are you? " });
});

test.tags("html composer");
test("select a canned response suggestion", async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    pyEnv["mail.canned.response"].create({
        source: "hello",
        substitution: "Hello! How are you?",
    });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(channelId);
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "::");
    await click(".w-mail-Composer-suggestion");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('Hello! How are you?')");
});

test("[text composer] select a canned response suggestion with some text", async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "Mario",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    pyEnv["mail.canned.response"].create({
        source: "hello",
        substitution: "Hello! How are you?",
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-suggestionList");
    await contains(".w-mail-Composer-input", { value: "" });
    await insertText(".w-mail-Composer-input", "bluhbluh ");
    await contains(".w-mail-Composer-input", { value: "bluhbluh " });
    await insertText(".w-mail-Composer-input", "::");
    await click(".w-mail-Composer-suggestion");
    await contains(".w-mail-Composer-input", { value: "bluhbluh Hello! How are you? " });
});

test.tags("html composer");
test("select a canned response suggestion with some text", async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "Mario",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    pyEnv["mail.canned.response"].create({
        source: "hello",
        substitution: "Hello! How are you?",
    });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(channelId);
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "bluhbluh ");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('bluhbluh')");
    await htmlInsertText(editor, "::");
    await click(".w-mail-Composer-suggestion");
    await contains(
        ".w-mail-Composer-html.weth-editor-editable:text('bluhbluh Hello! How are you?')"
    );
});

test("add an emoji after a canned response", async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "Mario",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    pyEnv["mail.canned.response"].create({
        source: "hello",
        substitution: "Hello! How are you?",
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-suggestionList");
    await contains(".w-mail-Composer-input", { value: "" });
    await insertText(".w-mail-Composer-input", "::");
    await click(".w-mail-Composer-suggestion");
    await contains(".w-mail-Composer-input", { value: "Hello! How are you? " });
    await click("button[title='Add Emojis']");
    await click(".w-Emoji:text('😊')");
    await contains(".w-mail-Composer-input", { value: "Hello! How are you? 😊" });
});

test("Canned response can be inserted from the bus", async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-input");
    await insertText(".w-mail-Composer-input", "::");
    await contains(".w-mail-NavigableList-item", { count: 0 });
    await insertText(".w-mail-Composer-input", "", { replace: true });
    pyEnv["mail.canned.response"].create({
        source: "hello",
        substitution: "Hello! How are you?",
    });
    await waitNotifications(["mail.record/insert", (payload) => payload["mail.canned.response"]]);
    await contains(".w-mail-NavigableList-item", { count: 0 });
    await insertText(".w-mail-Composer-input", "::");
    await contains(".w-mail-NavigableList-item:text('hello Hello! How are you?')");
});

test("Canned response can be updated from the bus", async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    const cannedResponseId = pyEnv["mail.canned.response"].create({
        source: "hello",
        substitution: "Hello! How are you?",
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-input");
    await insertText(".w-mail-Composer-input", "::");
    await contains(".w-mail-NavigableList-item", { count: 1 });
    await insertText(".w-mail-Composer-input", "", { replace: true });
    pyEnv["mail.canned.response"].write([cannedResponseId], {
        substitution: "Howdy! How are you?",
    });
    await waitNotifications(["mail.record/insert", (payload) => payload["mail.canned.response"]]);
    await contains(".w-mail-NavigableList-item", { count: 0 });
    await insertText(".w-mail-Composer-input", "::");
    await contains(".w-mail-NavigableList-item:text('hello Howdy! How are you?')");
});

test("Canned response can be deleted from the bus", async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    const [cannedResponseId] = pyEnv["mail.canned.response"].create([
        {
            source: "hello",
            substitution: "Hello! How are you?",
        },
        {
            source: "test",
            substitution: "test",
        },
    ]);
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "::");
    await contains(".w-mail-NavigableList-item", { count: 2 });
    await contains(".w-mail-NavigableList-item:has(:text('hello'))");
    await contains(".w-mail-NavigableList-item:has(:text('test'))");
    await insertText(".w-mail-Composer-input", "", { replace: true });
    await contains(".w-mail-NavigableList-item", { count: 0 });
    pyEnv["mail.canned.response"].unlink([cannedResponseId]);
    await waitNotifications(["mail.record/insert", (payload) => payload["mail.canned.response"]]);
    await insertText(".w-mail-Composer-input", "::");
    await contains(".w-mail-NavigableList-item", { count: 1 });
    await contains(".w-mail-NavigableList-item:has(:text('test'))");
});

test("Canned response last used changes on posting", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "Expelliarmus" });
    const cannedResponseId = pyEnv["mail.canned.response"].create({
        source: "test",
        substitution: "Test a canned response?",
    });
    let cannedResponse = pyEnv["mail.canned.response"].search_read([
        ["id", "=", cannedResponseId],
    ])[0];
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "::");
    await click(".w-mail-NavigableList-item:text('test Test a canned response?')");
    await contains(".w-mail-Composer-input", { value: "Test a canned response? " });
    expect(cannedResponse.last_used).toBeEmpty();
    await press("Enter");
    await contains(".w-mail-Message");
    cannedResponse = pyEnv["mail.canned.response"].search_read([["id", "=", cannedResponseId]])[0];
    expect(cannedResponse.last_used).not.toBeEmpty();
});

test("Tab to select of canned response suggestion works in chat window", async () => {
    // This might conflict with focusing next chat window
    const pyEnv = await startServer();
    const channelIds = pyEnv["discuss.channel"].create([{ name: "General" }, { name: "Extra" }]);
    pyEnv["mail.canned.response"].create([
        { source: "Hello", substitution: "Hello! How are you?" },
        { source: "Goodbye", substitution: "Goodbye! See you soon!" },
    ]);
    setupChatHub({ opened: channelIds });
    await start();
    await contains(".w-mail-ChatWindow", { count: 2 });
    await insertText(".w-mail-ChatWindow:eq(0) .w-mail-Composer-input", "::");
    // Assuming the suggestions are displayed in alphabetical order
    await contains(".w-mail-NavigableList-item:text('Goodbye Goodbye! See you soon!')", {
        before: [".w-mail-NavigableList-item:text('Hello Hello! How are you?')"],
    });
    await contains(".w-mail-NavigableList-active:text('Goodbye Goodbye! See you soon!')");
    await triggerHotkey("Tab");
    await contains(".w-mail-NavigableList-active:text('Hello Hello! How are you?')");
    await animationFrame();
    await triggerHotkey("Enter");
    await contains(".w-mail-ChatWindow:eq(0) .w-mail-Composer-input", {
        value: "Hello! How are you? ",
    });
});

test('[text composer] can quickly add emoji with ":" keyword', async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-input");
    await insertText(".w-mail-Composer-input", ":sweat");
    await contains(".w-mail-Composer-suggestionList .w-open");
    await contains(".w-mail-NavigableList-item:text('😅 :sweat_smile:')");
    await click(".w-mail-NavigableList-item:text('😅 :sweat_smile:')");
    await contains(".w-mail-Composer-input", { value: "😅 " });
    await contains(".w-mail-Composer-suggestionList .w-open", { count: 0 });
    // check at least 2 chars to trigger it, so that emoji substitution like :p are still easy to use
    await insertText(".w-mail-Composer-input", ":sw");
    await contains(".w-mail-Composer-suggestionList .w-open");
    await contains(".w-mail-NavigableList-item:text('😅 :sweat_smile:')");
    await insertText(".w-mail-Composer-input", ":s", { replace: true });
    await contains(".w-mail-Composer-suggestionList .w-open", { count: 0 });
});

test.tags("html composer");
test("can quickly add emoji with ':' keyword", async () => {
    const pyEnv = await startServer();
    const guestId = pyEnv["mail.guest"].create({ name: "Mario" });
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ guest_id: guestId }),
        ],
    });
    await start();
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await openDiscuss(channelId);
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, ":sweat");
    await contains(".w-we-SuggestionList");
    await click(".w-navigable:text('😅 :sweat_smile:')");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('😅')");
    await contains(".w-we-SuggestionList", { count: 0 });
    await htmlInsertText(editor, " :sw");
    await contains(".w-we-SuggestionList");
    await contains(".w-navigable:text('😅 :sweat_smile:')");
    await htmlInsertText(editor, ":s", { replace: true });
    await contains(".w-we-SuggestionList", { count: 0 });
});

test("Can dismiss mail composer with 500+ active_ids", async () => {
    // When there are more than 500 active_ids, _compute_res_ids
    // short-circuits and leaves res_ids empty for performance reasons.
    // In that case, the code must rely on active_ids and dismissing
    // the dialog must not crash.
    const pyEnv = await startServer();
    assignDialogTestEnv();
    const partnerId = pyEnv["res.partner"].create({ name: "Partner" });
    registerArchs({
        "mail.compose.message,false,form": `
            <form string="Compose Email" js_class="mail_composer_form">
                <field name="model"/>
                <field name="partner_ids"/>
                <field name="partner_cc_ids"/>
            </form>`,
    });
    await start();
    const env = getMockEnv();
    const composerId = pyEnv["mail.compose.message"].create({
        model: "res.partner",
        res_ids: "", // simulate >500 active_ids case
        partner_ids: [],
    });
    await openFormView("mail.compose.message", composerId, {
        context: { active_ids: [partnerId] },
    });
    expect(env.dialogData).not.toBeEmpty();
    // Dialog is closed without errors
    await env.dialogData.dismiss();
});

test("composer reply-to message is restored on thread change", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Marc Demo" });
    const [channelId] = pyEnv["discuss.channel"].create([
        {
            channel_member_ids: [
                Command.create({ partner_id: serverState.partnerId }),
                Command.create({ partner_id: partnerId }),
            ],
            channel_type: "channel",
            name: "General",
        },
        { channel_type: "channel", name: "Other" },
    ]);
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "Test",
        attachment_ids: [],
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-Message [title='Expand']");
    await click(".w-dropdown-item:contains('Reply')");
    await contains(".w-mail-Composer:contains('Replying to')");
    await insertText(".w-mail-Composer-input", "Hello World!");
    await click(".w-mail-NotificationItem:has(:text('Other'))");
    await contains(".w-mail-Message", { count: 0 });
    await click(".w-mail-NotificationItem:has(:text('General'))");
    await contains(".w-mail-Message");
    await contains(".w-mail-Composer:contains('Replying to')");
    const store = getService("mail.store");
    expect(
        JSON.stringify(
            await getIndexedDB("composer", store["discuss.channel"].get(channelId).composer.localId)
        )
    ).toBe(
        '{"emailAddSignature":true,"replyToMessageId":1,"composerHtml":["markup","Hello World!"],"fromFullComposer":false}'
    );
    // check IndexedDB emptied on message post
    await click(".w-mail-Composer button:enabled[aria-label='Send']");
    await click(".w-mail-Message[data-persistent]:contains(Hello World!)");
    expect(
        await getIndexedDB("composer", store["discuss.channel"].get(channelId).composer.localId)
    ).toBe(undefined);
    // check IndexedDB empty, change thread to force save in local storage if needed (debounced otherwise)
    await click(".w-mail-NotificationItem:has(:text('Other'))");
    await contains(".w-mail-Message", { count: 0 });
    await click(".w-mail-NotificationItem:has(:text('General'))");
    expect(
        await getIndexedDB("composer", store["discuss.channel"].get(channelId).composer.localId)
    ).toBe(undefined);
});

test("composer reply-to message is restored page reload", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Marc Demo" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "channel",
        name: "General",
    });
    const [messageId_1] = pyEnv["mail.message"].create([
        {
            author_id: serverState.partnerId,
            body: "Test-1",
            attachment_ids: [],
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
        },
        {
            author_id: serverState.partnerId,
            body: "Test-2",
            attachment_ids: [],
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
        },
    ]);
    // simulate composer was replying to 1st message before page reload
    // not taking last message as to not fetch last message data prematurely
    await setIndexedDB(
        "composer",
        `Composer,(mail.thread,discuss.channel AND ${channelId}) OR (undefined)`,
        { replyToMessageId: messageId_1, text: "some text" }
    );
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer:contains('Replying to')");
});

test.tags("html composer");
test("html composer: basic rendering", async () => {
    await startServer();
    await start();
    const composerService = getService("mail.composer");
    await openFormView("res.partner", serverState.partnerId);
    await click("button:text('Send message')");
    await contains("textarea.w-mail-Composer-input");
    await contains(".w-mail-Composer-html.weth-editor-editable", { count: 0 });
    await insertText(".w-mail-Composer-input", "Hello World!");
    composerService.setHtmlComposer();
    await contains("textarea.w-mail-Composer-input", { count: 0 });
    await contains(".w-mail-Composer-html.weth-editor-editable:text('Hello World!')");
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, " Test");
    composerService.setTextComposer();
    await contains("textarea.w-mail-Composer-input", { value: "Hello World! Test" });
    await contains(".w-mail-Composer-html.weth-editor-editable", { count: 0 });
});

test.tags("html composer");
test("html composer: send a message in a chatter", async () => {
    await startServer();
    await start();
    const composerService = getService("mail.composer");
    await openFormView("res.partner", serverState.partnerId);
    await click("button:text('Send message')");
    composerService.setHtmlComposer();
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "Hello");
    await click(".w-mail-Composer-send:enabled");
    await click(".w-mail-Message[data-persistent]:contains(Hello)");
});

test.tags("html composer");
test("html composer: send a message with styling", async () => {
    await startServer();
    await start();
    const composerService = getService("mail.composer");
    await openFormView("res.partner", serverState.partnerId);
    await click("button:text('Send message')");
    composerService.setHtmlComposer();
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "Hello");
    await tripleClick(editor.editable.querySelector("div.w-paragraph"));
    await press("Control+b");
    await click(".w-mail-Composer-send:enabled");
    await contains(".w-mail-Message[data-persistent]:has(strong:text('Hello'))");
});

test("[text composer] send a message end with a space clears the composer", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "channel",
        name: "General",
    });
    await start();
    await openDiscuss(channelId);
    await insertText("textarea.w-mail-Composer-input", "Hello ");
    await contains("textarea.w-mail-Composer-input", { value: "Hello ", count: 1 });
    await press("Enter");
    await contains("textarea.w-mail-Composer-input", { value: "Hello ", count: 0 });
});

test.tags("html composer");
test("send a message end with a space clears the composer", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "channel",
        name: "General",
    });
    await start();
    await openDiscuss(channelId);
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "Hello ");
    await contains(`.w-mail-Composer-html.weth-editor-editable:text('Hello')`);
    await press("Enter");
    await contains(`.w-mail-Composer-html.weth-editor-editable:text('Hello')`, { count: 0 });
});

test.tags("html composer");
test("parse link correctly in html composer", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "channel",
        name: "General",
    });
    await start();
    await openDiscuss(channelId);
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "www.google.com");
    await contains(`.w-mail-Composer-html.weth-editor-editable:text('www.google.com')`);
    await contains(`.w-mail-Composer-html.weth-editor-editable a:text('www.google.com')`, {
        count: 0,
    });
    await htmlInsertText(editor, " ");
    await contains(
        `.w-mail-Composer-html.weth-editor-editable a[target='_blank']:text('www.google.com')`
    );
    await press("Enter");
    await contains(`.w-mail-Composer-html.weth-editor-editable:text('www.google.com')`, {
        count: 0,
    });
    await pasteText(editor, "www.baidu.com");
    await contains(
        `.w-mail-Composer-html.weth-editor-editable a[target='_blank']:text('www.baidu.com')`
    );
});

test.tags("html composer");
test("pasted code keeps its line breaks and indentation, pasted text its formatting", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    getService("mail.composer").setHtmlComposer();
    await openDiscuss(channelId);
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    pasteHtml(editor, "<pre>if (a) {\n    b();<br>\tc();<br>}</pre><p>Hello <b>world</b></p>");
    await waitFor(".w-mail-Composer-html b:text('world')");
    expect(".w-mail-Composer-html").toHaveInnerHTML(
        `<div class="o-paragraph">if (a) {<br>&nbsp; &nbsp; b();<br>&nbsp; &nbsp; c();<br>}</div><p>Hello <b>world</b></p>`
    );
});

test.tags("html composer");
test("pasted code copied with its white-space keeps its line breaks", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    getService("mail.composer").setHtmlComposer();
    await openDiscuss(channelId);
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    pasteHtml(
        editor,
        `<span style="white-space: pre-wrap;">const a = 1;</span><span style="white-space: pre-wrap;">\n</span><span style="white-space: pre-wrap;">const b = 2;</span>`
    );
    await waitFor(".w-mail-Composer-html :contains('const b = 2;')");
    expect(".w-mail-Composer-html").toHaveInnerHTML(
        `<div class="o-paragraph"><span>const a = 1;<br>const b = 2;</span></div>`
    );
});

test.tags("html composer");
test("mention insertion adds FEFF markers for safe cursor placement", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "channel",
        name: "General",
    });
    await start();
    await openDiscuss(channelId);
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    await htmlInsertText(editor, "@admin");
    await click(".w-mail-NavigableList-item:text('Mitchell Admin')");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('@Mitchell Admin')");

    const mention = editor.editable.querySelector("a.o_mail_redirect");
    expect(mention?.previousSibling?.textContent).toBe("\uFEFF");
    expect(mention?.nextSibling?.textContent).toBe("\uFEFF");
});

test.tags("html composer");
test("mentions can be correctly selected with ctrl+A and deleted", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "channel",
        name: "General",
    });
    await start();
    await openDiscuss(channelId);
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    // partner beginning of the message
    await htmlInsertText(editor, "@admin");
    await click(".w-mail-NavigableList-item:text('Mitchell Admin')");
    await contains(`.w-mail-Composer-html.weth-editor-editable:text('@Mitchell Admin')`);
    await htmlInsertText(editor, "Hello");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('@Mitchell Admin Hello')");
    await focus(editor.editable);
    await press("Control+a");
    await press("Backspace");
    await contains(editor.editable, { textContent: "" });

    //partner in the middle of the message
    await htmlInsertText(editor, "Hello @admin");
    await click(".w-mail-NavigableList-item:text('Mitchell Admin')");
    await contains(`.w-mail-Composer-html.weth-editor-editable:text('Hello @Mitchell Admin')`);
    await htmlInsertText(editor, "nice to meet you!");
    await contains(
        ".w-mail-Composer-html.weth-editor-editable:text('Hello @Mitchell Admin nice to meet you!')"
    );
    await focus(editor.editable);
    await press("Control+a");
    await press("Backspace");
    await contains(editor.editable, { textContent: "" });

    //partner at the end of the message
    await htmlInsertText(editor, "Hello @admin");
    await click(".w-mail-NavigableList-item:text('Mitchell Admin')");
    await contains(`.w-mail-Composer-html.weth-editor-editable:text('Hello @Mitchell Admin')`);
    await focus(editor.editable);
    await press("Control+a");
    await press("Backspace");
    await contains(editor.editable, { textContent: "" });
});

test.tags("html composer");
test("mentions can be correctly cut with ctrl+A and ctrl+X", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "channel",
        name: "General",
    });
    await start();
    await openDiscuss(channelId);
    const composerService = getService("mail.composer");
    composerService.setHtmlComposer();
    await focus(".w-mail-Composer-html.weth-editor-editable");
    const editor = {
        document,
        editable: document.querySelector(".w-mail-Composer-html.weth-editor-editable"),
    };
    // partner beginning of the message
    await htmlInsertText(editor, "@admin");
    await click(".w-mail-NavigableList-item:text('Mitchell Admin')");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('@Mitchell Admin')");
    await htmlInsertText(editor, "Hello");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('@Mitchell Admin Hello')");
    await focus(editor.editable);
    await press("Control+a");
    cut(editor);
    await contains(editor.editable, { textContent: "" });

    // partner in the middle of the message
    await htmlInsertText(editor, "Hello @admin");
    await click(".w-mail-NavigableList-item:text('Mitchell Admin')");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('Hello @Mitchell Admin')");
    await htmlInsertText(editor, "nice to meet you!");
    await contains(
        ".w-mail-Composer-html.weth-editor-editable:text('Hello @Mitchell Admin nice to meet you!')"
    );
    await focus(editor.editable);
    await press("Control+a");
    cut(editor);
    await contains(editor.editable, { textContent: "" });

    // partner at the end of the message
    await htmlInsertText(editor, "Hello @admin");
    await click(".w-mail-NavigableList-item:text('Mitchell Admin')");
    await contains(".w-mail-Composer-html.weth-editor-editable:text('Hello @Mitchell Admin')");
    await focus(editor.editable);
    await press("Control+a");
    cut(editor);
    await contains(editor.editable, { textContent: "" });
});

test("composer should not restore sent content when unmounted during pending post", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Partner" });
    await start();
    const store = getService("mail.store");
    const thread = await store["mail.thread"].getOrFetch({ model: "res.partner", id: partnerId });
    await mountWithCleanup(Composer, { props: { composer: thread.composer, type: "message" } });
    await insertText(".w-mail-Composer-input", "One");
    await advanceTime(5000);
    expect(JSON.stringify(await getIndexedDB("composer", thread.composer.localId))).toBe(
        '{"emailAddSignature":true,"composerHtml":["markup","One"],"fromFullComposer":false}'
    );
    await insertText(".w-mail-Composer-input", "Two");
    const { promise: postPromise, resolve: resolvePost } = Promise.withResolvers();
    onRpcBefore("/mail/message/post", () => postPromise);
    await click("button[aria-label='Send']");
    destroyApp();
    expect(await getIndexedDB("composer", thread.composer.localId)).toBe(undefined);
    resolvePost();
});

test("Post message trims outer whitespaces and newlines", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "channel",
        name: "General",
    });
    onRpcBefore("/mail/message/post", (args) => {
        expect.step(args.post_data.body);
    });
    await start();
    await openDiscuss(channelId);
    await insertText(
        ".w-mail-Composer-input",
        "   \n\n   \n     I am  the    night\n\n\n\nI am  Batman     \n   \n\n    "
    );
    await click(".w-mail-Composer button:enabled[aria-label='Send']");
    await expect.waitForSteps([
        "I am \u00a0the \u00a0 \u00a0night<br><br><br><br>I am \u00a0Batman",
    ]);
    await contains(".w-mail-Message[data-persistent]");
    expect(".w-mail-Message-richBody").toHaveInnerHTML(
        "I am &nbsp;the &nbsp; &nbsp;night<br><br><br><br>I am &nbsp;Batman"
    );
    await click(".w-mail-Message [title='Expand']");
    await click(".w-dropdown-item:text('Edit')");
    await contains(".w-mail-Message .w-mail-Composer-input", {
        value: "I am  the    night\n\n\n\nI am  Batman",
    });
});

test("discard stale mention when replacing it with a longer partner mention", async () => {
    const pyEnv = await startServer();
    const johnId = pyEnv["res.partner"].create({
        email: "john@weth.com.br",
        name: "John",
    });
    const johnDoeId = pyEnv["res.partner"].create({
        email: "john.doe@weth.com.br",
        name: "John Doe",
    });
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: johnId }),
            Command.create({ partner_id: johnDoeId }),
        ],
    });

    await start();
    await openDiscuss(channelId);

    await insertText(".w-mail-Composer-input", "@John");
    await click(".w-mail-Composer-suggestion strong", { text: "John" });
    await contains(".w-mail-Composer-input", { value: "@John " });
    // Continue typing to replace the initially selected mention.
    await press("Backspace");
    await insertText(".w-mail-Composer-input", " Doe");
    await click(".w-mail-Composer-suggestion strong", { text: "John Doe" });
    await contains(".w-mail-Composer-input", { value: "@John Doe " });

    await press("Enter");

    await contains(".w-mail-Message a", { text: "@John Doe" });
});

test("mention partner whose name ends with a space at the end of the message", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({
        email: "zara@weth.com.br",
        name: "Zara Space ",
    });
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "@Zara");
    await click(".w-mail-Composer-suggestion strong", { text: "Zara Space" });
    await press("Enter");
    await contains(".w-mail-Message a.o_mail_redirect", { text: "@Zara Space" });
});
