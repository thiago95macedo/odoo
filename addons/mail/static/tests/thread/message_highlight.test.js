import {
    click,
    contains,
    defineMailModels,
    isInViewportOf,
    openDiscuss,
    start,
    startServer,
} from "@mail/../tests/mail_test_helpers";
import { UseForwardRefsToParent } from "@mail/utils/common/hooks";
import { describe, test } from "@weth/hoot";
import { advanceTime, tick, waitFor } from "@weth/hoot-dom";
import { disableAnimations } from "@weth/hoot-mock";
import { router, routerBus } from "@web/core/browser/router";
import { range } from "@web/core/utils/numbers";
import { mountWebClient, patchWithCleanup } from "@web/../tests/web_test_helpers";

defineMailModels();
describe.current.tags("desktop");

test("can highlight messages that are not yet loaded", async () => {
    disableAnimations();
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    let middleMessageId;
    for (let i = 0; i < 200; i++) {
        const messageId = pyEnv["mail.message"].create({
            body: `message ${i}`,
            model: "discuss.channel",
            res_id: channelId,
        });
        if (i === 100) {
            middleMessageId = messageId;
        }
    }
    await pyEnv["discuss.channel"].set_message_pin(channelId, middleMessageId, true);
    await start();
    await openDiscuss(channelId);
    await tick(); // Wait for the scroll to first unread to complete.
    await isInViewportOf(".w-mail-Message:contains(message 199)", ".w-mail-Thread");
    await click("a[data-oe-type='highlight']");
    await isInViewportOf(".w-mail-Message:contains(message 100)", ".w-mail-Thread");
});

test("highlight scroll is not stopped by the scrollend of a previous scroll", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    let middleMessageId;
    for (let i = 0; i < 200; i++) {
        const messageId = pyEnv["mail.message"].create({
            body: `message ${i}`,
            model: "discuss.channel",
            res_id: channelId,
        });
        if (i === 100) {
            middleMessageId = messageId;
        }
    }
    await pyEnv["discuss.channel"].set_message_pin(channelId, middleMessageId, true);
    patchWithCleanup(Element.prototype, {
        scrollIntoView(options) {
            super.scrollIntoView(options);
            if (options?.behavior === "smooth") {
                // Simulate the late scrollend of the previous scroll.
                this.closest(".w-mail-Thread").dispatchEvent(new Event("scrollend"));
            }
        },
    });
    await start();
    await openDiscuss(channelId);
    await isInViewportOf(".w-mail-Message:contains(message 199)", ".w-mail-Thread");
    await click("a[data-oe-type='highlight']");
    await isInViewportOf(".w-mail-Message:contains(message 100)", ".w-mail-Thread");
});

test("can highlight message (slow ref registration)", async () => {
    disableAnimations();
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    let middleMessageId;
    for (let i = 0; i < 200; i++) {
        const messageId = pyEnv["mail.message"].create({
            body: `message ${i}`,
            model: "discuss.channel",
            res_id: channelId,
        });
        if (i === 100) {
            middleMessageId = messageId;
        }
    }
    await pyEnv["discuss.channel"].set_message_pin(channelId, middleMessageId, true);
    const { promise: refRegistered, resolve: resolveRefRegistration } = Promise.withResolvers();
    patchWithCleanup(UseForwardRefsToParent.prototype, {
        async registerRef(...args) {
            // Ensure scroll is made even when messages are mounted later.
            await refRegistered;
            return super.registerRef(...args);
        },
    });
    await start();
    await openDiscuss(channelId);
    await tick(); // Wait for the scroll to first unread to complete.
    await isInViewportOf(".w-mail-Message:contains(message 199)", ".w-mail-Thread");
    await click("a[data-oe-type='highlight']");
    await advanceTime(1000);
    resolveRefRegistration();
    await isInViewportOf(".w-mail-Message:contains(message 100)", ".w-mail-Thread");
});

test("highlight scrolls to beginning of long message", async () => {
    disableAnimations();
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "general" });
    const [messageId1] = pyEnv["mail.message"].create([
        {
            body: `long message `.repeat(500),
            model: "discuss.channel",
            res_id: channelId,
        },
        {
            body: `short message`,
            model: "discuss.channel",
            res_id: channelId,
        },
    ]);
    await pyEnv["discuss.channel"].set_message_pin(channelId, messageId1, true);
    await start();
    await openDiscuss(channelId);
    await waitFor(".w-mail-Message:contains('short message')");
    await isInViewportOf(".w-mail-Message:contains('short message')", ".w-mail-Thread");
    await click("a[data-oe-type='highlight']");
    await advanceTime(1000);
    await isInViewportOf(".w-mail-Message:contains('long message')", ".w-mail-Thread");
    await isInViewportOf(
        ".w-mail-Message:contains('long message') .w-mail-Message-avatar", // avatar is at beginning of message
        ".w-mail-Thread"
    );
});

test("Chatter jumps when navigating to a specific message link", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "John Doe" });
    const messageIds = range(0, 31).map((i) =>
        pyEnv["mail.message"].create({
            body: `message ${i}`,
            model: "res.partner",
            res_id: partnerId,
        })
    );
    await mountWebClient();
    router.pushState(
        router.urlToState(
            new URL(
                `${window.location.origin}/weth/res.partner/${partnerId}?highlight_message_id=${messageIds[0]}`
            )
        ),
        { sync: true }
    );
    routerBus.trigger("ROUTE_CHANGE");
    await contains(".w-mail-Message.w-highlighted .w-mail-Message-content", { text: "message 0" });
});
