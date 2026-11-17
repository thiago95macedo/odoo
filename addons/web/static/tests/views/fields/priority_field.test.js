import {
    animationFrame,
    click,
    expect,
    hover,
    leave,
    press,
    queryAll,
    queryAllTexts,
    test,
} from "@weth/hoot";
import { defineModels, fields, models, mountView, onRpc } from "@web/../tests/web_test_helpers";

class Partner extends models.Model {
    foo = fields.Char({ string: "Foo" });
    id = fields.Integer({ string: "Sequence" });
    selection = fields.Selection({
        string: "Selection",
        selection: [
            ["normal", "Normal"],
            ["blocked", "Blocked"],
            ["done", "Done"],
        ],
    });

    _records = [
        {
            id: 1,
            foo: "yop",
            selection: "blocked",
        },
        {
            id: 2,
            foo: "blip",
            selection: "normal",
        },
        {
            id: 4,
            foo: "abc",
            selection: "done",
        },
        { id: 3, foo: "gnap" },
        { id: 5, foo: "blop" },
    ];
}
class User extends models.Model {
    _name = "res.users";
    has_group() {
        return true;
    }
}
defineModels([Partner, User]);

test("PriorityField when not set", async () => {
    await mountView({
        type: "form",
        resModel: "partner",
        resId: 2,
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="selection" widget="priority" />
                    </group>
                </sheet>
            </form>`,
    });

    expect(".w_field_widget .w_priority:not(.w_field_empty)").toHaveCount(1, {
        message: "widget should be considered set, even though there is no value for this field",
    });
    expect(".w_field_widget .w_priority button.w_priority_star").toHaveCount(2, {
        message:
            "should have two stars for representing each possible value: no star, one star and two stars",
    });
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(0, {
        message: "should have no full star since there is no value",
    });

    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(2, {
        message: "should have two empty stars since there is no value",
    });
});

test("PriorityField tooltip", async () => {
    await mountView({
        type: "form",
        resModel: "partner",
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="selection" widget="priority"/>
                    </group>
                </sheet>
            </form>`,
        resId: 1,
    });

    // check data-tooltip attribute (used by the tooltip service)
    const stars = queryAll(".w_field_widget .w_priority button.w_priority_star");
    expect(stars[0]).toHaveAttribute("data-tooltip", "Set Selection: Normal");
    expect(stars[1]).toHaveAttribute("data-tooltip", "Set Selection: Done");
});

test("PriorityField in form view", async () => {
    expect.assertions(7);

    await mountView({
        type: "form",
        resModel: "partner",
        resId: 1,
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="selection" widget="priority" />
                    </group>
                </sheet>
            </form>`,
    });

    expect(".w_field_widget .w_priority:not(.w_field_empty)").toHaveCount(1);
    expect(".w_field_widget .w_priority button.w_priority_star").toHaveCount(2);
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(1);
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(1);

    // click on the second star in edit mode
    await click(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled):last"
    );
    await animationFrame();

    expect(".w_field_widget .w_priority button.w_priority_star").toHaveCount(2);
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(2);
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(0);
});

test.tags("desktop");
test("PriorityField hover a star in form view", async () => {
    expect.assertions(10);
    await mountView({
        type: "form",
        resModel: "partner",
        resId: 1,
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="selection" widget="priority" />
                    </group>
                </sheet>
            </form>`,
    });

    expect(".w_field_widget .w_priority:not(.w_field_empty)").toHaveCount(1);
    expect(".w_field_widget .w_priority button.w_priority_star").toHaveCount(2);
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(1);
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(1);

    // hover last star
    const star =
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled):last";
    await hover(star);
    await animationFrame();
    expect(".w_field_widget .w_priority button.w_priority_star").toHaveCount(2);
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(2, {
        message: "should temporary have two full stars since we are hovering the third value",
    });
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(0, {
        message: "should temporary have no empty star since we are hovering the third value",
    });

    await leave(star);
    await animationFrame();

    expect(".w_field_widget .w_priority button.w_priority_star").toHaveCount(2);
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(1);
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(1);
});

