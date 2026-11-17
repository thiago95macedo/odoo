import {
    SIZES,
    click,
    contains,
    defineMailModels,
    insertText,
    openDiscuss,
    openFormView,
    openMessagingMenu,
    patchUiSize,
    scroll,
    start,
    startServer,
    MENU_ACTIVE_IDS,
} from "@mail/../tests/mail_test_helpers";
import { describe, expect, test } from "@weth/hoot";
import { getService, onRpc, patchWithCleanup, preloadBundle } from "@web/../tests/web_test_helpers";

import { GifPicker } from "@mail/discuss/gif_picker/common/gif_picker";
import { animationFrame } from "@weth/hoot-dom";

describe.current.tags("desktop");
defineMailModels();
preloadBundle("web.assets_emoji");

let gifId = 0;
const gifFactory = (count = 1, options = {}) => {
    const gifs = [];
    for (let i = 0; i < count; i++) {
        gifs.push({
            id: `${gifId}`,
            title: "",
            media_formats: {
                tinygif: {
                    url: options.url || "https://media.tenor.com/np49Y1vrJO8AAAAM/crying-cry.gif",
                    duration: 0,
                    preview: "",
                    dims: [220, 190],
                    size: 1007885,
                },
            },
            created: 1654414453.782169,
            content_description: "Cry GIF",
            itemurl: "https://tenor.com/view/cry-gif-25866484",
            url: "https://tenor.com/bUHdw.gif",
            tags: ["cry"],
            flags: [],
            hasaudio: false,
        });
        gifId++;
    }
    return gifs;
};

const rpc = {
    search: {
        results: gifFactory(2),
        next: "CAgQpIGj_8WN_gIaHgoKAD-_xMQ20dMU_xIQ1MVHUnSAQxC98Y6VAAAAADAI",
    },
    categories: {
        locale: "en",
        tags: [
            {
                searchterm: "cry",
                path: "/v2/search?q=cry&locale=en&component=categories&contentfilter=low",
                image: "https://media.tenor.com/6uIlQAHIkNoAAAAM/cry.gif",
                name: "#cry",
            },
            {
                searchterm: "yes",
                path: "/v2/search?q=yes&locale=en&component=categories&contentfilter=low",
                image: "https://media.tenor.com/UVmpVqlpVhQAAAAM/yess-yes.gif",
                name: "#yes",
            },
            {
                searchterm: "no",
                path: "/v2/search?q=no&locale=en&component=categories&contentfilter=low",
                image: "https://media.tenor.com/aeswYw-86k8AAAAM/no-nooo.gif",
                name: "#no",
            },
            {
                searchterm: "lol",
                path: "/v2/search?q=lol&locale=en&component=categories&contentfilter=low",
                image: "https://media.tenor.com/BiseY2UXovAAAAAM/lmfao-laughing.gif",
                name: "#lol",
            },
        ],
    },
};

test("composer should display a GIF button", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await contains("button[title='Send GIF']");
});

test("Composer GIF button should open the GIF picker (discuss app)", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Send GIF']");
    await contains(".w-discuss-GifPicker");
    await click(".w-mail-DiscussContent-header"); // ensure the picker reopens correctly
    await contains(".w-discuss-GifPicker", { count: 0 });
    await click("button[title='Send GIF']");
    await contains(".w-discuss-GifPicker");
});

test("Composer GIF button should open the GIF picker (chat window)", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem:contains('General')");
    await click(".w-mail-ChatWindow .w-mail-Composer [title='More Actions']");
    await click(".w-dropdown-item:contains('Send GIF')");
    await contains(".w-discuss-GifPicker");
});

