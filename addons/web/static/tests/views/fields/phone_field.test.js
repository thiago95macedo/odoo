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
import { afterEach, beforeEach, expect, test } from "@weth/hoot";
import { click, edit, pointerDown, queryFirst, queryOne } from "@weth/hoot-dom";
import { getNextTabableElement } from "@web/core/utils/ui";
import { animationFrame } from "@weth/hoot-mock";
import { browser } from "@web/core/browser/browser";
import { callPhoneNumber, phoneCallHandlerRegistry } from "@web/core/phone/phone_call";
import { user } from "@web/core/user";

class Partner extends models.Model {
    foo = fields.Char({ default: "My little Foo Value", trim: true });
    foo_formatted = fields.Char();
    foo_sanitized = fields.Char();
    name = fields.Char();

    _records = [{ foo: "yop" }, { foo: "blip" }];
}

defineModels([Partner]);

async function assertUrl(target, url) {
    expect(target).toHaveAttribute("href", url);
    await contains(target, {
        visible: false,
    }).click();
    expect.verifySteps([url]);
}

beforeEach(() => {
    patchWithCleanup(browser, {
        open(url) {
            expect.step(url);
        },
    });
});

afterEach(() => {
    if (phoneCallHandlerRegistry.contains("test")) {
        phoneCallHandlerRegistry.remove("test");
    }
});

test("callPhoneNumber reports that it opened the native phone link", () => {
    patchWithCleanup(user, { isSystem: false });
    const callMade = callPhoneNumber({ services: {} }, { phoneNumber: "+12 (345) 67-89" });

    expect(callMade).toBe(true);
    expect.verifySteps(["tel:+123456789"]);
});

test("PhoneField delegates calls to an applicable phone call handler", async () => {
    phoneCallHandlerRegistry.add(
        "test",
        {
            isApplicable(_env, params) {
                expect.step(`applicable ${params.phoneNumber}`);
                return true;
            },
            execute(_env, params) {
                expect(params).toEqual({
                    phoneNumber: "yop",
                    resId: 1,
                    resModel: "partner",
                });
                expect.step("handled");
                return true;
            },
        },
        { sequence: 1 }
    );
    await mountView({
        type: "form",
        resModel: "partner",
        readonly: true,
        arch: /* xml */ `<form><field name="foo" widget="phone"/></form>`,
        resId: 1,
    });

    await click(".w_field_phone .w_phone_form_link");

    expect.verifySteps(["applicable yop", "handled"]);
});

test("PhoneField in form view on normal screens (readonly)", async () => {
    await mountView({
        type: "form",
        resModel: "partner",
        readonly: true,
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="foo" widget="phone"/>
                    </group>
                </sheet>
            </form>`,
        resId: 1,
    });
    expect(".w_field_phone .w_phone_form_link").toHaveCount(1);
    expect(".w_field_phone span:first-child").toHaveText("yop");
    await assertUrl(`.w_field_phone .w_phone_form_link`, "tel:yop");
    expect(".w_field_phone span:first-child").toHaveClass("o_force_ltr");
});

test("PhoneField in form view on normal screens (edit)", async () => {
    await mountView({
        type: "form",
        resModel: "partner",
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="foo" widget="phone"/>
                    </group>
                </sheet>
            </form>`,
        resId: 1,
    });
    expect(`input[type="tel"]`).toHaveCount(1);
    expect(`input[type="tel"]`).toHaveValue("yop");
    expect(".w_field_phone a i[data-icon='phone']").toHaveCount(1);
    await assertUrl(`.w_field_widget a.w_phone_form_link`, "tel:yop");

    // change value in edit mode
    await click(`input[type="tel"]`);
    await edit("new");
    await animationFrame();
    // save
    await clickSave();
    expect(`input[type="tel"]`).toHaveValue("new");
});

test("PhoneField can hide action buttons", async () => {
    await mountView({
        type: "form",
        resModel: "partner",
        arch: /* xml */ `
            <form>
                <field name="foo" widget="phone" options="{'display_buttons': False}"/>
            </form>`,
        resId: 1,
    });

    expect(".w_field_widget[name='foo'] input").toHaveValue("yop");
    expect(".w_field_widget[name='foo'] .w_phone_form_link").toHaveCount(0);
});

test("PhoneField in editable list view on normal screens", async () => {
    onRpc("has_group", () => true);
    await mountView({
        type: "list",
        resModel: "partner",
        arch: '<list editable="bottom"><field name="foo" widget="phone"/></list>',
    });
    expect("tbody td:not(.w_list_record_selector).w_data_cell").toHaveCount(2);
    expect("tbody td:not(.w_list_record_selector) span:first-child:eq(0)").toHaveText("yop");
    expect(".w_field_widget .w_phone_form_link").toHaveCount(0);

    // Edit a line and check the result
    const cell = queryFirst("tbody td:not(.w_list_record_selector)");
    await click(cell);
    await animationFrame();
    expect(cell.parentElement).toHaveClass("o_selected_row");
    expect(`tbody td:not(.w_list_record_selector) input`).toHaveValue("yop");

    await click(`tbody td:not(.w_list_record_selector) input`);
    await edit("new");
    await animationFrame();
    await click(".w_control_panel_main_buttons .w_list_button_save");
    await animationFrame();

    expect(".w_selected_row").toHaveCount(0);
    expect("tbody td:not(.w_list_record_selector) span:first-child:eq(0)").toHaveText("new");
    expect(".w_field_widget .w_phone_form_link").toHaveCount(0);
});

