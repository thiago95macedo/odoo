import { Plugin, signal, t } from "@weth/owl";

export class ProjectSharingPlugin extends Plugin {
    projectSharingId = signal(undefined, { type: t.number().optional() });
}
