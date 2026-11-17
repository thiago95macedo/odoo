import { waitFor } from "@weth/hoot-dom";
import { contains } from "@web/../tests/web_test_helpers";

export async function expandToolbar() {
    await contains(".w-we-toolbar .btn[name='expand_toolbar'").click();
    await waitFor(".w-we-toolbar[data-namespace='expanded']");
}
