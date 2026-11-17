import {
    click,
    contains,
    defineMailModels,
    insertText,
    openDiscuss,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";

import { describe, test } from "@weth/hoot";
import { press } from "@weth/hoot-dom";

defineMailModels();
describe.current.tags("desktop");

test("Group name is based on channel members when name is not set", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users"].create(
        ["Alice", "Bob", "Eve", "John", "Sam"].map((name) => ({
            name,
            partner_id: pyEnv["res.partner"].create({ name }),
        }))
    );
    const channelId = pyEnv["discuss.channel"].create({ channel_type: "group" });
    await start();
    await openDiscuss(channelId);
    await contains(".w-mail-DiscussContent-threadName[title='Mitchell Admin']");
    await click("button[title='Add People']");
    await click(".w-discuss-ChannelInvitation-selectable:has(:text('Alice'))");
    await click("button:text('Invite to Group Chat')");
    await contains(".w-mail-DiscussContent-threadName[title='Mitchell Admin and Alice']");
    await click("button[title='Add People']");
    await click(".w-discuss-ChannelInvitation-selectable:has(:text('Bob'))");
    await click("button:text('Invite to Group Chat')");
    await contains(".w-mail-DiscussContent-threadName[title='Mitchell Admin, Alice, and Bob']");
    await click("button[title='Add People']");
    await click(".w-discuss-ChannelInvitation-selectable:has(:text('Eve'))");
    await click("button:text('Invite to Group Chat')");
    await contains(
        ".w-mail-DiscussContent-threadName[title='Mitchell Admin, Alice, Bob, and 1 other']"
    );
    await click("button[title='Add People']");
    await click(".w-discuss-ChannelInvitation-selectable:has(:text('John'))");
    await click("button:text('Invite to Group Chat')");
    await contains(
        ".w-mail-DiscussContent-threadName[title='Mitchell Admin, Alice, Bob, and 2 others']"
    );
    await click(".w-mail-DiscussContent-threadName");
    await insertText(".w-mail-DiscussContent-threadName.w-focused", "Custom name", {
        replace: true,
    });
    await contains(".w-mail-DiscussContent-threadName[title='Custom name']");
    await press("Enter");
    // Ensure that after setting the name, members are not taken into account for the group name.
    await click("button[title='Add People']");
    await click(".w-discuss-ChannelInvitation-selectable:has(:text('Sam'))");
    await click("button:text('Invite to Group Chat')");
    await contains(".o_mail_notification:text('invited Sam to the channel')");
    await contains(".w-mail-DiscussContent-threadName[title='Custom name']");
});
