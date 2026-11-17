import { describe, expect, test } from "@weth/hoot";
import { press, queryAllTexts } from "@weth/hoot-dom";
import { animationFrame, runAllTimers } from "@weth/hoot-mock";
import { getOrigin } from "@web/core/utils/urls";

import {
    clickSave,
    contains,
    defineModels,
    fields,
    models,
    mountView,
    onRpc,
    patchWithCleanup,
} from "@web/../tests/web_test_helpers";
import { CardMany2ManyTagsAvatarField } from "@web/views/fields/many2many_tags_avatar/many2many_tags_avatar_field";

describe.current.tags("desktop");

class Partner extends models.Model {
    name = fields.Char({ string: "Displayed name" });
    _records = [
        { id: 1, name: "first record", write_date: "2023-02-13 10:00:00" },
        { id: 2, name: "second record", write_date: "2023-02-13 10:00:00" },
        { id: 4, name: "aaa", write_date: "2023-02-13 10:00:00" },
    ];
}

class Turtle extends models.Model {
    name = fields.Char({ string: "Displayed name" });
    partner_ids = fields.Many2many({ string: "Partner", relation: "partner" });
    _records = [
        { id: 1, name: "leonardo", partner_ids: [] },
        { id: 2, name: "donatello", partner_ids: [2, 4] },
        { id: 3, name: "raphael" },
    ];
}

onRpc("has_group", () => true);

defineModels([Partner, Turtle]);

test("widget many2many_tags_avatar", async () => {
    await mountView({
        type: "form",
        resModel: "turtle",
        arch: `
            <form>
                <sheet>
                    <field name="partner_ids" widget="many2many_tags_avatar"/>
                </sheet>
            </form>`,
        resId: 1,
    });
    expect(queryAllTexts("[name='partner_ids'] .w_tag")).toEqual([]);
    expect("[name='partner_ids'] .w_input_dropdown input").toHaveValue("");

    await contains("[name='partner_ids'] .w_input_dropdown input").fill("first record");
    await runAllTimers();
    expect(queryAllTexts("[name='partner_ids'] .w_tag")).toEqual(["first record"]);
    expect("[name='partner_ids'] .w_input_dropdown input").toHaveValue("");

    await contains("[name='partner_ids'] .w_input_dropdown input").fill("abc");
    await runAllTimers();
    expect(queryAllTexts("[name='partner_ids'] .w_tag")).toEqual(["first record", "abc"]);
    expect("[name='partner_ids'] .w_input_dropdown input").toHaveValue("");
});

test("widget many2many_tags_avatar img src", async () => {
    await mountView({
        type: "form",
        resModel: "turtle",
        arch: `
            <form>
                <sheet>
                    <field name="partner_ids" widget="many2many_tags_avatar"/>
                </sheet>
            </form>`,
        resId: 2,
    });

    expect(".w_field_many2many_tags_avatar.w_field_widget .w_avatar img").toHaveCount(2);
    expect(
        `.w_field_many2many_tags_avatar.w_field_widget .w_avatar:nth-child(1) img[data-src='${getOrigin()}/web/image/partner/2/avatar_128?unique=1676282400000']`
    ).toHaveCount(1);
});

