import { animationFrame } from "@weth/hoot-dom";
import { contains } from "@web/../tests/web_test_helpers";

export async function clickNextOrder() {
    await contains(".feedback-screen .validation").click();
    await animationFrame();
}
