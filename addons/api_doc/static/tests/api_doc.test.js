import { DocClient } from "@api_doc/doc_client";
import { startDocClient } from "@api_doc/start_doc_client";
import { DocCopyablePre } from "@api_doc/components/doc_copyable_pre";
import { mockDocIndex, mockDocModel } from "./doc_test_helpers";
import { keyDown, keyUp, queryAll, queryAllTexts, queryFirst, resize } from "@weth/hoot-dom";
import {
    after,
    animationFrame,
    expect,
    getFixture,
    press,
    test,
    tick,
    waitFor
} from "@weth/hoot";

import {
    contains,
    makeMockServer,
    mountWithCleanup,
    onRpc,
    patchWithCleanup,
} from "@web/../tests/web_test_helpers";

function setupMockModel(modelNames) {
    onRpc("/doc/index.json", () => {
        return mockDocIndex(modelNames);
    });
    modelNames.forEach((modelName) => {
        onRpc(`/doc/${modelName}.json`, () => {
            const model = mockDocModel(modelName);
            return model;
        });
    });
}

async function setupDocModel(index = 0, modelNames = ["M1", "M2", "M3"]) {
    setupMockModel(modelNames);
    const docClient = await mountWithCleanup(DocClient, {});
    await waitFor(".w-doc-sidebar-content div a");
    await contains(`.w-doc-sidebar-content div a:eq(${index})`).click();
    await contains(".w-doc-model-aside .w-doc-module-checks").click();
    await waitFor(".w-doc-method");
    return docClient;
}
function getCodeEditorDomValue(target = "") {
    return queryAll(`${target} .ace_line`)
        .map((root) => queryAllTexts(`:scope > span`, { root }).join(""))
        .join("\n");
}

const SMALL_WIDTH = 800;
const MEDIUM_WIDTH = 1100;
const LARGE_WIDTH = 1400;
const toggleSidebar = () => contains("header button:has([data-icon=dock_to_right])").click();
const toggleAside = () => contains("header button:has([data-icon=dock_to_left])").click();

// ---- Tests ----

test.tags("desktop")
test("Simple test, load sidebar and aside", async () => {
    setupMockModel(["M1", "M2", "M3"]);
    await mountWithCleanup(DocClient, {});
    await animationFrame();
    expect(".w-doc-sidebar-content div a").toHaveCount(3);
    expect(".w-doc-sidebar-content div a:eq(0)").toHaveText("Model_M1\nM1");
    expect(".w-doc-sidebar-content div a:eq(1)").toHaveText("Model_M2\nM2");
    expect(".w-doc-sidebar-content div a:eq(2)").toHaveText("Model_M3\nM3");

    await contains(".w-doc-sidebar-content div a:eq(0)").click();
    expect(".w-doc-model h2").toHaveText("Model_M1");
    expect(".w-doc-model-aside .w-doc-module-checks").toHaveText("test_module");

    await contains(".w-doc-model-aside .w-doc-module-checks").click();
    await waitFor(".w-doc-model-aside .w-doc-aside-methods")
    expect(".w-doc-model-aside .w-doc-aside-methods").toHaveCount(2);
    expect(".w-doc-model-aside .w-doc-aside-methods:eq(0)").toHaveText("method_1_M1");
    expect(".w-doc-model-aside .w-doc-aside-methods:eq(1)").toHaveText("method_2_M1");
});

test.tags("desktop")
test("Methods are parsed properly", async () => {
    await setupDocModel();

    expect(".w-doc-method").toHaveCount(2);
    expect(".w-doc-method:eq(0) .w-doc-method-header").toHaveText("method_1_M1\n#\ntest_module");
    expect(".w-doc-method:eq(1) .w-doc-method-header").toHaveText("method_2_M1\n#\ntest_module");
    expect(`.w-doc-method-header:eq(0) a`).toHaveAttribute("href", "#method_1_M1");
    expect(`.w-doc-method-header:eq(1) a`).toHaveAttribute("href", "#method_2_M1");

    await contains(".w-doc-method:eq(1) .w-doc-method-header").click();
    expect(".w-doc-method pre").toHaveCount(2);
    expect(".w-doc-method pre:eq(0)").toHaveText("/json/2/M1/method_1_M1");
    expect(".w-doc-method pre:eq(1)").toHaveText("None");

    expect(".w-doc-method .doc_method_description").toHaveCount(2);
    expect(".w-doc-method .doc_method_description:eq(0)").toHaveText("This is a method.");
    expect(".w-doc-method .doc_method_description:eq(1)").toHaveText("Some return doc");

    expect(".w-doc-method .w-doc-table tr").toHaveCount(3);
    expect(".w-doc-method .w-doc-table tr:eq(1)").toHaveText("param_a list[int] null");
    expect(".w-doc-method .w-doc-table tr:eq(2)").toHaveText("param_b int null");
});

