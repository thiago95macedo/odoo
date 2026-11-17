import {
    defineParams,
    patchWithCleanup,
    preloadBundle,
    serverState,
} from "@web/../tests/web_test_helpers";

import {
    click,
    contains,
    defineMailModels,
    insertText,
    openDiscuss,
    scroll,
    start,
    startServer,
    triggerHotkey,
} from "@mail/../tests/mail_test_helpers";
import { describe, expect, getFixture, queryFirst, test } from "@weth/hoot";
import { queryAllTexts } from "@weth/hoot-dom";

import { signal } from "@weth/owl";
import { emojiLoader } from "@web/core/emoji_picker/emoji_loader";

describe.current.tags("desktop");
defineMailModels();
preloadBundle("web.assets_emoji");

test("emoji picker correctly handles translations with special characters", async () => {
    // Reset emoji loader to reload translations *for* the current test
    patchWithCleanup(emojiLoader, {
        _categories: signal.Array([]),
        _emojis: signal.Array([]),
        _loadingPromise: null,
        _map: null,
    });
    defineParams({
        translations: {
            "Japanese “here” button": `Bouton "ici" japonais`,
            "heavy dollar sign": `Symbole du dollar\nlourd`,
        },
    });
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await insertText(".w-EmojiPicker-search input", "ici");
    await contains(`.w-Emoji[title='Bouton "ici" japonais']`);
    await insertText(".w-EmojiPicker-search input", "dollar", { replace: true });
    await contains(`.w-Emoji[title*='Symbole du dollar']`);
});

test("search emoji from keywords", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await insertText(".w-EmojiPicker-search input", "mexican");
    await contains(".w-Emoji:text('🌮')");
    await insertText(".w-EmojiPicker-search input", "9", { replace: true });
    await contains(".w-Emoji:eq(0):text('🕘')");
    await contains(".w-Emoji:eq(1):text('🕤')");
    await contains(".w-Emoji:eq(2):text('9️⃣')");
});

test("search emoji from keywords should be case insensitive", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await insertText(".w-EmojiPicker-search input", "ok");
    await contains(".w-Emoji:text('🆗')"); // all search terms are uppercase OK
});

test("search emoji from keywords with special regex character", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await insertText(".w-EmojiPicker-search input", "(blood");
    await contains(".w-Emoji:text('🆎')");
});

test("updating search emoji should scroll top", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-content", { scroll: 0 });
    await scroll(".w-EmojiPicker-content", 150);
    await insertText(".w-EmojiPicker-search input", "m");
    await contains(".w-EmojiPicker-content", { scroll: 0 });
});

test("Press Escape in emoji picker closes the emoji picker", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    triggerHotkey("Escape");
    await contains(".w-EmojiPicker", { count: 0 });
});

test("Basic keyboard navigation", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Composer-input:focus"); // as to ensure no race condition with auto-focus of emoji picker
    await click("button[title='Add Emojis']");
    await contains(".w-Emoji[data-index='0'].w-active");
    // detect amount of emojis per row for navigation
    const emojis = Array.from(
        getFixture().querySelectorAll(".w-EmojiPicker-category[data-category='1'] ~ .w-Emoji")
    );
    const baseOffset = emojis[0].offsetTop;
    const breakIndex = emojis.findIndex((item) => item.offsetTop > baseOffset);
    const EMOJI_PER_ROW = breakIndex === -1 ? emojis.length : breakIndex;
    triggerHotkey("ArrowRight");
    await contains(".w-EmojiPicker-content .w-Emoji[data-index='1'].w-active");
    triggerHotkey("ArrowDown");
    await contains(`.w-EmojiPicker-content .w-Emoji[data-index='${EMOJI_PER_ROW + 1}'].w-active`);
    triggerHotkey("ArrowLeft");
    await contains(`.w-EmojiPicker-content .w-Emoji[data-index='${EMOJI_PER_ROW}'].w-active`);
    triggerHotkey("ArrowUp");
    await contains(".w-EmojiPicker-content .w-Emoji[data-index='0'].w-active");
    const { codepoints } = queryFirst(
        ".w-EmojiPicker-content .w-Emoji[data-index='0'].w-active"
    ).dataset;
    triggerHotkey("Enter");
    await contains(".w-EmojiPicker", { count: 0 });
    await contains(".w-mail-Composer-input", { value: codepoints });
});

test("recent category (basic)", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-navbar [title='Frequently used']", { count: 0 });
    await click(".w-EmojiPicker-content .w-Emoji:text('😀')");
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-navbar [title='Frequently used']");
    await contains(".w-Emoji:text('😀')", {
        after: ["small", { textContent: "Frequently used" }],
        before: ["small", { textContent: "Smileys & Emotion" }],
    });
});

