// @weth-module ignore
// ! WARNING: this module must be loaded after `module_loader` but cannot have dependencies !

(function (weth) {
    "use strict";

    if (weth.define.name.endsWith("(hoot)")) {
        return;
    }

    const name = `${weth.define.name} (hoot)`;
    weth.define = {
        [name](name, dependencies, factory) {
            return weth.loader.define(name, dependencies, factory, !name.endsWith(".hoot"));
        },
    }[name];
})(globalThis.weth);
