import { Plugin, signal } from "@weth/owl";

export class RenameThreadPlugin extends Plugin {
    editingName = signal(false);
}