test("use TAB to navigate to a PhoneField", async () => {
    await mountView({
        type: "form",
        resModel: "partner",
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="name"/>
                        <field name="foo" widget="phone"/>
                    </group>
                </sheet>
            </form>`,
    });

    await pointerDown(".w_field_widget[name=name] input");

    expect(".w_field_widget[name=name] input").toBeFocused();
    expect(queryOne`[name="foo"] input:only`).toBe(getNextTabableElement());
});

test("phone field with placeholder", async () => {
    Partner._fields.foo.default = false;
    await mountView({
        type: "form",
        resModel: "partner",
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="foo" widget="phone" placeholder="Placeholder"/>
                    </group>
                </sheet>
            </form>`,
    });
    expect(".w_field_widget[name='foo'] input").toHaveProperty("placeholder", "Placeholder");
});

test("placeholder_field shows as placeholder", async () => {
    Partner._fields.char = fields.Char({
        default: "My Placeholder",
    });
    await mountView({
        type: "form",
        resModel: "partner",
        arch: `<form>
            <field name="foo" widget="phone" options="{'placeholder_field' : 'char'}"/>
            <field name="char"/>
        </form>`,
    });
    expect(`.w_field_phone input`).toHaveAttribute("placeholder", "My Placeholder");
});

test("unset and readonly PhoneField", async () => {
    Partner._fields.foo.default = false;
    await mountView({
        type: "form",
        resModel: "partner",

        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="foo" widget="phone" readonly="1" placeholder="Placeholder"/>
                    </group>
                </sheet>
            </form>`,
    });
    expect(".w_field_widget[name='foo'] a").toHaveCount(0);
});

test("url is correctly called in readonly", async () => {
    Partner._records[0].foo = "+12 345 67 89 00";
    await mountView({
        type: "form",
        resModel: "partner",
        readonly: true,
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="foo" widget="phone"/>
                    </group>
                </sheet>
            </form>`,
        resId: 1,
    });

    expect(".w_field_phone span:first-child").toHaveText("+12 345 67 89 00");
    await assertUrl(`.w_field_widget .w_phone_form_link`, "tel:+12345678900");
});

test("url uses sanitized field while displaying formatted value in readonly", async () => {
    Partner._records[0].foo = "2025550124";
    Partner._records[0].foo_formatted = "+1 202-555-0124";
    Partner._records[0].foo_sanitized = "+12025550124";
    await mountView({
        type: "form",
        resModel: "partner",
        readonly: true,
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="foo_formatted" invisible="1"/>
                        <field name="foo_sanitized" invisible="1"/>
                        <field name="foo" widget="phone"/>
                    </group>
                </sheet>
            </form>`,
        resId: 1,
    });

    expect(".w_field_phone span:first-child").toHaveText("+1 202-555-0124");
    await assertUrl(`.w_field_widget .w_phone_form_link`, "tel:+12025550124");
});

test("New record, fill in phone field, then click on call icon and save", async () => {
    await mountView({
        type: "form",
        resModel: "partner",
        arch: /* xml */ `
            <form>
                <sheet>
                    <group>
                        <field name="name" required="1"/>
                        <field name="foo" widget="phone"/>
                    </group>
                </sheet>
            </form>`,
    });

    await contains(".w_field_widget[name=name] input").edit("TEST");
    await contains(".w_field_widget[name=foo] input").edit("+12345678900");

    await click(`input[type="tel"]`);

    expect(`.w_form_status_indicator_buttons`).not.toHaveClass("invisible");

    await clickSave();

    expect(".w_field_widget[name=name] input").toHaveValue("TEST");
    expect(".w_field_widget[name=foo] input").toHaveValue("+12345678900");
    expect(`.w_form_status_indicator_buttons`).toHaveClass("invisible");
});

test("action buttons are form-only: a list cell shows the number with no buttons", async () => {
    onRpc("has_group", () => true);
    await mountView({
        type: "list",
        resModel: "partner",
        arch: `<list><field name="foo" widget="phone"/></list>`,
    });
    // The (formatted) value is still rendered...
    expect("tbody td:not(.w_list_record_selector) span:first-child:eq(0)").toHaveText("yop");
    // ...but no Call/SMS/WhatsApp button (form-only).
    expect(".w_field_widget .w_phone_form_link").toHaveCount(0);
});