test.tags("desktop")
test("Fields are parsed properly", async () => {
    await setupDocModel();
    expect(".w-doc-table").toHaveCount(3, {
        message: "There should be 2 'o-doc-table': fields + 2 method parameters"
    });
    expect(".w-doc-table:eq(0) tr").toHaveCount(3);
    expect(".w-doc-table:eq(0) tr:eq(1) td").toHaveCount(6);

    const firstRow = ["field_1_M1", "string", "Field 1 M1", "optional", "", "test_module"];
    const secondRow = ["field_2_M1", "boolean", "Field 2 M1", "optional", "", "test_module"];

    firstRow.forEach((value, index) => {
        expect(`.w-doc-table:eq(0) tr:eq(1) td:eq(${index})`).toHaveText(value);
    });
    secondRow.forEach((value, index) => {
        expect(`.w-doc-table:eq(0) tr:eq(2) td:eq(${index})`).toHaveText(value);
    });
});

test.tags("desktop")
test("Request editor", async () => {
    await setupDocModel();
    expect(".ace_layer.ace_text-layer").toHaveCount(2);
    await contains(".w-doc-method:eq(1) .w-doc-method-header").click();

    expect(getCodeEditorDomValue()).toBe(`{\n"context"{},\n"param_a",\n"param_b"\n}`);

    await contains(".o_doc_request select").select("javascript");
    await animationFrame();
    expect(getCodeEditorDomValue()).toEqual(
        `(async()=>{
        // You MUST store this key securely. Place it in an
        // environment variable or in in a file outside of
        // git (e.g. your home directory).
        constapiKey="YOUR_API_KEY";

        constrequest={
        method:"POST",
        headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+apiKey,
        // "X-Weth-Database": "...",
        },
        body:JSON.stringify({
        context:{},
        param_a:null,
        param_b:null
        }),
        };

        constresponse=awaitfetch("${window.location.origin}/json/2/M1/method_1_M1",request);
        if(response.ok){
        constdata=awaitresponse.json();
        console.log(data)
        }else{
        // Handle errors
        }
        })();`.replace(/  +/g, "")
    );
});

test.tags("desktop")
test("Generate api key hyperlink", async () => {
    patchWithCleanup(window, {
        open: (...args) => {
            expect.step(`callWindowOpen ${args[0]}`);
        }
    });
    await setupDocModel();

    expect("header div button").toHaveCount(4);
    await contains("header div button:eq(1)").click();

    expect(".modal a").toHaveText("Generate a new API key here");
    await contains(".modal a").click();

    await expect.waitForSteps([
        `callWindowOpen ${window.location.origin}/weth/action-doc_api_key_wizard`
    ]);
});

test.tags("desktop")
test("Run request and get rpc error", async () => {
    patchWithCleanup(window, {
        open: (...args) => {
            expect.step(`callWindowOpen ${args[0]}`);
        }
    });
    await setupDocModel();

    expect("header div button").toHaveCount(4);
    await contains("header div button:eq(1)").click();

    expect(".modal a").toHaveText("Generate a new API key here");
    await contains(".modal input").edit("meow");
    await contains(".modal div button").click();

    await contains(".o_doc_request button").click();
    expect(getCodeEditorDomValue(".w-doc-code-editor:eq(1)")).toEqual(
        `{
        "error"{
        "name""RPC_ERROR",
        "type""server",
        "code"200,
        "data"{
        "name""MockServerError",
        "message""Unimplemented server route: /json/2/M1/method_1_M1"
        },
        "exceptionName""MockServerError",
        "subType""MockServerError",
        "message""Unimplemented server route: /json/2/M1/method_1_M1"
        }
        }`.replace(/  +/g, "")
    );
});

test.tags("desktop")
test("Search for model", async () => {
    await setupDocModel();
    expect(".w-doc-sidebar-content a").toHaveCount(3);
    expect(queryAllTexts(".w-doc-sidebar-content a", { inline: true })).toEqual([
        "Model_M1 M1",
        "Model_M2 M2",
        "Model_M3 M3"
    ]);

    await contains(".w-doc-sidebar input").edit("M2");
    expect(".w-doc-sidebar-content a").toHaveCount(1);
    expect(queryAllTexts(".w-doc-sidebar-content a", { inline: true })).toEqual(["Model_M2 M2"]);
});

