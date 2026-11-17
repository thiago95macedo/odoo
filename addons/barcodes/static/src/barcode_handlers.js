import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { getVisibleElements } from "@web/core/utils/ui";
import { Macro } from "@web/core/macro";

const ACTION_HELPERS = {
    click(el) {
        el.dispatchEvent(new MouseEvent("mouseover"));
        el.dispatchEvent(new MouseEvent("mouseenter"));
        el.dispatchEvent(new MouseEvent("mousedown"));
        el.dispatchEvent(new MouseEvent("mouseup"));
        el.click();
        el.dispatchEvent(new MouseEvent("mouseout"));
        el.dispatchEvent(new MouseEvent("mouseleave"));
    },
    text(el, value) {
        this.click(el);
        el.value = value;
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
        el.dispatchEvent(new InputEvent("change", { bubbles: true }));
    },
};

function clickOnButton(selector) {
    const button = document.body.querySelector(selector);
    if (button) {
        button.click();
    }
}
function updatePager(position) {
    const pager = document.body.querySelector("nav.w_pager");
    if (!pager || pager.innerText.includes("-")) {
        // we don't change pages if we are in a multi record view
        return;
    }
    let next;
    if (position === "first") {
        next = 1;
    } else {
        next = parseInt(pager.querySelector(".w_pager_limit").textContent, 10);
    }
    let current = parseInt(pager.innerText.split('/')[0], 10);
    if (current === next) {
        return;
    }
    new Macro({
        name: "updating pager",
        timeout: 1000,
        steps: [
            {
                trigger: "span.w_pager_value",
                async action(trigger) {
                    ACTION_HELPERS.click(trigger);
                },
            },
            {
                trigger: "input.w_pager_value",
                async action(trigger) {
                    ACTION_HELPERS.text(trigger, next);
                },
            },
        ],
    }).start();
}

export const COMMANDS = {
    "OCDEDIT": () => clickOnButton(".w_form_button_edit"),
    "OCDDISC": () => clickOnButton(".w_form_button_cancel"),
    "OCDSAVE": () => clickOnButton(".w_form_button_save"),
    "OCDPREV": () => clickOnButton(".w_pager_previous"),
    "OCDNEXT": () => clickOnButton(".w_pager_next"),
    "OCDPAGERFIRST": () => updatePager("first"),
    "OCDPAGERLAST": () => updatePager("last"),
};

export const barcodeGenericHandlers = {
    dependencies: ["ui", "barcode", "notification"],
    start(env, { ui, barcode, notification }) {

        barcode.bus.addEventListener("barcode_scanned", (ev) => {
            const barcode = ev.detail.barcode;
            if (barcode.startsWith("OBT")) {
                let targets = [];
                try {
                    // the scanned barcode could be anything, and could crash the queryselectorall
                    // function
                    targets = getVisibleElements(ui.activeElement, `[barcode_trigger=${barcode.slice(3)}]`);
                } catch {
                    console.warn(`Barcode '${barcode}' is not valid`);
                }
                for (let elem of targets) {
                    elem.click();
                }
            }
            if (barcode.startsWith("OCD")) {
                const fn = COMMANDS[barcode];
                if (fn) {
                    fn();
                } else {
                    notification.add(_t("Barcode: %(barcode)s", { barcode }), {
                        title: _t("Unknown barcode command"),
                        type: "danger"
                    });
                }
            }
        });
    }
};

registry.category("services").add("barcode_handlers", barcodeGenericHandlers);