test("widget many2many_tags_avatar in list view", async () => {
    for (let id = 5; id <= 15; id++) {
        Partner._records.push({
            id,
            name: `record ${id}`,
            write_date: "2023-02-13 10:00:00",
        });
    }

    Turtle._records.push({
        id: 4,
        name: "crime master gogo",
        partner_ids: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    });
    Turtle._records[0].partner_ids = [1];
    Turtle._records[1].partner_ids = [1, 2, 4, 5, 6, 7];
    Turtle._records[2].partner_ids = [1, 2, 4, 5, 7];

    await mountView({
        type: "list",
        resModel: "turtle",
        arch: `
            <list editable="bottom">
                <field name="partner_ids" widget="many2many_tags_avatar"/>
            </list>`,
    });
    expect(
        `.w_data_row:nth-child(1) .w_field_many2many_tags_avatar .w_avatar img.w_m2m_avatar[data-src='${getOrigin()}/web/image/partner/1/avatar_128?unique=1676282400000']`
    ).toHaveCount(1);
    expect(
        ".w_data_row .w_many2many_tags_avatar_cell .w_field_many2many_tags_avatar:eq(0)"
    ).toHaveText("first record");
    expect(
        ".w_data_row:nth-child(2) .w_field_many2many_tags_avatar .w_avatar:not(.w_m2m_avatar_empty) img"
    ).toHaveCount(4);
    expect(
        ".w_data_row:nth-child(3) .w_field_many2many_tags_avatar .w_avatar:not(.w_m2m_avatar_empty) img"
    ).toHaveCount(5);
    expect(
        ".w_data_row:nth-child(2) .w_field_many2many_tags_avatar .w_m2m_avatar_empty"
    ).toHaveCount(1);
    expect(
        ".w_data_row:nth-child(2) .w_field_many2many_tags_avatar .w_m2m_avatar_empty"
    ).toHaveText("+2");
    expect(
        `.w_data_row:nth-child(2) .w_field_many2many_tags_avatar .w_avatar:nth-child(1) img.w_m2m_avatar[data-src='${getOrigin()}/web/image/partner/1/avatar_128?unique=1676282400000']`
    ).toHaveCount(1);
    expect(
        `.w_data_row:nth-child(2) .w_field_many2many_tags_avatar .w_avatar:nth-child(2) img.w_m2m_avatar[data-src='${getOrigin()}/web/image/partner/2/avatar_128?unique=1676282400000']`
    ).toHaveCount(1);
    expect(
        `.w_data_row:nth-child(2) .w_field_many2many_tags_avatar .w_avatar:nth-child(3) img.w_m2m_avatar[data-src='${getOrigin()}/web/image/partner/4/avatar_128?unique=1676282400000']`
    ).toHaveCount(1);
    expect(
        `.w_data_row:nth-child(2) .w_field_many2many_tags_avatar .w_avatar:nth-child(4) img.w_m2m_avatar[data-src='${getOrigin()}/web/image/partner/5/avatar_128?unique=1676282400000']`
    ).toHaveCount(1);
    expect(
        ".w_data_row:nth-child(3) .w_field_many2many_tags_avatar .w_m2m_avatar_empty"
    ).toHaveCount(0);
    expect(
        ".w_data_row:nth-child(4) .w_field_many2many_tags_avatar .w_avatar:not(.w_m2m_avatar_empty) img"
    ).toHaveCount(4);
    expect(
        ".w_data_row:nth-child(4) .w_field_many2many_tags_avatar .w_m2m_avatar_empty"
    ).toHaveCount(1);
    expect(
        ".w_data_row:nth-child(4) .w_field_many2many_tags_avatar .w_m2m_avatar_empty"
    ).toHaveText("+9");

    await contains(".w_data_row .w_many2many_tags_avatar_cell:eq(0)").click();
    await contains(
        ".w_data_row .w_many2many_tags_avatar_cell:eq(0) .w-autocomplete--input"
    ).click();
    await contains(".w-autocomplete--dropdown-item:eq(1)").click();
    await contains(".w_control_panel_main_buttons .w_list_button_save").click();
    expect(".w_data_row:eq(0) .w_field_many2many_tags_avatar .w_avatar img").toHaveCount(2);

    // Edit first row
    await contains(".w_data_row:nth-child(1) .w_data_cell").click();

    // Only the first row should have tags with delete buttons.
    expect(".w_data_row:nth-child(1) .w_field_tags span .w_delete").toHaveCount(2);
    expect(".w_data_row:nth-child(2) .w_field_tags span .w_delete").toHaveCount(0);
    expect(".w_data_row:nth-child(3) .w_field_tags span .w_delete").toHaveCount(0);
    expect(".w_data_row:nth-child(4) .w_field_tags span .w_delete").toHaveCount(0);
});

test("widget many2many_tags_avatar list view - don't crash on keyboard navigation", async () => {
    await mountView({
        type: "list",
        resModel: "turtle",
        arch: /*xml*/ `
                <list editable="bottom">
                    <field name="partner_ids" widget="many2many_tags_avatar"/>
                </list>
            `,
    });

    // Edit second row
    await contains(".w_data_row:nth-child(2) .w_data_cell").click();

    // Pressing left arrow should focus on the right-most (second) tag.
    await press("arrowleft");
    expect(".w_data_row:nth-child(2) .w_field_tags span:nth-child(2):first").toBeFocused();

    // Pressing left arrow again should not crash and should focus on the first tag.
    await press("arrowleft");
    expect(".w_data_row:nth-child(2) .w_field_tags span:nth-child(1):first").toBeFocused();
});