// ---- Sidebar & aside ----

test.tags("desktop")
test("Sidebar and aside can be toggled from the header", async () => {
    await setupDocModel();
    expect(".w-doc-client-root").not.toHaveClass("o-doc-small");
    expect(".w-doc-sidebar").toHaveCount(1);
    expect(".w-doc-model-aside").toHaveCount(1);

    await toggleSidebar();
    expect(".w-doc-sidebar").toHaveCount(0);
    expect(".w-doc-model-aside").toHaveCount(1);

    await toggleAside();
    expect(".w-doc-model-aside").toHaveCount(0);

    await toggleSidebar();
    await toggleAside();
    expect(".w-doc-sidebar").toHaveCount(1);
    expect(".w-doc-model-aside").toHaveCount(1);
    expect(".w-doc-panel-backdrop").toHaveCount(0, {
        message: "no backdrop on large screens",
    });
});

test.tags("desktop")
test("Sidebar and aside start collapsed on a small screen", async () => {
    await resize({ width: SMALL_WIDTH });
    setupMockModel(["M1", "M2", "M3"]);
    await mountWithCleanup(DocClient, {});
    await animationFrame();

    expect(".w-doc-client-root").toHaveClass("o-doc-small");
    expect(".w-doc-sidebar").toHaveCount(0);
    expect(".w-doc-panel-backdrop").toHaveCount(0);
});

test.tags("desktop")
test("Sidebar and aside collapse when the window becomes small", async () => {
    await setupDocModel();
    await resize({ width: SMALL_WIDTH });
    await animationFrame();

    expect(".w-doc-client-root").toHaveClass("o-doc-small");
    expect(".w-doc-sidebar").toHaveCount(0);
    expect(".w-doc-model-aside").toHaveCount(0);
    expect(".w-doc-panel-backdrop").toHaveCount(0);
});

test.tags("desktop")
test("Sidebar and aside open as overlays on a small screen", async () => {
    await setupDocModel();
    await resize({ width: SMALL_WIDTH });
    await animationFrame();

    // Opening a panel must not re-trigger the collapse
    await toggleSidebar();
    expect(".w-doc-sidebar").toHaveCount(1);
    expect(".w-doc-panel-backdrop").toHaveCount(1);
    await toggleAside();
    expect(".w-doc-sidebar").toHaveCount(1);
    expect(".w-doc-model-aside").toHaveCount(1);
    expect(".w-doc-panel-backdrop").toHaveCount(1);

    await contains(".w-doc-panel-backdrop").click();
    expect(".w-doc-sidebar").toHaveCount(0);
    expect(".w-doc-model-aside").toHaveCount(0);
    expect(".w-doc-panel-backdrop").toHaveCount(0);
});

test.tags("desktop")
test("Sidebar and aside reopen when the window becomes large again", async () => {
    await setupDocModel();
    await resize({ width: SMALL_WIDTH });
    await animationFrame();
    expect(".w-doc-sidebar").toHaveCount(0);

    await resize({ width: LARGE_WIDTH });
    await animationFrame();
    expect(".w-doc-client-root").not.toHaveClass("o-doc-small");
    expect(".w-doc-sidebar").toHaveCount(1);
    expect(".w-doc-model-aside").toHaveCount(1);
    expect(".w-doc-panel-backdrop").toHaveCount(0);
});

test.tags("desktop")
test("Header buttons have alt hotkeys", async () => {
    setupMockModel(["M1"]);
    await makeMockServer();
    const app = await startDocClient(getFixture());
    after(() => app.destroy());
    await contains(".w-doc-sidebar-content div a:eq(0)").click();
    await waitFor(".w-doc-model-aside");

    await press("alt+l");
    await tick();
    await animationFrame();
    expect(".w-doc-sidebar").toHaveCount(0);

    await press("alt+r");
    await tick();
    await animationFrame();
    expect(".w-doc-model-aside").toHaveCount(0);

    await press("alt+k");
    await tick();
    await animationFrame();
    expect(".modal").toHaveCount(1);
});

