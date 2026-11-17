import {
    click,
    contains,
    defineMailModels,
    hover,
    insertText,
    onRpcBefore,
    openDiscuss,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";
import { describe, expect, test } from "@weth/hoot";
import { Command, serverState } from "@web/../tests/web_test_helpers";
import { press } from "@weth/hoot-dom";

import { rpc } from "@web/core/network/rpc";

describe.current.tags("desktop");
defineMailModels();

test("auto layout with link preview list", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        og_description: "test description",
        og_image: "https://c.tenor.com/B_zYdea4l-4AAAAC/yay-minions.gif",
        og_mimetype: "image/gif",
        og_title: "Yay Minions GIF - Yay Minions Happiness - Discover & Share GIFs",
        og_type: "video.other",
        source_url: "https://tenor.com/view/yay-minions-happiness-happy-excited-gif-15324023",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message .w-mail-LinkPreviewList");
});

test("auto layout with link preview as gif", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        og_description: "test description",
        og_image: "https://c.tenor.com/B_zYdea4l-4AAAAC/yay-minions.gif",
        og_mimetype: "image/gif",
        og_title: "Yay Minions GIF - Yay Minions Happiness - Discover & Share GIFs",
        og_type: "video.other",
        source_url: "https://tenor.com/view/yay-minions-happiness-happy-excited-gif-15324023",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-LinkPreviewImage");
});

test("simplest card layout", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        og_description: "Description",
        og_title: "Article title",
        og_type: "article",
        source_url: "https://www.weth.com.br",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-LinkPreviewCard");
    await contains(".w-mail-LinkPreviewCard p:text('Article title')");
    await contains(".w-mail-LinkPreviewCard p:text('Description')");
});

test("simplest card layout with image", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        og_description: "Description",
        og_image: "https://c.tenor.com/B_zYdea4l-4AAAAC/yay-minions.gif",
        og_title: "Article title",
        og_type: "article",
        source_url: "https://www.weth.com.br",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-LinkPreviewCard");
    await contains(".w-mail-LinkPreviewCard p:text('Article title')");
    await contains(".w-mail-LinkPreviewCard p:text('Description')");
    await contains(".w-mail-LinkPreviewCard img");
});

test("Link preview video layout", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        og_description: "Description",
        og_image: "https://c.tenor.com/B_zYdea4l-4AAAAC/yay-minions.gif",
        og_title: "video title",
        og_type: "video.other",
        source_url: "https://www.weth.com.br",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-LinkPreviewVideo");
    await contains(".w-mail-LinkPreviewVideo h6:text('video title')");
    await contains(".w-mail-LinkPreviewVideo p:text('Description')");
    await contains(".w-mail-LinkPreviewVideo-overlay");
});

test("Link preview image layout", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        image_mimetype: "image/jpg",
        source_url:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Siberischer_tiger_de_edit02.jpg/290px-Siberischer_tiger_de_edit02.jpg",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-LinkPreviewImage");
});

test("Remove link preview Gif", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        og_description: "test description",
        og_image: "https://c.tenor.com/B_zYdea4l-4AAAAC/yay-minions.gif",
        og_mimetype: "image/gif",
        og_title: "Yay Minions GIF - Yay Minions Happiness - Discover & Share GIFs",
        og_type: "video.other",
        source_url: "https://tenor.com/view/yay-minions-happiness-happy-excited-gif-15324023",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-LinkPreviewImage button[aria-label='Remove']");
    await contains("p:text('Do you really want to delete this preview?')");
    await contains(".modal .w-mail-LinkPreviewImage button[aria-label='Remove']", { count: 0 });
    await click(".modal-footer button:text('Delete')");
    await contains(".w-mail-LinkPreviewImage", { count: 0 });
});

test("Remove link preview card", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        og_description: "Description",
        og_title: "Article title",
        og_type: "article",
        source_url: "https://www.weth.com.br",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-LinkPreviewCard button[aria-label='Remove']");
    await contains("p:text('Do you really want to delete this preview?')");
    await contains(".modal .w-mail-LinkPreviewCard button[aria-label='Remove']", { count: 0 });
    await click(".modal-footer button:text('Delete')");
    await contains(".w-mail-LinkPreviewCard", { count: 0 });
});

