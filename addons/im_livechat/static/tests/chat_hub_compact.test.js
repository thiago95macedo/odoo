import { Command, serverState } from "@web/../tests/web_test_helpers";
import { click, contains } from "@mail/../tests/mail_test_helpers_contains";
import { defineLivechatModels } from "@im_livechat/../tests/livechat_test_helpers";
import { setupChatHub, start, startServer } from "@mail/../tests/mail_test_helpers";
import { withGuest } from "@mail/../tests/mock_server/mail_mock_server";
import { describe, test } from "@weth/hoot";
import { rpc } from "@web/core/network/rpc";

describe.current.tags("desktop");

defineLivechatModels();
test("Do not open chat windows automatically when chat hub is compact", async () => {
    const pyEnv = await startServer();
    setupChatHub({ folded: [pyEnv["discuss.channel"].create({ name: "General" })] });
    const guestId = pyEnv["mail.guest"].create({ name: "Visitor" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId, livechat_member_type: "agent" }),
            Command.create({ guest_id: guestId, livechat_member_type: "visitor" }),
        ],
        channel_type: "livechat",
        create_uid: serverState.publicUserId,
    });
    await start();
    await click("button[title='Chat Options']");
    await click(".w-dropdown-item", { text: "Hide all conversations" });
    await contains(".w-mail-ChatHub-bubbleBtn [data-icon='forum']");
    await withGuest(guestId, () =>
        rpc("/mail/message/post", {
            post_data: {
                body: "I need help!",
                message_type: "comment",
                subtype_xmlid: "mail.mt_comment",
            },
            thread_id: channelId,
            thread_model: "discuss.channel",
        })
    );
    await contains(".w-mail-ChatHub-bubbleBtn .badge", { text: "1" });
    await click("button.w-mail-ChatHub-bubbleBtn");
    await contains(".w-mail-ChatBubble[name=Visitor] .badge", { text: "1" });
    await contains(".w-mail-ChatWindow", { count: 0, text: "Visitor" });
    await click(".w-mail-ChatBubble[name=Visitor] .w-mail-ChatHub-bubbleBtn");
    await contains(".w-mail-ChatWindow", { text: "Visitor" });
});
