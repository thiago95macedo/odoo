import { beforeEach, describe, expect, test } from "@weth/hoot";
import { getService, makeTestApp } from "@web/../tests/web_test_helpers";

describe.current.tags("headless");

let titleService;

beforeEach(async () => {
    await makeTestApp();
    titleService = getService("title");
});

test("simple title", () => {
    titleService.setParts({ one: "MyWeth" });
    expect(titleService.current).toBe("MyWeth");
});

test("add title part", () => {
    titleService.setParts({ one: "MyWeth", two: null });
    expect(titleService.current).toBe("MyWeth");
    titleService.setParts({ three: "Import" });
    expect(titleService.current).toBe("MyWETH - Import");
});

test("modify title part", () => {
    titleService.setParts({ one: "MyWeth" });
    expect(titleService.current).toBe("MyWeth");
    titleService.setParts({ one: "Zweth" });
    expect(titleService.current).toBe("Zweth");
});

test("delete title part", () => {
    titleService.setParts({ one: "MyWeth" });
    expect(titleService.current).toBe("MyWeth");
    titleService.setParts({ one: null });
    expect(titleService.current).toBe("Weth");
});

test("all at once", () => {
    titleService.setParts({ one: "MyWeth", two: "Import" });
    expect(titleService.current).toBe("MyWETH - Import");
    titleService.setParts({ one: "Zweth", two: null, three: "Sauron" });
    expect(titleService.current).toBe("Zweth - Sauron");
});

test("get title parts", () => {
    expect(titleService.current).toBe("Weth");
    titleService.setParts({ one: "MyWeth", two: "Import" });
    expect(titleService.current).toBe("MyWETH - Import");
    const parts = titleService.getParts();
    expect(parts).toEqual({ one: "MyWeth", two: "Import" });
    parts.action = "Export";
    expect(titleService.current).toBe("MyWETH - Import"); // parts is a copy!
});