test("widget many2many_tags_avatar in kanban view", async () => {
    expect.assertions(25);

    for (let id = 5; id <= 15; id++) {
        Partner._records.push({
            id,
            name: `record ${id}`,
            write_date: "2023-02-13 10:00:00",
        });
    }

    Turtle._records.push({
        id: 4,
        name: "crime master gogo",
        partner_ids: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    });
    Turtle._records[0].partner_ids = [1];
    Turtle._records[1].partner_ids = [1, 2];
    Turtle._records[2].partner_ids = [1, 2, 4, 5];
    Turtle._views = {
        form: '<form><field name="name"/></form>',
    };
    Partner._views = {
        list: '<list><field name="name"/></list>',
    };
    patchWithCleanup(CardMany2ManyTagsAvatarField.prototype, {
        get specification() {
            return {
                ...super.specification,
                id: {},
            };
        },
    });
    onRpc("web_name_search", ({ kwargs, model }) => {
        expect(model).toBe("partner");
        expect(kwargs.specification).toInclude(["id", {}]);
        expect(kwargs.specification).toInclude(["display_name", {}]);
    });

    await mountView({
        type: "kanban",
        resModel: "turtle",
        arch: `
            <kanban>
                <templates>
                    <t t-name="card">
                        <field name="name"/>
                        <footer>
                            <field name="partner_ids" widget="many2many_tags_avatar"/>
                        </footer>
                    </t>
                </templates>
            </kanban>`,
        selectRecord(recordId) {
            expect(recordId).toBe(1, {
                message: "should call its selectRecord prop with the clicked record",
            });
        },
    });
    expect(".w_kanban_record:eq(0) .w_field_many2many_tags_avatar .w_quick_assign").toHaveCount(1);

    expect(
        ".w_kanban_record:nth-child(2) .w_field_many2many_tags_avatar .w_avatar img"
    ).toHaveCount(2);
    expect(
        ".w_kanban_record:nth-child(2) .w_field_many2many_tags_avatar .w_m2m_avatar_empty"
    ).toHaveCount(0);
    expect(
        ".w_kanban_record:nth-child(3) .w_field_many2many_tags_avatar .w_avatar img"
    ).toHaveCount(1);
    expect(
        `.w_kanban_record:nth-child(2) .w_field_many2many_tags_avatar .w_avatar:nth-child(1 of .w_tag) img.w_m2m_avatar[data-src='${getOrigin()}/web/image/partner/1/avatar_128?unique=1676282400000']`
    ).toHaveCount(1);
    expect(
        `.w_kanban_record:nth-child(2) .w_field_many2many_tags_avatar .w_avatar:nth-child(2 of .w_tag) img.w_m2m_avatar[data-src='${getOrigin()}/web/image/partner/2/avatar_128?unique=1676282400000']`
    ).toHaveCount(1);
    expect(
        ".w_kanban_record:nth-child(3) .w_field_many2many_tags_avatar .w_m2m_avatar_empty"
    ).toHaveCount(1);
    expect(
        ".w_kanban_record:nth-child(3) .w_field_many2many_tags_avatar .w_m2m_avatar_empty"
    ).toHaveText("+3");

    expect(
        ".w_kanban_record:nth-child(4) .w_field_many2many_tags_avatar .w_avatar img"
    ).toHaveCount(1);
    expect(
        ".w_kanban_record:nth-child(4) .w_field_many2many_tags_avatar .w_m2m_avatar_empty"
    ).toHaveCount(1);
    expect(
        ".w_kanban_record:nth-child(4) .w_field_many2many_tags_avatar .w_m2m_avatar_empty"
    ).toHaveText("+12");
    expect(".w_field_many2many_tags_avatar .w_field_many2many_selection").toHaveCount(0);
    await contains(".w_kanban_record:nth-child(2) .w_quick_assign", { visible: false }).click();
    await animationFrame();
    expect(".w-overlay-container input").toBeFocused();
    expect(".w-overlay-container .w_tag").toHaveCount(2);
    // delete inside the popover
    await contains(".w-overlay-container .w_tag .w_delete:eq(0)", {
        visible: false,
        displayed: true,
    }).click();
    expect(".w-overlay-container .w_tag").toHaveCount(1);
    expect(".w_kanban_record:nth-child(2) .w_tag").toHaveCount(1);
    // select first non selected input
    await contains(".w-overlay-container .w-autocomplete--dropdown-item:eq(4)").click();
    expect(".w-overlay-container .w_tag").toHaveCount(2);
    expect(".w_kanban_record:nth-child(2) .w_tag").toHaveCount(2);
    // load more
    await contains(".w-overlay-container .w_m2o_dropdown_option_search_more").click();
    // first non already selected item
    await contains(".w_dialog .w_list_table .w_data_row .w_data_cell:eq(3)").click();
    expect(".w-overlay-container .w_tag").toHaveCount(3); // Should show full list above m2m autocomplete input
    expect(".w_kanban_record:nth-child(2) .w_tag:not(.w_m2m_avatar_empty)").toHaveCount(1); // But keep truncate in the card
    expect(
        `.w_kanban_record:nth-child(2) img.w_m2m_avatar[data-src='${getOrigin()}/web/image/partner/2/avatar_128?unique=1676282400000']`
    ).toHaveCount(1);
    await contains(".w_kanban_record .w_field_many2many_tags_avatar img.w_m2m_avatar").click();
});