test("Remove link preview video", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        og_description: "Description",
        og_image: "https://c.tenor.com/B_zYdea4l-4AAAAC/yay-minions.gif",
        og_title: "video title",
        og_type: "video.other",
        source_url: "https://www.weth.com.br",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-LinkPreviewVideo button[aria-label='Remove']");
    await contains("p:text('Do you really want to delete this preview?')");
    await contains(".modal .w-mail-LinkPreviewVideo button[aria-label='Remove']", { count: 0 });
    await click(".modal-footer button:text('Delete')");
    await contains(".w-mail-LinkPreviewVideo", { count: 0 });
});

test("Remove link preview image", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        image_mimetype: "image/jpg",
        source_url:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Siberischer_tiger_de_edit02.jpg/290px-Siberischer_tiger_de_edit02.jpg",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-LinkPreviewImage button[aria-label='Remove']");
    await contains("p:text('Do you really want to delete this preview?')");
    await contains(".modal .w-mail-LinkPreviewImage button[aria-label='Remove']", { count: 0 });
    await click(".modal-footer button:text('Delete')");
    await contains(".w-mail-LinkPreviewImage", { count: 0 });
});

test("No crash on receiving link preview of non-known message", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        image_mimetype: "image/jpg",
        source_url:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Siberischer_tiger_de_edit02.jpg/290px-Siberischer_tiger_de_edit02.jpg",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    const messageId = pyEnv["mail.message"].create({
        body: "https://make-link-preview.com",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    const messageLinkPreviewId = pyEnv["mail.message.link.preview"].create({
        message_id: messageId,
        link_preview_id: linkPreviewId,
    });
    await start();
    await openDiscuss();
    rpc("/mail/link_preview", { message_id: messageId });
    rpc("/mail/link_preview/hide", { message_link_preview_ids: [messageLinkPreviewId] });
    expect(true).toBe(true, { message: "no assertions" });
});

test("Squash the message and the link preview when the link preview is an image and the link is the only text in the message", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        image_mimetype: "image/jpg",
        source_url:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Siberischer_tiger_de_edit02.jpg/290px-Siberischer_tiger_de_edit02.jpg",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "<a href='linkPreviewLink'>http://linkPreview</a>",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-LinkPreviewImage");
    await contains(".w-mail-Message-bubble", { count: 0 });
});

test("Link preview and message should not be squashed when the link preview is not an image", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        og_description: "Description",
        og_title: "Article title",
        og_type: "article",
        source_url: "https://www.weth.com.br",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "<a href='linkPreviewLink'>http://linkPreview</a>",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message-bubble");
});

test("Link preview and message should not be squashed when there is more than the link in the message", async () => {
    const pyEnv = await startServer();
    const linkPreviewId = pyEnv["mail.link.preview"].create({
        image_mimetype: "image/jpg",
        source_url:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Siberischer_tiger_de_edit02.jpg/290px-Siberischer_tiger_de_edit02.jpg",
    });
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "<a href='linkPreviewLink'>http://linkPreview</a> not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId })],
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-Message-bubble");
});

test("Sending message with link preview URL should show a link preview card", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "https://make-link-preview.com");
    await press("Enter");
    await contains(".w-mail-LinkPreviewCard");
});

test("Delete all link previews at once", async () => {
    const pyEnv = await startServer();
    const [linkPreviewId_1, linkPreviewId_2] = pyEnv["mail.link.preview"].create([
        {
            og_description: "Description",
            og_title: "Article title 1",
            og_type: "article",
            source_url: "https://www.weth.com.br",
        },
        {
            image_mimetype: "image/jpg",
            source_url:
                "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Siberischer_tiger_de_edit02.jpg/290px-Siberischer_tiger_de_edit02.jpg",
        },
    ]);
    const channelId = pyEnv["discuss.channel"].create({ name: "wololo" });
    pyEnv["mail.message"].create({
        body: "not empty",
        message_type: "comment",
        model: "discuss.channel",
        res_id: channelId,
        message_link_preview_ids: [
            Command.create({ link_preview_id: linkPreviewId_1 }),
            Command.create({ link_preview_id: linkPreviewId_2 }),
        ],
    });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-LinkPreviewCard button[aria-label='Remove']");
    await click(".modal-footer button:text('Delete all previews')");
    await contains(".w-mail-LinkPreviewCard", { count: 0 });
    await contains(".w-mail-LinkPreviewImage", { count: 0 });
});

