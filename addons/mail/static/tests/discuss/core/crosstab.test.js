import {
    click,
    contains,
    defineMailModels,
    openDiscuss,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";
import { describe, test } from "@weth/hoot";
import { Command, getService, serverState, withUser } from "@web/../tests/web_test_helpers";

describe.current.tags("desktop");
defineMailModels();

test("Add member to channel", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const userId = pyEnv["res.users"].create({ name: "Harry" });
    pyEnv["res.partner"].create({ name: "Harry", user_ids: [userId] });
    await start();
    await openDiscuss(channelId);
    await contains(".w-discuss-ChannelMemberList"); // wait for auto-open of this panel
    await contains(".w-discuss-ChannelMember:text('Mitchell Admin')");
    await click("[title='Add People']");
    await click(".w-discuss-ChannelInvitation-selectable:has(:text('Harry'))");
    await click(".w-discuss-ChannelInvitation button:text('Invite'):enabled");
    await contains(".w-discuss-ChannelInvitation", { count: 0 });
    await contains(".w-discuss-ChannelMember:text('Harry')");
});

test("Remove member from channel", async () => {
    const pyEnv = await startServer();
    const userId = pyEnv["res.users"].create({ name: "Harry" });
    const partnerId = pyEnv["res.partner"].create({
        name: "Harry",
        user_ids: [userId],
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
    await contains(".w-discuss-ChannelMember:text('Harry')");
    withUser(userId, () =>
        getService("orm").call("discuss.channel", "action_unfollow", [channelId])
    );
    await contains(".w-discuss-ChannelMember:text('Harry')", { count: 0 });
});
