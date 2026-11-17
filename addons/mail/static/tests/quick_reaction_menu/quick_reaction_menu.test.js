import {
    click,
    contains,
    defineMailModels,
    insertText,
    openDiscuss,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";
import { QuickReactionMenu } from "@mail/core/common/quick_reaction_menu";
import { describe, expect, test } from "@weth/hoot";
import { animationFrame, hover, leave, press, waitFor } from "@weth/hoot-dom";

describe.current.tags("desktop");
defineMailModels();

test("can toggle reaction from quick reaction menu", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Hello world!");
    await press("Enter");
    await click("[title='Add a Reaction']");
    await click(".w-mail-QuickReactionMenu button:text('👍')");
    await contains(".w-mail-MessageReaction:text('👍 1')");
    await contains(".w-mail-QuickReactionMenu", { count: 0 });
    await click(".w-mail-Message-actions [title='Add a Reaction']");
    await click(".w-mail-QuickReactionMenu button:text('👍')");
    await contains(".w-mail-MessageReaction:text('👍 1')", { count: 0 });
    await contains(".w-mail-QuickReactionMenu", { count: 0 });
});

test("toggle emoji picker from quick reaction menu", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Hello world!");
    await press("Enter");
    await click("[title='Add a Reaction']");
    await click(".w-mail-QuickReactionMenu [title='Toggle Emoji Picker']");
    await contains(".w-EmojiPicker");
    await click(".w-mail-QuickReactionMenu [title='Toggle Emoji Picker']");
    await contains(".w-EmojiPicker", { count: 0 });
});

test("show default emojis when no frequent emojis are available", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Hello world!");
    await press("Enter");
    await click("[title='Add a Reaction']");
    await contains(".w-mail-QuickReactionMenu-emoji", {
        count: QuickReactionMenu.DEFAULT_EMOJIS.length,
    });
    for (const emoji of QuickReactionMenu.DEFAULT_EMOJIS) {
        await contains(".w-mail-QuickReactionMenu-emoji:text('" + emoji + "')");
    }
    await click(".w-mail-QuickReactionMenu [title='Toggle Emoji Picker']");
    await click(".w-Emoji:text('🤢')");
    await click(".w-mail-Message-actions [title='Add a Reaction']");
    await contains(
        ".w-mail-QuickReactionMenu-emoji:text('" + QuickReactionMenu.DEFAULT_EMOJIS.at(-1) + "')",
        {
            count: 0,
        }
    );
    await contains(".w-mail-QuickReactionMenu-emoji:text('🤢')");
});

test("navigate quick reaction menu using tab key", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Hello world!");
    await press("Enter");
    await click("[title='Add a Reaction']");
    for (const emoji of QuickReactionMenu.DEFAULT_EMOJIS) {
        await contains(".w-mail-QuickReactionMenu-emoji:focus:text('" + emoji + "')");
        await press("Tab");
    }
    await contains(".w-mail-QuickReactionMenu-emojiPicker:focus");
});

test("navigate quick reaction menu using arrow keys", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Hello world!");
    await press("Enter");
    await click("[title='Add a Reaction']");
    for (const emoji of QuickReactionMenu.DEFAULT_EMOJIS) {
        await contains(".w-mail-QuickReactionMenu-emoji:focus:text('" + emoji + "')");
        await press("ArrowRight");
    }
    await contains(".w-mail-QuickReactionMenu-emojiPicker:focus");
    await press("ArrowLeft");
    for (const emoji of [...QuickReactionMenu.DEFAULT_EMOJIS].reverse()) {
        await contains(".w-mail-QuickReactionMenu-emoji:focus:text('" + emoji + "')");
        await press("ArrowLeft");
    }
    await contains(".w-mail-QuickReactionMenu-emojiPicker:focus");
});