test("link preview request is only made when message contains URL", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "Sales" });
    onRpcBefore("/mail/link_preview", () => expect.step("/mail/link_preview"));
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "Hello, this message does not contain any link");
    await press("Enter");
    await contains(".w-mail-Message:has(:text('Hello, this message does not contain any link'))");
    await expect.waitForSteps([]);
    await insertText(".w-mail-Composer-input", "https://www.weth.com.br");
    await press("Enter");
    await expect.waitForSteps(["/mail/link_preview"]);
});

test("youtube and gdrive videos URL are embed", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const [linkPreviewId_1, linkPreviewId_2] = pyEnv["mail.link.preview"].create([
        {
            og_title: "vokoscreenNG-2024-08-22_13-56-37.mkv",
            og_type: "article",
            source_url: "https://drive.google.com/file/d/195a8fSNxwmkfs9sDS7OCB2nX03iFr21P/view",
        },
        {
            og_title: "Cinematic",
            og_type: "video",
            source_url: "https://www.youtube.com/watch?v=9bZkp7q19f0",
        },
    ]);
    pyEnv["mail.message"].create([
        {
            body: "GDrive video preview",
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
            message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId_1 })],
        },
        {
            body: "YT video preview",
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
            message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId_2 })],
        },
    ]);
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-LinkPreviewVideo[data-provider=google-drive] [data-icon='play_arrow']");
    await contains(
        "iframe[data-src='https://drive.google.com/file/d/195a8fSNxwmkfs9sDS7OCB2nX03iFr21P/preview']",
        { parent: [".w-mail-LinkPreviewVideo[data-provider=google-drive]"] }
    );
    await click(".w-mail-LinkPreviewVideo[data-provider=youtube] [data-icon='play_arrow']");
    await contains("iframe[data-src='https://www.youtube.com/embed/9bZkp7q19f0?autoplay=1']", {
        parent: [".w-mail-LinkPreviewVideo[data-provider=youtube]"],
    });
});

test("Internal user can't delete others preview", async () => {
    const pyEnv = await startServer();
    const [linkPreviewId_1, linkPreviewId_2] = pyEnv["mail.link.preview"].create([
        {
            og_description: "Description",
            og_title: "Article title 1",
            og_type: "article",
            source_url: "https://www.weth.com.br/",
        },
        {
            og_description: "Description",
            og_title: "Article title 2",
            og_type: "article",
            source_url: "https://example.com",
        },
    ]);
    const partnerId = pyEnv["res.partner"].create({ name: "Test User" });
    const userId = pyEnv["res.users"].create({
        partner_id: partnerId,
        login: "testUser",
        password: "testUser",
    });
    const channelId = pyEnv["discuss.channel"].create({
        name: "wololo",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId }),
            Command.create({ partner_id: partnerId }),
        ],
    });
    pyEnv["mail.message"].create([
        {
            body: "msg-1",
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
            author_id: serverState.partnerId,
            message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId_1 })],
        },
        {
            body: "msg-2",
            message_type: "comment",
            model: "discuss.channel",
            res_id: channelId,
            author_id: partnerId,
            message_link_preview_ids: [Command.create({ link_preview_id: linkPreviewId_2 })],
        },
    ]);
    await start({ authenticateAs: pyEnv["res.users"].read(userId)[0] });
    await openDiscuss(channelId);
    await hover(".w-mail-Message:contains('msg-2') .w-mail-LinkPreviewCard");
    await contains(
        ".w-mail-Message:contains('msg-2') .w-mail-LinkPreviewCard button[aria-label='Remove']"
    );
    await hover(".w-mail-Message:contains('msg-1') .w-mail-LinkPreviewCard");
    await contains(
        ".w-mail-Message:contains('msg-1') .w-mail-LinkPreviewCard button[aria-label='Remove']",
        { count: 0 }
    );
});
