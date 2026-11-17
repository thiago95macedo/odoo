import { defineCrmLivechatModels } from "@crm_livechat/../tests/crm_livechat_test_helpers";

import {
    click,
    contains,
    insertText,
    openDiscuss,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";

import { describe, test } from "@weth/hoot";
import { mockDate } from "@weth/hoot-mock";

import { Command, serverState } from "@web/../tests/web_test_helpers";
import { deserializeDateTime } from "@web/core/l10n/dates";
import { user } from "@web/core/user";

describe.current.tags("desktop");
defineCrmLivechatModels();

test("can create a lead from the thread action after the conversation ends", async () => {
    mockDate("2025-01-01 12:00:00", +1);
    const pyEnv = await startServer();
    const groupId = pyEnv["res.groups"].create({ name: "Sales Team" });
    serverState.groupSalesTeamId = groupId;
    pyEnv["res.users"].write([serverState.userId], {
        group_ids: [Command.link(groupId)],
    });
    const guestId = pyEnv["mail.guest"].create({ name: "Visitor" });
    const channel_id = pyEnv["discuss.channel"].create({
        channel_type: "livechat",
        channel_member_ids: [
            Command.create({ partner_id: serverState.partnerId, livechat_member_type: "agent" }),
            Command.create({ guest_id: guestId, livechat_member_type: "visitor" }),
        ],
    });
    await start();
    await openDiscuss(channel_id);
    await contains(".w-livechat-ChannelInfoList"); // wait for auto-open of this panel
    await click(".w-mail-DiscussContent-header button[title='Create Lead']");
    await insertText(".w-livechat-LivechatCommandDialog-form input", "testlead");
    await click(".w-mail-ActionPanel button", { text: "Create Lead" });
    const [{ date }] = pyEnv["mail.message"].search_read([["res_id", "=", channel_id]]);
    const time = deserializeDateTime(date).toLocaleString(luxon.DateTime.TIME_SIMPLE, {
        locale: user.lang,
    });
    await contains(
        `.w-mail-NotificationMessage:text('${serverState.partnerName} created a new lead: testlead${time}')`
    );
    const [leadId] = pyEnv["crm.lead"].search([["name", "=", "testlead"]]);
    await contains(
        `.w-mail-NotificationMessage a[href='/mail/view?model=crm.lead&res_id=${leadId}'][data-oe-model='crm.lead'][data-oe-id='${leadId}']:text('testlead')`
    );
});