test("PriorityField can write after adding a record -- kanban", async () => {
    Partner._fields.selection = fields.Selection({
        string: "Selection",
        selection: [
            ["0", 0],
            ["1", 1],
        ],
    });
    for (const record of Partner._records) {
        delete record.selection;
    }
    Partner._records[0].selection = "0";
    Partner._views[["form", "myquickview"]] = /* xml */ `<form/>`;
    onRpc("web_save", ({ args }) => expect.step(`web_save ${JSON.stringify(args)}`));
    await mountView({
        type: "kanban",
        resModel: "partner",
        domain: [["id", "=", 1]],
        groupBy: ["foo"],
        arch: /* xml */ `
            <kanban on_create="quick_create" quick_create_view="myquickview">
                <templates>
                    <t t-name="card">
                        <field name="selection" widget="priority"/>
                    </t>
                </templates>
            </kanban>`,
    });
    expect(".w_kanban_record [data-icon='star'].oi-filled").toHaveCount(0);

    await click(".w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)");
    // wait for web_save
    await animationFrame();
    expect.verifySteps(['web_save [[1],{"selection":"1"}]']);
    expect(".w_kanban_record [data-icon='star'].oi-filled").toHaveCount(1);
    await click(".w_control_panel_main_buttons .w-kanban-button-new");
    await animationFrame();
    await animationFrame();
    await click(".w_kanban_quick_create .w_kanban_add");
    await animationFrame();
    expect.verifySteps(["web_save [[],{}]"]);
    await click(".w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)");
    await animationFrame();
    expect.verifySteps([`web_save [[6],{"selection":"1"}]`]);
    expect(".w_kanban_record [data-icon='star'].oi-filled").toHaveCount(2);
});

