import {
    click,
    contains,
    defineMailModels,
    inputFiles,
    openDiscuss,
    openFormView,
    openMessagingMenu,
    start,
    startServer,
    MENU_ACTIVE_IDS,
} from "@mail/../tests/mail_test_helpers";
import { describe, test } from "@weth/hoot";
import { onRpc } from "@web/../tests/web_test_helpers";

describe.current.tags("desktop");
defineMailModels();

test("no conflicts between file uploads", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({});
    const channelId = pyEnv["discuss.channel"].create({});
    const text = new File(["hello, world"], "text1.txt", { type: "text/plain" });
    const text2 = new File(["hello, world"], "text2.txt", { type: "text/plain" });
    pyEnv["mail.message"].create({
        body: "not empty",
        model: "discuss.channel",
        res_id: channelId,
    });
    await start();
    // Uploading file in the first thread: res.partner chatter.
    await openFormView("res.partner", partnerId);
    await click("button:text('Send message')");
    await inputFiles(".w-mail-Chatter .w-mail-Composer input[type=file]", [text]);
    // Uploading file in the second thread: discuss.channel in chatWindow.
    await openMessagingMenu(MENU_ACTIVE_IDS.CHANNEL);
    await click(".w-mail-NotificationItem");
    await inputFiles(".w-mail-ChatWindow .w-mail-Composer input[type=file]", [text2]);
    await contains(".w-mail-Chatter .w-mail-AttachmentContainer");
    await contains(".w-mail-ChatWindow .w-mail-AttachmentContainer");
    await contains(
        ".w-mail-Chatter .w-mail-AttachmentContainer:not(.w-isUploading):contains(text1.txt)"
    );
    await contains(
        ".w-mail-ChatWindow .w-mail-AttachmentContainer:not(.w-isUploading):contains(text2.txt)"
    );
});

test("Attachment shows spinner during upload", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "channel_1" });
    const text2 = new File(["hello, world"], "text2.txt", { type: "text/plain" });
    onRpc("/mail/attachment/upload", () => new Promise(() => { })); // never fulfill the attachment upload promise.
    await start();
    await openDiscuss(channelId);
    await inputFiles(".w-mail-Composer input[type=file]", [text2]);
    await contains(
        ".w-mail-AttachmentContainer.w-isUploading:contains(text2.txt) [data-icon='autorenew']"
    );
});