test("hovered emoji stays highlighted and is used on enter", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        body: "Hello world!",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    await openDiscuss(channelId);
    await click("[title='Add a Reaction']");
    const [firstEmoji, , thirdEmoji] = QuickReactionMenu.DEFAULT_EMOJIS;
    await contains(`.w-mail-QuickReactionMenu-emoji:focus:text(${firstEmoji})`);
    await hover(`.w-mail-QuickReactionMenu-emoji:text(${thirdEmoji})`);
    await leave();
    await contains(`.w-mail-QuickReactionMenu-emoji:focus:text(${firstEmoji})`);
    expect(
        await waitFor(`.w-mail-QuickReactionMenu-emoji:text(${thirdEmoji}):count(1)`)
    ).toHaveStyle({
        outlineStyle: "solid",
    });
    expect(
        await waitFor(`.w-mail-QuickReactionMenu-emoji:text(${firstEmoji}):count(1)`)
    ).toHaveStyle({
        boxShadow: "none",
        outlineStyle: "none",
    });
    await press("Enter");
    await contains(`.w-mail-MessageReaction:text(${thirdEmoji} 1)`);
});

test("can quick search emoji from quick reaction", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Hello world!");
    await press("Enter");
    await click("[title='Add a Reaction']");
    await contains(".w-mail-QuickReactionMenu");
    await press("b");
    await contains(".w-EmojiPicker");
    await contains(".w-EmojiPicker-search input:value('b')");
    for (const ch of [..."roccoli"]) {
        await press(ch);
    }
    await contains(".w-EmojiPicker-search input:value('broccoli')");
    await animationFrame();
    await press("Enter");
    await contains(".w-mail-MessageReaction:text('🥦 1')");
});

test("shift-clicking on an emoji keeps the emoji picker open", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Hello world!");
    await press("Enter");
    await click("[title='Add a Reaction']");
    const defaultEmoji = QuickReactionMenu.DEFAULT_EMOJIS[0];
    await click(`.w-mail-QuickReactionMenu-emoji:text(${defaultEmoji})`, { shiftKey: true });
    await contains(`.w-mail-MessageReaction:text(${defaultEmoji} 1)`);
    await contains(".w-mail-QuickReactionMenu");
    await click(`.w-mail-QuickReactionMenu-emoji:text(${defaultEmoji})`);
    await contains(`.w-mail-MessageReaction:text(${defaultEmoji} 1)`, { count: 0 });
    await contains(".w-mail-QuickReactionMenu", { count: 0 });
    await click("[title='Add a Reaction']");
    await click(".w-mail-QuickReactionMenu-emojiPicker");
    await click(".w-EmojiPicker-content .w-Emoji:text(👺)", { shiftKey: true });
    await contains(".w-mail-MessageReaction:text(👺 1)");
    await contains(".w-EmojiPicker");
    await click(".w-EmojiPicker-content .w-Emoji:text(👺)");
    await contains(".w-mail-MessageReaction:text(👺 1)", { count: 0 });
    await contains(".w-EmojiPicker", { count: 0 });
    await contains(".w-mail-QuickReactionMenu", { count: 0 });
});

test.tags("focus required");
test("return focus to thread composer on close", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Hello world!");
    await press("Enter");
    await contains(".w-mail-Composer-input:focus");
    await click("[title='Add a Reaction']");
    await contains(".w-mail-QuickReactionMenu-emoji:focus:text('👍')");
    await press("Enter");
    await contains(".w-mail-MessageReaction:text('👍 1')");
    await contains(".w-mail-Composer-input:focus");
});

test.tags("focus required");
test("return focus to message edition composer on close", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Hello world!");
    await press("Enter");
    await contains(".w-mail-Composer-input", { value: "" });
    await insertText(".w-mail-Composer-input", "Goodbye world!!");
    await press("Enter");
    await click(".w-mail-Message:last [title='Expand']");
    await click(".w-dropdown-item:text('Edit')");
    await contains(".w-mail-Message .w-mail-Composer-input:focus");
    await click("[title='Add a Reaction']");
    await contains(".w-mail-QuickReactionMenu-emoji:focus:text('👍')");
    await press("Enter");
    await contains(".w-mail-MessageReaction:text('👍 1')");
    await contains(".w-mail-Message .w-mail-Composer-input:focus");
});