test("PriorityField in editable list view", async () => {
    onRpc("has_group", () => true);
    await mountView({
        type: "list",
        resModel: "partner",
        arch: /* xml */ `<list editable="bottom"><field name="selection" widget="priority" /></list>`,
    });

    expect(".w_data_row:first-child .w_priority:not(.w_field_empty)").toHaveCount(1);
    expect(".w_data_row:first-child .w_priority button.w_priority_star").toHaveCount(2, {
        message:
            "should have two stars for representing each possible value: no star, one star and two stars",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(1, {
        message: "should have one full star since the value is the second value",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(1, {
        message: "should have one empty star since the value is the second value",
    });

    // switch to edit mode and check the result
    await click("tbody td:not(.w_list_record_selector)");
    await animationFrame();

    expect(".w_data_row:first-child .w_priority button.w_priority_star").toHaveCount(2, {
        message:
            "should have two stars for representing each possible value: no star, one star and two stars",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(1, {
        message: "should have one full star since the value is the second value",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(1, {
        message: "should have one empty star since the value is the second value",
    });

    // save
    await click(".w_control_panel_main_buttons .w_list_button_save");
    await animationFrame();

    expect(".w_data_row:first-child .w_priority button.w_priority_star").toHaveCount(2, {
        message:
            "should have two stars for representing each possible value: no star, one star and two stars",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(1, {
        message: "should have one full star since the value is the second value",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(1, {
        message: "should have one empty star since the value is the second value",
    });

    // click on the first star in readonly mode
    await click(".w_priority button.w_priority_star[data-icon='star'].oi-filled");
    await animationFrame();

    expect(".w_data_row:first-child .w_priority button.w_priority_star").toHaveCount(2, {
        message: "should still have two stars",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(0, {
        message: "should now have no full star since the value is the first value",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(2, {
        message: "should now have two empty stars since the value is the first value",
    });

    // re-enter edit mode to force re-rendering the widget to check if the value was correctly saved
    await click("tbody td:not(.w_list_record_selector)");
    await animationFrame();

    expect(".w_data_row:first-child .w_priority button.w_priority_star").toHaveCount(2, {
        message: "should still have two stars",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(0, {
        message: "should now have no full star since the value is the first value",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(2, {
        message: "should now have two empty stars since the value is the first value",
    });

    // Click on second star in edit mode
    await click(".w_priority button.w_priority_star[data-icon='star']:not(.oi-filled):last");
    await animationFrame();

    expect(".w_data_row:last-child .w_priority button.w_priority_star").toHaveCount(2, {
        message: "should still have two stars",
    });
    expect(
        ".w_data_row:last-child .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(2, {
        message: "should now have two full stars since the value is the third value",
    });
    expect(
        ".w_data_row:last-child .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(0, {
        message: "should now have no empty star since the value is the third value",
    });

    // save
    await click(".w_control_panel_main_buttons .w_list_button_save");
    await animationFrame();

    expect(".w_data_row:last-child .w_priority button.w_priority_star").toHaveCount(2, {
        message: "should still have two stars",
    });
    expect(
        ".w_data_row:last-child .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(2, {
        message: "should now have two full stars since the value is the third value",
    });
    expect(
        ".w_data_row:last-child .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(0, {
        message: "should now have no empty star since the value is the third value",
    });
});

test.tags("desktop");
test("PriorityField hover in editable list view", async () => {
    onRpc("has_group", () => true);
    await mountView({
        type: "list",
        resModel: "partner",
        arch: /* xml */ `<list editable="bottom"><field name="selection" widget="priority" /></list>`,
    });

    expect(".w_data_row:first-child .w_priority:not(.w_field_empty)").toHaveCount(1);
    expect(".w_data_row:first-child .w_priority button.w_priority_star").toHaveCount(2, {
        message:
            "should have two stars for representing each possible value: no star, one star and two stars",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(1, {
        message: "should have one full star since the value is the second value",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(1, {
        message: "should have one empty star since the value is the second value",
    });

    // hover last star
    const star =
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled):last";
    await hover(star);
    await animationFrame();

    expect(".w_data_row:first-child .w_priority button.w_priority_star").toHaveCount(2);
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(2, {
        message: "should temporary have two full stars since we are hovering the third value",
    });
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(0, {
        message: "should temporary have no empty star since we are hovering the third value",
    });

    await leave(star);
    await animationFrame();

    expect(".w_data_row:first-child .w_priority button.w_priority_star").toHaveCount(2);
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(1);
    expect(
        ".w_data_row:first-child .w_priority button.w_priority_star[data-icon='star']:not(.oi-filled)"
    ).toHaveCount(1);
});

test("PriorityField with readonly attribute", async () => {
    onRpc("write", () => {
        expect.step("write");
        throw new Error("should not save");
    });

    await mountView({
        type: "form",
        resModel: "partner",
        resId: 2,
        arch: '<form><field name="selection" widget="priority" readonly="1"/></form>',
    });

    expect("span.w_priority_star[data-icon='star']:not(.oi-filled)").toHaveCount(2, {
        message: "stars of priority widget should rendered with span tag if readonly",
    });
    await hover(".w_priority_star[data-icon='star']:not(.oi-filled):last");
    await animationFrame();
    expect.step("hover");
    expect(
        ".w_field_widget .w_priority button.w_priority_star[data-icon='star'].oi-filled"
    ).toHaveCount(0, {
        message: "should have no full stars on hover since the field is readonly",
    });
    await click(".w_priority_star[data-icon='star']:not(.oi-filled):last");
    await animationFrame();
    expect.step("click");
    expect("span.w_priority_star[data-icon='star']:not(.oi-filled)").toHaveCount(2, {
        message: "should still have two stars",
    });
    expect.verifySteps(["hover", "click"]);
});

test('PriorityField edited by the smart action "Set priority..."', async () => {
    await mountView({
        type: "form",
        resModel: "partner",
        arch: /* xml */ `<form><field name="selection" widget="priority"/></form>`,
        resId: 1,
    });

    expect("button[data-icon='star'].oi-filled").toHaveCount(1);

    await press(["control", "k"]);
    await animationFrame();
    const idx = queryAllTexts(".w_command").indexOf("Set priority...\nALT + R");
    expect(idx).toBeGreaterThan(-1);
    await click(queryAll(".w_command")[idx]);
    await animationFrame();
    expect(queryAllTexts(".w_command")).toEqual(["Normal", "Blocked", "Done"]);
    await click("#o_command_2");
    await animationFrame();
    expect("button[data-icon='star'].oi-filled").toHaveCount(2);
});

test("PriorityField readonly tooltip", async () => {
    await mountView({
        type: "form",
        resModel: "partner",
        resId: 1,
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="selection" widget="priority" readonly="1"/>
                    </group>
                </sheet>
            </form>`,
    });

    // check data-tooltip attribute on readonly spans
    const spans = queryAll(".w_field_widget .w_priority span.w_priority_star");
    expect(spans[0]).toHaveAttribute("data-tooltip", "Blocked");
    expect(spans[1]).toHaveAttribute("data-tooltip", "Blocked");
});
