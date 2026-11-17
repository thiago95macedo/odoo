import { expect, test } from "@weth/hoot";
import { click, queryAllTexts } from "@weth/hoot-dom";
import { contains, mountWithCleanup } from "@web/../tests/web_test_helpers";
import { FAKE_FILTER_SECTIONS, FAKE_MODEL } from "./calendar_test_helpers";

import { CalendarFilterSection } from "@web/views/calendar/calendar_filter_section/calendar_filter_section";
import { runAllTimers } from "@weth/hoot-mock";

test(`render filter panel`, async () => {
    await mountWithCleanup(CalendarFilterSection, {
        props: {
            model: FAKE_MODEL,
            section: FAKE_FILTER_SECTIONS[0],
        },
    });
    expect(`.w_calendar_filter`).toHaveCount(1);
    expect(`.w_calendar_filter .w_cw_filter_label`).toHaveText("Attendees");
    expect(`.w_calendar_filter .w_calendar_filter_item`).toHaveCount(3);
});

test(`filters are correctly sorted`, async () => {
    await mountWithCleanup(CalendarFilterSection, {
        props: {
            model: FAKE_MODEL,
            section: FAKE_FILTER_SECTIONS[0],
        },
    });
    expect(queryAllTexts`.w_calendar_filter .w_calendar_filter_item`).toEqual([
        "Mitchell Admin",
        "Brandon Freeman",
        "Marc Demo",
    ]);
});

test(`section can collapse`, async () => {
    await mountWithCleanup(CalendarFilterSection, {
        props: {
            model: FAKE_MODEL,
            section: FAKE_FILTER_SECTIONS[0],
        },
    });
    expect(`.w_calendar_filter .w_cw_filter_collapse_icon`).toHaveCount(1);
    expect(`.w_calendar_filter .w_calendar_filter_item`).toHaveCount(3);

    await contains(`.w_calendar_filter .w_cw_filter_label`).click();
    await runAllTimers();
    expect(`.w_calendar_filter .w_calendar_filter_item`).toHaveCount(0);

    await contains(`.w_calendar_filter .w_cw_filter_label`).click();
    await runAllTimers();
    expect(`.w_calendar_filter .w_calendar_filter_item`).toHaveCount(3);
});

test(`filters can have avatar`, async () => {
    await mountWithCleanup(CalendarFilterSection, {
        props: {
            model: FAKE_MODEL,
            section: FAKE_FILTER_SECTIONS[0],
        },
    });
    expect(`.w_calendar_filter .w_cw_filter_avatar`).toHaveCount(3);
    expect(`.w_calendar_filter img.w_cw_filter_avatar`).toHaveCount(3);
    expect(`.w_calendar_filter .w_calendar_filter_item:eq(0) .w_cw_filter_avatar`).toHaveAttribute(
        "data-src",
        "/web/image/res.partner/3/avatar_128"
    );
    expect(`.w_calendar_filter .w_calendar_filter_item:eq(1) .w_cw_filter_avatar`).toHaveAttribute(
        "data-src",
        "/web/image/res.partner/4/avatar_128"
    );
    expect(`.w_calendar_filter .w_calendar_filter_item:eq(2) .w_cw_filter_avatar`).toHaveAttribute(
        "data-src",
        "/web/image/res.partner/6/avatar_128"
    );
});

test(`filters with no avatar`, async () => {
    await mountWithCleanup(CalendarFilterSection, {
        props: {
            model: FAKE_MODEL,
            section: FAKE_FILTER_SECTIONS[1],
        },
    });
    expect(`.w_calendar_filter .w_calendar_filter_item`).toHaveCount(2);
    expect(`.w_calendar_filter .w_cw_filter_avatar`).toHaveCount(0);
});

test(`filters with placeholder`, async () => {
    await mountWithCleanup(CalendarFilterSection, {
        props: {
            model: FAKE_MODEL,
            section: FAKE_FILTER_SECTIONS[0],
            placeholder: "Custom placeholder",
        },
    });
    expect(`.w_calendar_filter .w-autocomplete--input`).toHaveAttribute("placeholder", "Custom placeholder");
})

test(`filters without placeholder`, async () => {
    await mountWithCleanup(CalendarFilterSection, {
        props: {
            model: FAKE_MODEL,
            section: FAKE_FILTER_SECTIONS[0],
        },
    });
    expect(`.w_calendar_filter .w-autocomplete--input`).toHaveAttribute("placeholder", "+ Add Attendees");
})

test(`filter can have remove button`, async () => {
    await mountWithCleanup(CalendarFilterSection, {
        props: {
            model: FAKE_MODEL,
            section: FAKE_FILTER_SECTIONS[0],
        },
    });
    expect(`.w_calendar_filter .w_calendar_filter_item`).toHaveCount(3);
    expect(`.w_calendar_filter .w_calendar_filter_item .w_remove`).toHaveCount(2);
    expect(`.w_calendar_filter .w_calendar_filter_item:eq(0) .w_remove`).toHaveCount(0);
    expect(`.w_calendar_filter .w_calendar_filter_item:eq(1) .w_remove`).toHaveCount(1);
    expect(`.w_calendar_filter .w_calendar_filter_item:eq(2) .w_remove`).toHaveCount(1);
    expect(`.w_calendar_filter .w_calendar_filter_item:eq(3) .w_remove`).toHaveCount(0);
});

test(`click on remove button`, async () => {
    await mountWithCleanup(CalendarFilterSection, {
        props: {
            model: {
                ...FAKE_MODEL,
                unlinkFilter(fieldName, recordId) {
                    expect.step(`${fieldName} ${recordId}`);
                },
            },
            section: FAKE_FILTER_SECTIONS[0],
        },
    });
    await click(`.w_calendar_filter .w_calendar_filter_item:eq(1) .w_remove`);
    await click(`.w_calendar_filter .w_calendar_filter_item:eq(2) .w_remove`);
    expect.verifySteps(["partner_ids 1", "partner_ids 2"]);
});

test(`click on filter`, async () => {
    await mountWithCleanup(CalendarFilterSection, {
        props: {
            model: {
                ...FAKE_MODEL,
                updateFilters(fieldName, filters, active) {
                    expect.step(`${fieldName} ${filters.map((f) => f.value)} ${active}`);
                },
            },
            section: FAKE_FILTER_SECTIONS[0],
        },
    });
    await click(`.w_calendar_filter .w_calendar_filter_item:eq(0) input`);
    await click(`.w_calendar_filter .w_calendar_filter_item:eq(1) input`);
    await click(`.w_calendar_filter .w_calendar_filter_item:eq(2) input`);
    await click(`.w_calendar_filter .w_calendar_filter_items_checkall input`);
    await click(`.w_calendar_filter .w_calendar_filter_items_checkall input`);
    expect.verifySteps([
        "partner_ids 3 false",
        "partner_ids 4 false",
        "partner_ids 6 true",
        "partner_ids 3,4,6 true",
        "partner_ids 3,4,6 false",
    ]);
});
