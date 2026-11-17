import {
    click,
    contains,
    defineMailModels,
    openDiscuss,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";
import { describe, test } from "@weth/hoot";

describe.current.tags("desktop");
defineMailModels();

test("Empty attachment panel", async () => {
    const pyEnv = await startServer();
    const channelId = await pyEnv["discuss.channel"].create({ name: "General" });
    await start();
    await openDiscuss(channelId);
    await click(".w-mail-DiscussContent-header button[title='Attachments']");
    await contains(".w-mail-ActionPanel:text('This channel doesn't have any attachments.')");
});

test("Attachment panel sort by date", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    pyEnv["ir.attachment"].create([
        {
            res_id: channelId,
            res_model: "discuss.channel",
            name: "file1.pdf",
            create_date: "2023-08-20 10:00:00",
        },
        {
            res_id: channelId,
            res_model: "discuss.channel",
            name: "file2.pdf",
            create_date: "2023-09-21 10:00:00",
        },
    ]);
    await start();
    await openDiscuss(channelId);
    await contains(".w-discuss-ChannelMemberList"); // wait for auto-open of this panel
    await click(".w-mail-DiscussContent-header button[title='Attachments']");
    await contains(".w-mail-AttachmentCard-info:text('file2.pdf')", {
        after: [".w-mail-DateSection:text('September, 2023')"],
        before: [".w-mail-DateSection:text('August, 2023')"],
    });
    await contains(".w-mail-AttachmentCard-info:text('file1.pdf')", {
        after: [".w-mail-DateSection:text('August, 2023')"],
    });
});
