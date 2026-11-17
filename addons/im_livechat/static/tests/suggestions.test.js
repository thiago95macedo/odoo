import { describe, test } from "@weth/hoot";
import {
    click,
    contains,
    insertText,
    openDiscuss,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";
import { Command, serverState } from "@web/../tests/web_test_helpers";
import { defineLivechatModels } from "./livechat_test_helpers";

describe.current.tags("desktop");
defineLivechatModels();

test("Suggestions are shown after delimiter was used in text (::)", async () => {
    const pyEnv = await startServer();
    pyEnv["mail.canned.response"].create({
        source: "hello",
        substitution: "Hello dear customer, how may I help you?",
    });
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "livechat",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId, livechat_member_type: "agent" }),
            Command.create({
                partner_id: serverState.publicPartnerId,
                livechat_member_type: "visitor",
            }),
        ],
    });
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "::");
    await contains(".w-mail-Composer-suggestion strong", { text: "hello" });
    await insertText(".w-mail-Composer-input", ")");
    await contains(".w-mail-Composer-suggestion strong", { count: 0 });
    await insertText(".w-mail-Composer-input", " ::");
    await contains(".w-mail-Composer-suggestion strong", { text: "hello" });
});

test("Internal user mention shows their live chat username", async () => {
    const pyEnv = await startServer();
    pyEnv["res.partner"].write([serverState.partnerId], { user_livechat_username: "Batman" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_type: "livechat",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId, livechat_member_type: "agent" }),
            Command.create({
                partner_id: serverState.publicPartnerId,
                livechat_member_type: "visitor",
            }),
        ],
    });
    pyEnv["res.users"]._applyComputesAndValidate();
    await start();
    await openDiscuss(channelId);
    await insertText(".w-mail-Composer-input", "@");
    await click('.w-mail-Composer-suggestion:contains(Mitchell Admin "Batman")');
    await contains(".w-mail-Composer-input:value(@Batman)");
    await click(".w-mail-Composer button[title='Send']:enabled");
    await contains(".w-mail-Message a.o_mail_redirect", { text: "@Batman" });
});
