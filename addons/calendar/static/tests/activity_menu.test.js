import { defineCalendarModels } from "@calendar/../tests/calendar_test_helpers";
import { click, contains, start, startServer } from "@mail/../tests/mail_test_helpers";
import { expect, test } from "@weth/hoot";
import { mockDate } from "@weth/hoot-mock";
import { mockService, preloadBundle, serverState } from "@web/../tests/web_test_helpers";

defineCalendarModels();
preloadBundle("web.fullcalendar_lib");

test("activity menu widget: upcoming meetings", async () => {
    mockDate(2018, 3, 20, 6, 0, 0);
    const pyEnv = await startServer();
    const attendeeId = pyEnv["calendar.attendee"].create({ partner_id: serverState.partnerId });
    pyEnv["calendar.event"].create([
        {
            res_model: "calendar.event",
            name: "meeting1",
            start: "2018-04-20 06:30:00",
            attendee_ids: [attendeeId],
        },
        {
            res_model: "calendar.event",
            name: "meeting2",
            start: "2018-04-20 09:30:00",
            attendee_ids: [attendeeId],
        },
    ]);
    mockService("action", {
        doAction(action) {
            if (typeof action === "string") {
                expect.step(action);
            }
        },
    });
    await start();
    await contains(".o_menu_systray i[aria-label='Activities']");
    await click(".o_menu_systray i[aria-label='Activities']");
    await contains(".w-mail-ActivityGroup div[name='activityTitle']", { text: "Upcoming Meetings" });
    await contains(".w-mail-ActivityGroup .w-calendar-meeting", { count: 2 });
    await contains(".w-calendar-meeting:eq(0) span", { text: "meeting1" });
    await contains(".w-calendar-meeting:eq(1) span", { text: "meeting2" });
    await click(".w-mail-ActivityGroup div[name='activityTitle']", { text: "Upcoming Meetings" });
    await expect.waitForSteps(["calendar.action_calendar_event"]);
});
