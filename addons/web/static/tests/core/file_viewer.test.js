import { expect, test, waitFor } from "@weth/hoot";
import { animationFrame, click } from "@weth/hoot-dom";
import { mountWithCleanup } from "@web/../tests/web_test_helpers";

import { FileModel } from "@web/core/file_viewer/file_model";
import { FileViewer } from "@web/core/file_viewer/file_viewer";

test("can delete an attachment from the file viewer", async () => {
    const attachment = Object.assign(new FileModel(), {
        id: 1,
        name: "test_image.png",
        mimetype: "image/png",
    });
    await mountWithCleanup(FileViewer, {
        props: {
            files: [attachment],
            startIndex: 0,
            canUnlink: () => true,
            onUnlink: (file) => {
                expect.step(`delete_file ${file.name}`);
                return true;
            },
        },
    });
    await waitFor(".w-FileViewer");
    await click(".w-FileViewer-headerButton[title='Remove']");
    expect.verifySteps(["delete_file test_image.png"]);
});

/**
 * @returns {FileModel}
 */
function makeImage() {
    return Object.assign(new FileModel(), {
        id: 1,
        name: "test_image.png",
        mimetype: "image/png",
    });
}

const RESET_ZOOM_BUTTON =
    ".w-FileViewer-toolbar .w-FileViewer-toolbarButton[title='Reset Zoom (0)']";
const ZOOM_IN_BUTTON = ".w-FileViewer-toolbar .w-FileViewer-toolbarButton[title='Zoom In (+)']";
const ZOOM_OUT_BUTTON = ".w-FileViewer-toolbar .w-FileViewer-toolbarButton[title='Zoom Out (-)']";

test("image toolbar exposes its buttons", async () => {
    await mountWithCleanup(FileViewer, {
        props: { files: [makeImage()], startIndex: 0 },
    });
    await waitFor(".w-FileViewer-toolbar");
    expect(".w-FileViewer-toolbar").toHaveAttribute("role", "toolbar");
    expect(ZOOM_IN_BUTTON).toHaveCount(1);
    expect(RESET_ZOOM_BUTTON).toHaveCount(1);
    expect(`${RESET_ZOOM_BUTTON} i`).toHaveAttribute("data-icon", "recenter");
    expect(ZOOM_OUT_BUTTON).toHaveCount(1);
    expect(".w-FileViewer-toolbar [title='Rotate (r)']").toHaveCount(1);
    expect(".w-FileViewer-toolbar [title='Print']").toHaveCount(1);
    expect(".w-FileViewer-toolbar .w-FileViewer-download").toHaveCount(1);
});

test("reset zoom button is inert at default zoom and active once zoomed", async () => {
    await mountWithCleanup(FileViewer, {
        props: { files: [makeImage()], startIndex: 0 },
    });
    await waitFor(".w-FileViewer-toolbar");
    expect(RESET_ZOOM_BUTTON).toHaveClass(["pe-none", "text-muted"]);

    await click(ZOOM_IN_BUTTON);
    await animationFrame();
    expect(RESET_ZOOM_BUTTON).not.toHaveClass("pe-none");
    expect(RESET_ZOOM_BUTTON).not.toHaveClass("text-muted");

    await click(RESET_ZOOM_BUTTON);
    await animationFrame();
    expect(RESET_ZOOM_BUTTON).toHaveClass(["pe-none", "text-muted"]);
});

test("zoom out button is inert at minimum zoom", async () => {
    await mountWithCleanup(FileViewer, {
        props: { files: [makeImage()], startIndex: 0 },
    });
    await waitFor(".w-FileViewer-toolbar");
    expect(ZOOM_OUT_BUTTON).not.toHaveClass("pe-none");

    // a single zoom out step (0.5) brings the scale down to the minimum (0.5)
    await click(ZOOM_OUT_BUTTON);
    await animationFrame();
    expect(ZOOM_OUT_BUTTON).toHaveClass(["pe-none", "text-muted"]);

    await click(ZOOM_IN_BUTTON);
    await animationFrame();
    expect(ZOOM_OUT_BUTTON).not.toHaveClass("pe-none");
});
