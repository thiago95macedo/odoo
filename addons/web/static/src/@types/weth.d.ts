interface WethModuleErrors {
    cycle?: string | null;
    failed?: Set<string>;
    missing?: Set<string>;
    unloaded?: Set<string>;
}

interface WethModuleFactory {
    deps: string[];
    fn: WethModuleFactoryFn;
    ignoreMissingDeps: boolean;
}

class WethModuleLoader {
    bus: EventTarget;
    checkErrorProm: Promise<void> | null;
    debug: boolean;
    /**
     * Mapping [name => factory]
     */
    factories: Map<string, WethModuleFactory>;
    /**
     * Names of failed modules
     */
    failed: Set<string>;
    /**
     * Names of modules waiting to be started
     */
    jobs: Set<string>;
    /**
     * Mapping [name => module]
     */
    modules: Map<string, WethModule>;

    constructor(root?: HTMLElement);
    addJob: (name: string) => void;
    define: (
        name: string,
        deps: string[],
        factory: WethModuleFactoryFn,
        lazy?: boolean
    ) => WethModule;
    findErrors: (jobs?: Iterable<string>) => WethModuleErrors;
    findJob: () => string | null;
    reportErrors: (errors: WethModuleErrors) => Promise<void>;
    require: (dependency: string) => WethModule;
    sortFactories: () => void;
    startModule: (name: string) => WethModule;
    startModules: () => void;
}

type WethModule = Record<string, any>;

type WethModuleFactoryFn = (require: (dependency: string) => WethModule) => WethModule;

declare const weth: {
    csrf_token: string;
    debug: string;
    define: WethModuleLoader["define"];
    loader: WethModuleLoader;
    translationContext?: string;
};
