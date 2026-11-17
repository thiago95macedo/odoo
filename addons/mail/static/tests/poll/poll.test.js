import {
    click,
    contains,
    defineMailModels,
    hover,
    openDiscuss,
    start,
    startServer,
    triggerEvents,
} from "@mail/../tests/mail_test_helpers";
import { advanceTime, describe, mockTouch, test } from "@weth/hoot";

import { Command } from "@web/../tests/web_test_helpers";

describe.current.tags("desktop");
defineMailModels();

test("can add, replace, and remove emojis to a poll option", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-Composer button[title='More Actions']");
    await click(".w-dropdown-item:text('Create Poll')");
    await contains(".modal-header:text('Create Poll')");
    await click(".w-mail-CreatePollOptionDialog:first [data-icon='sentiment_satisfied']");
    await click(".w-Emoji:text('😀')");
    await click(".w-mail-CreatePollOptionDialog:first span:text('😀')");
    await click(".w-dropdown-item:text('Replace Emoji')");
    await click(".w-Emoji:text('😁')");
    await click(".w-mail-CreatePollOptionDialog:first span:text('😁')");
    await click(".w-dropdown-item:text('Remove Emoji')");
    await contains(".w-mail-CreatePollOptionDialog:first [data-icon='sentiment_satisfied']");
});

test("poll creation should be disabled during message editing", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["mail.message"].create({
        body: "Hello world",
        model: "discuss.channel",
        res_id: channelId,
        message_type: "comment",
    });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-Composer button[title='More Actions']");
    await contains(".w-dropdown-item:text('Create Poll')");
    await click(".w-mail-Message [title='Expand']");
    await click(".w-dropdown-item:text('Edit')");
    await click(".w-mail-Message .w-mail-Composer button[title='More Actions']");
    await contains(".w-dropdown-item:text('Attach Files')");
    await contains(".w-dropdown-item:text('Create Poll')", { count: 0 });
});

test.tags("focus required");
test("autofocus question on poll opening and user-added options", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-Composer button[title='More Actions']");
    await click(".w-dropdown-item:text('Create Poll')");
    await contains(".modal-header:text('Create Poll')");
    await contains("input[name='poll_question']:focus");
    await click("button:text('Add another option')");
    await contains(".w-mail-CreatePollOptionDialog:eq(2) input:focus");
});

test("full label of a truncated poll option is shown in a tooltip", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const messageId = pyEnv["mail.message"].create({
        body: "",
        model: "discuss.channel",
        res_id: channelId,
        message_type: "comment",
    });
    const longLabel = "A very long poll option ".repeat(12).trim();
    pyEnv["mail.poll"].create({
        option_ids: [
            Command.create({ option_label: longLabel }),
            Command.create({ option_label: "Short" }),
        ],
        poll_question: "What do you think?",
        start_message_id: messageId,
    });
    await start();
    await openDiscuss(channelId);
    await hover(`.w-mail-PollOption span:text('${longLabel}')`);
    await contains(`.w-tooltip:text('${longLabel}')`);
    await hover(".w-mail-PollOption span:text('Short')");
    await advanceTime(1000);
    await contains(".w-tooltip", { count: 0 });
    await click(".w-mail-Poll a:text('View results')");
    await contains(".w-mail-PollOption div > span.text-truncate", { count: 2 });
    await contains(".w-tooltip", { count: 0 });
    await hover(`.w-mail-PollOption span:text('${longLabel}')`);
    await contains(`.w-tooltip:text('${longLabel}')`);
    await click(".w-mail-Poll a:text('0 votes')");
    await hover(`.w-mail-PollVotesPanel span:text('${longLabel}')`);
    await contains(`.w-tooltip:text('${longLabel}')`);
});

test("full label of a truncated winning option is shown in a tooltip", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const [startMessageId, endMessageId] = pyEnv["mail.message"].create(
        [1, 2].map(() => ({
            body: "",
            model: "discuss.channel",
            res_id: channelId,
            message_type: "comment",
        }))
    );
    const longLabel = "A very long poll option ".repeat(12).trim();
    const optionId = pyEnv["mail.poll.option"].create({ option_label: longLabel });
    pyEnv["mail.poll"].create({
        end_message_id: endMessageId,
        option_ids: [optionId],
        poll_question: "What do you think?",
        start_message_id: startMessageId,
        winning_option_id: optionId,
    });
    await start();
    await openDiscuss(channelId);
    await hover(`.w-mail-PollResult p:text('${longLabel}')`);
    await contains(`.w-tooltip:text('${longLabel}')`);
});

test("tap on the info button of a truncated poll option shows its full label", async () => {
    mockTouch(true);
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const messageId = pyEnv["mail.message"].create({
        body: "",
        model: "discuss.channel",
        res_id: channelId,
        message_type: "comment",
    });
    const longLabel = "A very long poll option ".repeat(12).trim();
    pyEnv["mail.poll"].create({
        option_ids: [
            Command.create({ option_label: longLabel }),
            Command.create({ option_label: "Short" }),
        ],
        poll_question: "What do you think?",
        start_message_id: messageId,
    });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-PollOption i.oi[data-icon='info']:count(1)");
    await triggerEvents(`.w-mail-PollOption i[data-tooltip='${longLabel}']`, [
        "touchstart",
        "touchend",
        "click",
    ]);
    await contains(`.w-tooltip:text('${longLabel}')`);
    await contains(".w-mail-PollOption input:not(:checked)", { count: 2 });
    await click(`.w-mail-PollOption span:text('${longLabel}')`);
    await contains(".w-mail-PollOption input:checked");
});
