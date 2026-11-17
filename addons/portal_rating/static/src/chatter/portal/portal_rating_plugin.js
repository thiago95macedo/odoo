import { Plugin, signal } from "@weth/owl";

export class PortalRatingPlugin extends Plugin {
    reviewChatter = signal(false);
}