test("Not loading of GIF categories when feature is not available", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    let isFeatureEnabled = true;
    onRpc("/discuss/gif/categories", () => {
        expect.step("/discuss/gif/categories");
        if (isFeatureEnabled) {
            return rpc.categories;
        }
    });
    await start();
    await openDiscuss(channelId);
    const store = getService("mail.store");
    store.hasGifPickerFeature = false;
    isFeatureEnabled = false;
    await click("button[title='Send GIF']");
    await contains(".w-discuss-GifPicker");
    await animationFrame();
    expect.verifySteps([]); // no "/discuss/gif/categories"
    await click("button[title='Send GIF']");
    await contains(".w-discuss-GifPicker", { count: 0 });
    store.hasGifPickerFeature = true;
    isFeatureEnabled = true;
    await click("button[title='Send GIF']");
    await contains(".w-discuss-GifPicker");
    await expect.waitForSteps(["/discuss/gif/categories"]);
});

test("Searching for a GIF", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    onRpc("/discuss/gif/search", () => rpc.search);
    await start();
    await openDiscuss(channelId);
    await click("button[title='Send GIF']");
    await insertText("input[placeholder='Search Klipy']", "search");
    await contains("i[aria-label='back']");
    await contains(".w-discuss-Gif", { count: 2 });
});

test("Open a GIF category trigger the search for the category", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    onRpc("/discuss/gif/categories", () => rpc.categories);
    onRpc("/discuss/gif/search", () => rpc.search);
    await start();
    await openDiscuss(channelId);
    await click("button[title='Send GIF']");
    await click("img[data-src='https://media.tenor.com/6uIlQAHIkNoAAAAM/cry.gif']");
    await contains(".w-discuss-Gif", { count: 2 });
    await contains("input[placeholder='Search Klipy']", { value: "cry" });
});

test("Can have GIF categories with same name", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    onRpc("/discuss/gif/categories", () => ({
        locale: "en",
        tags: [
            {
                searchterm: "duplicate",
                path: "/v2/search?q=duplicate&locale=en&component=categories&contentfilter=low",
                image: "https://media.tenor.com/BiseY2UXovAAAAAM/duplicate.gif",
                name: "#duplicate",
            },
            {
                searchterm: "duplicate",
                path: "/v2/search?q=duplicate&locale=en&component=categories&contentfilter=low",
                image: "https://media.tenor.com/BiseY2UXovAAAAAM/duplicate.gif",
                name: "#duplicate",
            },
        ],
    }));
    onRpc("/discuss/gif/search", () => rpc.search);
    await start();
    await openDiscuss(channelId);
    await click("button[title='Send GIF']");
    await contains("img[data-src='https://media.tenor.com/BiseY2UXovAAAAAM/duplicate.gif']", {
        count: 2,
    });
});

test("Reopen GIF category list when going back", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    onRpc("/discuss/gif/categories", () => rpc.categories);
    onRpc("/discuss/gif/search", () => rpc.search);
    await start();
    await openDiscuss(channelId);
    await click("button[title='Send GIF']");
    await click("img[data-src='https://media.tenor.com/6uIlQAHIkNoAAAAM/cry.gif']");
    await click("i[aria-label='back']");
    await contains(".w-discuss-GifPicker div[aria-label='list']");
});

test("Add GIF to favorite", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    onRpc("/discuss/gif/categories", () => rpc.categories);
    onRpc("/discuss/gif/search", () => rpc.search);
    await start();
    await openDiscuss(channelId);
    await click("button[title='Send GIF']");
    await click("img[data-src='https://media.tenor.com/6uIlQAHIkNoAAAAM/cry.gif']");
    await click(":nth-child(1 of div) > .w-discuss-Gif [data-icon='star']");
    await contains(".w-discuss-Gif [data-icon='star'].oi-filled");
    await click("i[aria-label='back']");
    await click(".w-discuss-GifPicker div[aria-label='list-item']:text('Favorites')");
    await contains(".w-discuss-Gif");
});

test("Chatter should not have the GIF button", async () => {
    const pyEnv = await startServer();
    await start();
    const partnerId = pyEnv["res.partner"].create({ name: "John Doe" });
    await openFormView("res.partner", partnerId);
    await click("button:text('Log note')");
    await contains("button[title='Send GIF']", { count: 0 });
});