test("search emojis prioritize frequently used emojis", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-navbar [title='Frequently used']", { count: 0 });
    await click(".w-EmojiPicker-content .w-Emoji:text('🤥')");
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-navbar [title='Frequently used']");
    await insertText(".w-EmojiPicker-search input", "lie");
    await contains(".w-EmojiPicker-sectionIcon", { count: 0 }); // await search performed
    await contains(".w-EmojiPicker-content .w-Emoji:eq(0):text('🤥')");
});

test("search matches only frequently used emojis", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-navbar [title='Frequently used']", { count: 0 });
    await click(".w-EmojiPicker-content .w-Emoji:text('🥦')");
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-navbar [title='Frequently used']");
    await insertText(".w-EmojiPicker-search input", "brocoli");
    await contains(".w-EmojiPicker-sectionIcon", { count: 0 }); // await search performed
    await contains(".w-EmojiPicker-content .w-Emoji:eq(0):text('🥦')");
    await contains(".w-EmojiPicker-content .w-Emoji", { count: 1 });
    await contains(".w-EmojiPicker-content:has(:text('No emojis match your search'))", {
        count: 0,
    });
    await insertText(".w-EmojiPicker-search input", "2");
    await contains(".w-EmojiPicker-content:has(:text('No emojis match your search'))");
});

test("emoji usage amount orders frequent emojis", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await click(".w-EmojiPicker-content .w-Emoji:text('😀')");
    await click("button[title='Add Emojis']");
    await click(".w-EmojiPicker-content .w-Emoji:text('👽')");
    await click("button[title='Add Emojis']");
    await click(".w-EmojiPicker-content .w-Emoji:text('👽')");
    await click("button[title='Add Emojis']");
    await contains(".w-Emoji:text('👽')", {
        after: ["small", { textContent: "Frequently used" }],
        before: [
            ".w-Emoji:text('😀')",
            {
                after: ["small", { textContent: "Frequently used" }],
                before: ["small", { textContent: "Smileys & Emotion" }],
            },
        ],
    });
});

test("first category should be highlighted by default", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-navbar :nth-child(1 of .w-Emoji).w-active");
});

test("selecting an emoji while holding down the Shift key prevents the emoji picker from closing", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await click(".w-EmojiPicker-content .w-Emoji:text('👺')", { shiftKey: true });
    await contains(".w-EmojiPicker-navbar [title='Smileys & Emotion']");
    await contains(".w-EmojiPicker");
    await contains(".w-mail-Composer-input", { value: "👺" });
});

test("shortcodes shown in emoji title in message", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    pyEnv["mail.message"].create({
        res_id: channelId,
        model: "discuss.channel",
        body: "💑😇",
        author_id: serverState.partnerId,
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message:has(:text('💑😇')");
    await contains(".w-mail-Message span[title=':couple_with_heart:']:text('💑')");
    await contains(".w-mail-Message span[title=':innocent: :halo:']:text('😇')");
});

test("Emoji picker shows failure to load emojis", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    // Simulate failure to load emojis
    patchWithCleanup(emojiLoader, {
        _emojis: signal.Array([]),
    });
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker:text('😵‍💫 Failed to load emojis...')");
});

test("Frequently used category only appears when the emoji picker is reopened", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await click(".w-EmojiPicker-content .w-Emoji:text('😀')", { shiftKey: true });
    await contains(".w-mail-Composer-input", { value: "😀" });
    await click(".w-EmojiPicker-content .w-Emoji:text('😝')", { shiftKey: true });
    await contains(".w-mail-Composer-input", { value: "😀😝" });
    await contains(".w-EmojiPicker-section", { count: 8 });
    expect(queryAllTexts(".w-EmojiPicker-section small")).toEqual([
        "SMILEYS & EMOTION",
        "PEOPLE & BODY",
        "ANIMALS & NATURE",
        "FOOD & DRINK",
        "TRAVEL & PLACES",
        "ACTIVITIES",
        "OBJECTS",
        "SYMBOLS",
    ]);
    triggerHotkey("Escape");
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-section", { count: 9 });
    expect(queryAllTexts(".w-EmojiPicker-section small")).toEqual([
        "FREQUENTLY USED",
        "SMILEYS & EMOTION",
        "PEOPLE & BODY",
        "ANIMALS & NATURE",
        "FOOD & DRINK",
        "TRAVEL & PLACES",
        "ACTIVITIES",
        "OBJECTS",
        "SYMBOLS",
    ]);
});

test("clear search icon appears with a search term and clears it on click", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Add Emojis']");
    await contains(".w-EmojiPicker-search input");
    await insertText(".w-EmojiPicker-search input", "ok");
    await contains("[data-icon='cancel']");
    await click("[data-icon='cancel']");
    await contains(".w-EmojiPicker-search input", { value: "" });
    await contains("[data-icon='cancel']", { count: 0 });
});