test("widget many2many_tags_avatar add/remove tags in kanban view", async () => {
    onRpc("web_save", ({ args }) => {
        const command = args[1].partner_ids[0];
        expect.step(`web_save: ${command[0]}-${command[1]}`);
    });
    await mountView({
        type: "kanban",
        resModel: "turtle",
        arch: `
            <kanban>
                <templates>
                    <t t-name="card">
                        <field name="name"/>
                        <footer>
                            <field name="partner_ids" widget="many2many_tags_avatar"/>
                        </footer>
                    </t>
                </templates>
            </kanban>`,
    });
    await contains(".w_kanban_record:eq(0) .w_quick_assign", { visible: false }).click();
    // add and directly remove an item
    await contains(".w_popover .w-autocomplete--dropdown-item:eq(0)").click();
    await contains(".w_popover .w_tag .w_delete", { visible: false }).click();
    expect.verifySteps(["web_save: 4-1", "web_save: 3-1"]);
});

test("widget many2many_tags_avatar delete tag", async () => {
    await mountView({
        type: "form",
        resModel: "turtle",
        resId: 2,
        arch: `
            <form>
                <sheet>
                    <field name="partner_ids" widget="many2many_tags_avatar"/>
                </sheet>
            </form>`,
    });

    expect(".w_field_many2many_tags_avatar.w_field_widget .w_tag").toHaveCount(2);

    await contains(".w_field_many2many_tags_avatar.w_field_widget .w_tag .w_delete", {
        visible: false,
    }).click();
    expect(".w_field_many2many_tags_avatar.w_field_widget .w_tag").toHaveCount(1);

    await clickSave();
    expect(".w_field_many2many_tags_avatar.w_field_widget .w_tag").toHaveCount(1);
});

test("widget many2many_tags_avatar quick add tags and close in kanban view with keyboard navigation", async () => {
    await mountView({
        type: "kanban",
        resModel: "turtle",
        arch: `
            <kanban>
                <templates>
                    <t t-name="card">
                        <field name="name"/>
                        <footer>
                            <field name="partner_ids" widget="many2many_tags_avatar"/>
                        </footer>
                    </t>
                </templates>
            </kanban>`,
    });
    await contains(".w_kanban_record:eq(0) .w_quick_assign", { visible: false }).click();
    // add and directly close the dropdown
    await press("Tab");
    await press("Enter");
    await animationFrame();
    expect(".w_kanban_record:eq(0) .w_field_many2many_tags_avatar .w_tag").toHaveCount(1);
    expect(".w_kanban_record:eq(0) .w_field_many2many_tags_avatar .w_popover").toHaveCount(0);
});

test("widget many2many_tags_avatar in kanban view missing access rights", async () => {
    expect.assertions(1);
    await mountView({
        type: "kanban",
        resModel: "turtle",
        arch: `
            <kanban edit="0" create="0">
                <templates>
                    <t t-name="card">
                        <field name="name"/>
                        <footer>
                            <field name="partner_ids" widget="many2many_tags_avatar"/>
                        </footer>
                    </t>
                </templates>
            </kanban>`,
    });

    expect(".w_kanban_record:eq(0) .w_field_many2many_tags_avatar .w_quick_assign").toHaveCount(0);
});

test("Many2ManyTagsAvatarField: make sure that the arch context is passed to the form view call", async () => {
    Partner._views = {
        form: `<form><field name="name"/></form>`,
    };
    onRpc("onchange", (args) => {
        if (args.model === "partner" && args.kwargs.context.append_coucou === "test_value") {
            expect.step("onchange with context given");
        }
    });

    await mountView({
        type: "list",
        resModel: "turtle",
        arch: `<list editable="top">
                <field name="partner_ids" widget="many2many_tags_avatar" context="{ 'append_coucou': 'test_value' }"/>
            </list>`,
    });

    await contains("div[name=partner_ids]").click();
    await contains(`div[name="partner_ids"] input`).edit("A new partner", { confirm: false });
    await runAllTimers();
    await contains(".w_m2o_dropdown_option_create_edit").click();

    expect(".modal .w_form_view").toHaveCount(1);
    expect.verifySteps(["onchange with context given"]);
});
