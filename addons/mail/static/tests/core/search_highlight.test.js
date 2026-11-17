import { HIGHLIGHT_CLASS, searchHighlight } from "@mail/core/common/message_search_hook";
import {
    SIZES,
    click,
    contains,
    defineMailModels,
    insertText,
    openDiscuss,
    openFormView,
    patchUiSize,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";

import { describe, expect, test } from "@weth/hoot";
import { markup } from "@weth/owl";

import { serverState } from "@web/../tests/web_test_helpers";

describe.current.tags("desktop");
defineMailModels();

test("Search highlight", async () => {
    const testCases = [
        {
            input: markup`test weth`,
            output: `test <span class="${HIGHLIGHT_CLASS}">weth</span>`,
            searchTerm: "weth",
        },
        {
            input: markup`<a href="https://www.weth.com.br">https://www.weth.com.br</a>`,
            output: `<a href="https://www.weth.com.br">https://www.<span class="${HIGHLIGHT_CLASS}">weth</span>.com</a>`,
            searchTerm: "weth",
        },
        {
            input: '<a href="https://www.weth.com.br">https://www.weth.com.br</a>',
            output: `&lt;a href=&quot;https://www.<span class="${HIGHLIGHT_CLASS}">weth</span>.com&quot;&gt;https://www.<span class="${HIGHLIGHT_CLASS}">weth</span>.com&lt;/a&gt;`,
            searchTerm: "weth",
        },
        {
            input: markup`<a href="https://www.weth.com.br">WETH</a>`,
            output: `<a href="https://www.weth.com.br"><span class="${HIGHLIGHT_CLASS}">WETH</span></a>`,
            searchTerm: "weth",
        },
        {
            input: markup`<a href="https://www.weth.com.br">WETH</a> WETH is a free software`,
            output: `<a href="https://www.weth.com.br"><span class="${HIGHLIGHT_CLASS}">WETH</span></a> <span class="${HIGHLIGHT_CLASS}">WETH</span> is a free software`,
            searchTerm: "weth",
        },
        {
            input: markup`weth is a free software`,
            output: `<span class="${HIGHLIGHT_CLASS}">weth</span> is a free software`,
            searchTerm: "weth",
        },
        {
            input: markup`software WETH is a free`,
            output: `software <span class="${HIGHLIGHT_CLASS}">WETH</span> is a free`,
            searchTerm: "weth",
        },
        {
            input: markup`<ul>
                <li>WETH</li>
                <li><a href="https://weth.com.br">WETH ERP</a> Best ERP</li>
            </ul>`,
            output: `<ul>
                <li><span class="${HIGHLIGHT_CLASS}">WETH</span></li>
                <li><a href="https://weth.com.br"><span class="${HIGHLIGHT_CLASS}">WETH</span> ERP</a> Best ERP</li>
            </ul>`,
            searchTerm: "weth",
        },
        {
            input: markup`test <strong>WETH</strong> test`,
            output: `<span class="${HIGHLIGHT_CLASS}">test</span> <strong><span class="${HIGHLIGHT_CLASS}">WETH</span></strong> <span class="${HIGHLIGHT_CLASS}">test</span>`,
            searchTerm: "weth test",
        },
        {
            input: markup`test <br> test`,
            output: `<span class="${HIGHLIGHT_CLASS}">test</span> <br> <span class="${HIGHLIGHT_CLASS}">test</span>`,
            searchTerm: "weth test",
        },
        {
            input: markup`<strong>test</strong> test`,
            output: `<strong><span class="${HIGHLIGHT_CLASS}">test</span></strong> <span class="${HIGHLIGHT_CLASS}">test</span>`,
            searchTerm: "test",
        },
        {
            input: markup`<strong>a</strong> test`,
            output: `<strong><span class="${HIGHLIGHT_CLASS}">a</span></strong> <span class="${HIGHLIGHT_CLASS}">test</span>`,
            searchTerm: "a test",
        },
        {
            input: markup`&amp;amp;`,
            output: `<span class="${HIGHLIGHT_CLASS}">&amp;amp;</span>`,
            searchTerm: "&amp;",
        },
        {
            input: markup`&amp;amp;`,
            output: `<span class="${HIGHLIGHT_CLASS}">&amp;</span>amp;`,
            searchTerm: "&",
        },
        {
            input: markup`<strong>test</strong> hello`,
            output: `<strong><span class="${HIGHLIGHT_CLASS}">test</span></strong> <span class="${HIGHLIGHT_CLASS}">hello</span>`,
            searchTerm: "test hello",
        },
        {
            input: markup`<p>&lt;strong&gt;test&lt;/strong&gt; hello</p>`,
            output: `<p>&lt;strong&gt;<span class="${HIGHLIGHT_CLASS}">test</span>&lt;/strong&gt; <span class="${HIGHLIGHT_CLASS}">hello</span></p>`,
            searchTerm: "test hello",
        },
        {
            input: markup`test weth`,
            output: `t<span class="${HIGHLIGHT_CLASS}">e</span>st o<span class="${HIGHLIGHT_CLASS}">d</span>oo`,
            searchTerm: "e               d",
        },
    ];
    for (const { input, output, searchTerm } of testCases) {
        expect(searchHighlight(searchTerm, input).toString()).toBe(output);
    }
});

test("Display highlighted search in chatter", async () => {
    patchUiSize({ size: SIZES.XXL });
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Groot" });
    pyEnv["mail.message"].create({
        author_id: partnerId,
        body: "I am Groot",
        model: "res.partner",
        res_id: partnerId,
    });
    await start();
    await openFormView("res.partner", partnerId);
    await click("[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    await insertText(".w-mail-SearchInput input", "Groot");
    await contains(
        `.w-mail-SearchMessageResult .w-mail-Message-author .${HIGHLIGHT_CLASS}:text('Groot')`
    );
    await contains(
        `.w-mail-SearchMessageResult .w-mail-Message-body .${HIGHLIGHT_CLASS}:text('Groot')`
    );
});

test("Display multiple highlighted search in chatter", async () => {
    patchUiSize({ size: SIZES.XXL });
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "John Doe" });
    pyEnv["mail.message"].create({
        body: "not test empty",
        model: "res.partner",
        res_id: partnerId,
    });
    await start();
    await openFormView("res.partner", partnerId);
    await click("[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    await insertText(".w-mail-SearchInput input", "not empty");
    await contains(`.w-mail-SearchMessageResult .w-mail-Message span.${HIGHLIGHT_CLASS}`, {
        count: 2,
    });
});

test("Display highlighted search in Discuss", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "not empty",
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
    await insertText(".w-mail-SearchMessageInput .w-mail-SearchInput input", "empty");
    await contains(`.w-mail-SearchMessagesPanel .w-mail-Message span.${HIGHLIGHT_CLASS}`);
});