test("Composer GIF button should open the GIF picker keyboard in footer", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    patchUiSize({ size: SIZES.SM });
    await start();
    await openDiscuss(channelId);
    await click("button[title='More Actions']");
    await click(".dropdown-item:contains('Send GIF')");
    await contains(".w-mail-Composer-footer .w-discuss-GifPicker");
});

test("Searching for a GIF with a failling RPC should display an error", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    onRpc("/discuss/gif/categories", () => rpc.categories);
    onRpc("/discuss/gif/search", () => {
        throw new Error("Rpc failed");
    });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Send GIF']");
    await insertText("input[placeholder='Search Klipy']", "search");
    await contains(".w-discuss-GifPicker-error");
});

test("Scrolling at the bottom should trigger the search to load more gif, even after visiting the favorite.", async () => {
    patchWithCleanup(GifPicker.prototype, {
        get style() {
            return "width: 200px;height: 200px;background: #000";
        },
    });
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    onRpc("/discuss/gif/categories", () => rpc.categories);
    onRpc("/discuss/gif/search", () => {
        const _rpc = rpc.search;
        _rpc.results = gifFactory(4);
        return _rpc;
    });
    await start();
    await openDiscuss(channelId);
    await click("button[title='Send GIF']");
    // gif picker quires extra delay before click (to give time to load initial state)
    await contains(".w-discuss-GifPicker");
    await click(".w-discuss-GifPicker div[aria-label='list-item']:text('Favorites')");
    await click("i[aria-label='back']");
    await click("img[data-src='https://media.tenor.com/6uIlQAHIkNoAAAAM/cry.gif']");
    await contains(".w-discuss-Gif", { count: 4 });
    await scroll(".w-discuss-GifPicker-content", "bottom");
    await contains(".w-discuss-Gif", { count: 8 });
});

test("Pause GIF when thread is not focused", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    onRpc("/discuss/gif/categories", () => rpc.categories);
    onRpc("/discuss/gif/search", () => rpc.search);
    await start();
    await openDiscuss(channelId);
    await click("button[title='Send GIF']");
    await click("img[data-src='https://media.tenor.com/6uIlQAHIkNoAAAAM/cry.gif']");
    await click("img[data-src='https://media.tenor.com/np49Y1vrJO8AAAAM/crying-cry.gif']:eq(0)");
    await contains(".w-mail-LinkPreviewImage img:not([data-paused])");
    await click("button[title='Send GIF']");
    await contains(".w-mail-LinkPreviewImage img[data-paused]");
    await click(".w-mail-Composer-input");
    await contains(".w-mail-LinkPreviewImage img:not([data-paused])");
});

test("Show help when no favorite GIF", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    onRpc("/discuss/gif/categories", () => rpc.categories);
    await start();
    await openDiscuss(channelId);
    await click("button[title='Send GIF']");
    // gif picker quires extra delay before click (to give time to load initial state)
    await contains(".w-discuss-GifPicker");
    await click(".w-discuss-GifPicker div[aria-label='list-item']:text('Favorites')");
    await contains("span:text('So uhh... maybe go favorite some GIFs?')");
});

test("Clicking GIF preview does not raise an error", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "" });
    onRpc("/discuss/gif/categories", () => rpc.categories);
    onRpc("/discuss/gif/search", () => rpc.search);
    await start();
    await openDiscuss(channelId);
    await click("button[title='Send GIF']");
    await click("img[data-src='https://media.tenor.com/6uIlQAHIkNoAAAAM/cry.gif']");
    await click("img[data-src='https://media.tenor.com/np49Y1vrJO8AAAAM/crying-cry.gif']:eq(0)");
    await click(".w-mail-LinkPreviewImage img");
    await contains(".w-mail-Message");
});