test.tags("desktop")
test("Holding alt shows the hotkey overlays with WETH's style", async () => {
    await setupDocModel();
    await keyDown("alt");
    await animationFrame();
    expect(queryAllTexts("header .o_web_hotkey_overlay kbd")).toEqual(["L", "F", "K", "T", "R"]);
    expect(getComputedStyle(queryFirst("header .o_web_hotkey_overlay kbd")).paddingLeft).not.toBe("0px");
    await keyUp("alt");
    await animationFrame();
    expect(".o_web_hotkey_overlay").toHaveCount(0);
});

test("Copy button keeps its own place when the text wraps", async () => {
    await mountWithCleanup(DocCopyablePre, {
        props: { value: "/json/2/some.model/method ".repeat(10) },
    });
    const root = queryFirst(".w-doc-copyable").parentElement;
    root.classList.add("o-doc-client-root");
    root.style.width = "200px";
    await animationFrame();

    const box = queryFirst(".w-doc-copyable").getBoundingClientRect();
    const text = queryFirst(".w-doc-copyable pre").getBoundingClientRect();
    const button = queryFirst(".w-doc-copy-btn").getBoundingClientRect();
    expect(text.height).toBeGreaterThan(button.height * 2, { message: "the text wraps" });
    expect(button.left).toBeGreaterThan(text.right - 1, { message: "the button is next to the text, not over it" });
    expect(button.right).toBeLessThan(box.right + 1, { message: "the button stays inside the box" });
    expect(button.top - box.top).toBeLessThan(button.height, { message: "the button stays on the first line" });
});

test.tags("desktop")
test("Escape closes the overlay panels on a small screen", async () => {
    await setupDocModel();
    await resize({ width: SMALL_WIDTH });
    await animationFrame();
    await toggleSidebar();
    await toggleAside();
    expect(".w-doc-panel-backdrop").toHaveCount(1);

    await press("escape");
    await animationFrame();
    expect(".w-doc-sidebar").toHaveCount(0);
    expect(".w-doc-model-aside").toHaveCount(0);
    expect(".w-doc-panel-backdrop").toHaveCount(0);
});

test.tags("desktop")
test("Escape only closes the aside overlay on a medium screen", async () => {
    await resize({ width: LARGE_WIDTH });
    await setupDocModel();
    await resize({ width: MEDIUM_WIDTH });
    await animationFrame();
    await toggleAside();
    expect(".w-doc-model-aside").toHaveCount(1);

    await press("escape");
    await animationFrame();
    expect(".w-doc-model-aside").toHaveCount(0);
    expect(".w-doc-sidebar").toHaveCount(1, { message: "the sidebar is inline, not an overlay" });
});

test.tags("desktop")
test("Escape closes an open modal before the panels", async () => {
    await setupDocModel();
    await resize({ width: SMALL_WIDTH });
    await animationFrame();
    await toggleSidebar();
    await contains("header button:has([data-icon=search])").click();
    expect(".modal").toHaveCount(1);

    await press("escape");
    await animationFrame();
    expect(".modal").toHaveCount(0);
    expect(".w-doc-sidebar").toHaveCount(1);

    await press("escape");
    await animationFrame();
    expect(".w-doc-sidebar").toHaveCount(0);
});

test.tags("desktop")
test("Selecting a model closes the sidebar on a small screen only", async () => {
    await setupDocModel();
    await contains(".w-doc-sidebar-content div a:eq(1)").click();
    expect(".w-doc-model h2").toHaveText("Model_M2");
    expect(".w-doc-sidebar").toHaveCount(1, { message: "inline sidebar stays open" });

    await resize({ width: SMALL_WIDTH });
    await animationFrame();
    await toggleSidebar();
    await contains(".w-doc-sidebar-content div a:eq(2)").click();
    expect(".w-doc-model h2").toHaveText("Model_M3");
    expect(".w-doc-sidebar").toHaveCount(0);
    expect(".w-doc-panel-backdrop").toHaveCount(0);
});

test.tags("desktop")
test("Selecting a method closes the aside overlay only", async () => {
    await resize({ width: LARGE_WIDTH });
    await setupDocModel();
    await contains(".w-doc-model-aside .w-doc-aside-methods:eq(0)").click();
    expect(".w-doc-model-aside").toHaveCount(1, { message: "inline aside stays open" });

    await resize({ width: MEDIUM_WIDTH });
    await animationFrame();
    await toggleAside();
    await contains(".w-doc-model-aside .w-doc-aside-methods:eq(1)").click();
    expect(".w-doc-model-aside").toHaveCount(0);
    expect(".w-doc-panel-backdrop").toHaveCount(0);
});
