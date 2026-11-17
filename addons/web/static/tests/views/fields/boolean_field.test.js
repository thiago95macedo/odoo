import { expect, test } from "@weth/hoot";
import { check, click, press, uncheck } from "@weth/hoot-dom";
import { animationFrame } from "@weth/hoot-mock";
import {
    clickSave,
    defineModels,
    fields,
    models,
    mountView,
    onRpc,
} from "@web/../tests/web_test_helpers";

class Partner extends models.Model {
    bar = fields.Boolean({ default: true });

    _records = [
        { id: 1, bar: true },
        { id: 2, bar: true },
        { id: 3, bar: true },
        { id: 4, bar: true },
        { id: 5, bar: false },
    ];
}

defineModels([Partner]);

test("boolean field in form view", async () => {
    await mountView({
        resModel: "partner",
        resId: 1,
        type: "form",
        arch: `
            <form>
                <label for="bar" string="Awesome checkbox"/>
                <field name="bar"/>
            </form>
        `,
    });
    expect(`.w_field_boolean input`).toBeChecked();
    expect(`.w_field_boolean input`).toBeEnabled();

    await uncheck(`.w_field_boolean input`);
    await animationFrame();
    expect(`.w_field_boolean input`).not.toBeChecked();

    await clickSave();
    expect(`.w_field_boolean input`).not.toBeChecked();

    await check(`.w_field_boolean input`);
    await animationFrame();
    expect(`.w_field_boolean input`).toBeChecked();

    await uncheck(`.w_field_boolean input`);
    await animationFrame();
    expect(`.w_field_boolean input`).not.toBeChecked();

    await click(`.w_form_view label:not(.form-check-label)`);
    await animationFrame();
    expect(`.w_field_boolean input`).toBeChecked();

    await click(`.w_form_view label:not(.form-check-label)`);
    await animationFrame();
    expect(`.w_field_boolean input`).not.toBeChecked();

    await press("enter");
    await animationFrame();
    expect(`.w_field_boolean input`).toBeChecked();

    await press("enter");
    await animationFrame();
    expect(`.w_field_boolean input`).not.toBeChecked();

    await press("enter");
    await animationFrame();
    expect(`.w_field_boolean input`).toBeChecked();

    await clickSave();
    expect(`.w_field_boolean input`).toBeChecked();
});

test("boolean field in editable list view", async () => {
    onRpc("has_group", () => true);

    await mountView({
        resModel: "partner",
        type: "list",
        arch: `<list editable="bottom"><field name="bar"/></list>`,
    });
    expect(`tbody td:not(.w_list_record_selector) .w-checkbox input`).toHaveCount(5);
    expect(`tbody td:not(.w_list_record_selector) .w-checkbox input:checked`).toHaveCount(4);

    // Edit a line
    const cell = `tr.w_data_row td:not(.w_list_record_selector):first`;
    expect(`${cell} .w-checkbox input:only`).toBeChecked();
    expect(`${cell} .w-checkbox input:only`).not.toBeEnabled();

    await click(`${cell} .w-checkbox`);
    await animationFrame();
    expect(`tr.w_data_row:nth-child(1)`).toHaveClass("o_selected_row", {
        message: "the row is now selected, in edition",
    });
    expect(`${cell} .w-checkbox input:only`).not.toBeChecked();
    expect(`${cell} .w-checkbox input:only`).toBeEnabled();

    await click(`${cell} .w-checkbox`);
    await click(cell);
    await animationFrame();
    expect(`${cell} .w-checkbox input:only`).toBeChecked();
    expect(`${cell} .w-checkbox input:only`).toBeEnabled();

    await click(`${cell} .w-checkbox`);
    await animationFrame();

    await click(`.w_list_button_save`);
    await animationFrame();
    expect(`${cell} .w-checkbox input:only`).not.toBeChecked();
    expect(`${cell} .w-checkbox input:only`).not.toBeEnabled();
    expect(`tbody td:not(.w_list_record_selector) .w-checkbox input`).toHaveCount(5);
    expect(`tbody td:not(.w_list_record_selector) .w-checkbox input:checked`).toHaveCount(3);

    // Fake-check the checkbox
    await click(cell);
    await animationFrame();
    await click(`${cell} .w-checkbox`);
    await animationFrame();

    await click(`.w_list_button_save`);
    await animationFrame();
    expect(`tbody td:not(.w_list_record_selector) .w-checkbox input`).toHaveCount(5);
    expect(`tbody td:not(.w_list_record_selector) .w-checkbox input:checked`).toHaveCount(3);
});

test("readonly boolean field", async () => {
    await mountView({
        resModel: "partner",
        resId: 1,
        type: "form",
        arch: `<form><field name="bar" readonly="1"/></form>`,
    });
    expect(`.w_field_boolean input`).toBeChecked();
    expect(`.w_field_boolean input`).not.toBeEnabled();

    await click(`.w_field_boolean .w-checkbox`);
    await animationFrame();
    expect(`.w_field_boolean input`).toBeChecked();
    expect(`.w_field_boolean input`).not.toBeEnabled();
});

test("onchange return value before toggle checkbox", async () => {
    Partner._onChanges.bar = (record) => {
        record["bar"] = true;
    };

    await mountView({
        resModel: "partner",
        resId: 1,
        type: "form",
        arch: `<form><field name="bar"/></form>`,
    });
    expect(`.w_field_boolean input`).toBeChecked();

    await click(`.w_field_boolean .w-checkbox`);
    await animationFrame();
    await animationFrame();
    expect(`.w_field_boolean input`).toBeChecked();
});

test.tags("desktop");
test("Should not display as boolean toggle on desktop", async () => {
    await mountView({
        resModel: "partner",
        resId: 1,
        type: "form",
        arch: `<form><field name="bar"/></form>`,
    });
    expect(".w-checkbox").not.toHaveClass("o_boolean_toggle");
});

test.tags("mobile");
test("Display as boolean toggle on mobile", async () => {
    await mountView({
        resModel: "partner",
        resId: 1,
        type: "form",
        arch: `<form><field name="bar"/></form>`,
    });
    expect(".w-checkbox").toHaveClass("o_boolean_toggle");
});
