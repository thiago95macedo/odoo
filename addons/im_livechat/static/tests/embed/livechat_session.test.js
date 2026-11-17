import { waitUntilSubscribe } from "@bus/../tests/bus_test_helpers";
import {
    defineLivechatModels,
    loadDefaultEmbedConfig,
    postLivechatMessage,
} from "@im_livechat/../tests/livechat_test_helpers";
import {
    assertChatHub,
    click,
    contains,
    focus,
    onRpcBefore,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";
import { describe, expect, test } from "@weth/hoot";
import { advanceTime } from "@weth/hoot-mock";
import { getService, serverState, withUser } from "@web/../tests/web_test_helpers";

import { LivechatButton } from "@im_livechat/embed/common/livechat_button";
import { queryFirst } from "@weth/hoot-dom";
import { rpc } from "@web/core/network/rpc";

describe.current.tags("desktop");
defineLivechatModels();

test("Session is reset after failing to persist the channel", async () => {
    await startServer();
    await loadDefaultEmbedConfig();
    onRpcBefore("/im_livechat/get_session", (args) => {
        if (args.persisted) {
            return false;
        }
    });
    await start({ authenticateAs: false, waitUntilSubscribe: false });
    await click(".w-livechat-LivechatButton");
    await postLivechatMessage("Hello World!");
    await contains(".o_notification", {
        text: "No available collaborator, please try again later.",
    });
    await contains(".w-livechat-LivechatButton");
    await advanceTime(LivechatButton.DEBOUNCE_DELAY + 10);
    await click(".w-livechat-LivechatButton");
    await contains(".w-mail-ChatWindow");
});

test("Fold state is saved", async () => {
    await startServer();
    await loadDefaultEmbedConfig();
    await start({ authenticateAs: false, waitUntilSubscribe: false });
    await click(".w-livechat-LivechatButton");
    await contains(".w-mail-Thread");
    const subscribed = waitUntilSubscribe();
    await postLivechatMessage("Hello World!");
    await subscribed;
    await contains(".w-mail-Thread:not([data-transient])");
    assertChatHub({ opened: [1] });
    await click(".w-mail-ChatWindow-header");
    await contains(".w-mail-Thread", { count: 0 });
    assertChatHub({ folded: [1] });
    await click(".w-mail-ChatBubble");
    assertChatHub({ opened: [1] });
});

test.tags("focus required");
test("Seen message is saved on the server", async () => {
    const pyEnv = await startServer();
    await loadDefaultEmbedConfig();
    const userId = serverState.userId;
    await start({ authenticateAs: false, waitUntilSubscribe: false });
    await click(".w-livechat-LivechatButton");
    await contains(".w-mail-Thread");
    const subscribed = waitUntilSubscribe();
    await postLivechatMessage("Hello, I need help!");
    await subscribed;
    await contains(".w-mail-Message", { text: "Hello, I need help!" });
    const initialSeenMessageId = [
        ...getService("mail.store")["discuss.channel"].records.values(),
    ].at(-1).self_member_id.seen_message_id?.id;
    queryFirst(".w-mail-Composer-input").blur();
    await withUser(userId, () =>
        rpc("/mail/message/post", {
            post_data: {
                body: "Hello World!",
                message_type: "comment",
                subtype_xmlid: "mail.mt_comment",
            },
            thread_id: [...getService("mail.store")["mail.thread"].records.values()].at(-1).id,
            thread_model: "discuss.channel",
        })
    );
    await contains(".w-mail-Thread-newMessage");
    await contains(".w-mail-ChatWindow-counter", { text: "1" });
    await focus(".w-mail-Composer-input");
    await contains(".w-mail-ChatWindow-counter", { count: 0 });
    const guestId = pyEnv.cookie.get("dgid");
    const [member] = pyEnv["discuss.channel.member"].search_read([
        ["guest_id", "=", guestId],
        [
            "channel_id",
            "=",
            [...getService("mail.store")["mail.thread"].records.values()].at(-1).id,
        ],
    ]);
    expect(initialSeenMessageId).not.toBe(member.seen_message_id[0]);
    expect(
        [...getService("mail.store")["discuss.channel"].records.values()].at(-1).self_member_id
            .seen_message_id.id
    ).toBe(member.seen_message_id[0]);
});