test("Display multiple highlighted search in Discuss", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: "not prout empty",
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
    await insertText(".w-mail-SearchMessageInput .w-mail-SearchInput input", "not empty");
    await contains(`.w-mail-SearchMessagesPanel .w-mail-Message span.${HIGHLIGHT_CLASS}`, {
        count: 2,
    });
});

test("Search update keeps embedded code block rendering in Discuss", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        author_id: serverState.partnerId,
        body: `<p>prefix text</p><pre data-embedded="readonlySyntaxHighlighting" data-language-id="python">print('hello')</pre><p>suffix text</p>`,
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
    await insertText(".w-mail-SearchMessageInput .w-mail-SearchInput input", "prefix");
    await contains(
        `.w-mail-SearchMessagesPanel .w-mail-Message span.${HIGHLIGHT_CLASS}:text('prefix')`
    );
    await contains(".w-mail-SearchMessagesPanel pre[data-embedded='readonlySyntaxHighlighting']");
    await insertText(".w-mail-SearchMessageInput .w-mail-SearchInput input", " suffix");
    await contains(
        `.w-mail-SearchMessagesPanel .w-mail-Message span.${HIGHLIGHT_CLASS}:text('suffix')`
    );
    await contains(".w-mail-SearchMessagesPanel pre[data-embedded='readonlySyntaxHighlighting']");
});

test("Display highlighted with escaped character must ignore them", async () => {
    patchUiSize({ size: SIZES.XXL });
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "John Doe" });
    pyEnv["mail.message"].create({
        body: "<p>&lt;strong&gt;test&lt;/strong&gt; hello</p>",
        model: "res.partner",
        res_id: partnerId,
    });
    await start();
    await openFormView("res.partner", partnerId);
    await click("[title='Search Messages']");
    await contains(".w-mail-SearchMessageInput");
    await insertText(".w-mail-SearchInput input", "test hello");
    await contains(`.w-mail-SearchMessageResult .w-mail-Message span.${HIGHLIGHT_CLASS}`, {
        count: 2,
    });
    await contains(`.w-mail-Message-body:has(:text("<strong>test</strong> hello"))`);
});
