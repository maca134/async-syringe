export const INJECTION_TOKEN_METADATA_KEY = 'ioc-tokens';
export const REG_OPTS_METADATA_KEY = 'ioc-opts';

export enum Lifecycle {
	/**
	 * Created new instance every time one is resolved
	 */
	Transient = 1,

	/**
	 * Creates a single instance and uses this when the instance is resolved
	 */
	Singleton = 2,

	/**
	 * Creates a single instance per resolve chain
	 */
	Scoped = 3
}

/**
 * Registration options
 */
export type RegistrationOptions<T> = {
	/**
	 * the lifecycle of the class
	 */
	lifecycle?: Lifecycle;

	/**
	 * runs after the class is constucted
	 */
	initialize?: (instance: T) => Promise<void> | void;
};

export type ResolutionContext = {
	scopedResolutions: Map<InjectionToken<any>, Promise<any>>;
};
export type constructor<T> = { new (...args: any[]): T };
export type InjectionToken<T = any> = constructor<T> | string | symbol;
export type ParamInjectionToken<T> = {
	token: InjectionToken<T>;
	multi: boolean;
};
export type Registration<T = any> = {
	resolve: (context: ResolutionContext) => T | Promise<T>;
	params?: ParamInjectionToken<T>[];
	opts?: RegistrationOptions<T>;
};
export type Node = { name: string; lifecycle: string; children: Node[] };

export interface KernelModule {
	load(kernal: Kernel): void;
}

export interface Kernel {
	/**
	 * Register a class with an injection token with options.
	 *
	 * @param token injection token
	 * @param ctor contructor
	 * @param options injection options
	 */
	registerClass<T>(
		token: InjectionToken<T>,
		ctor: constructor<T>,
		options: RegistrationOptions<T>
	): void;

	/**
	 * Register a class with an injection token.
	 *
	 * @param token injection token
	 * @param ctor contructor
	 */
	registerClass<T>(token: InjectionToken<T>, ctor: constructor<T>): void;

	/**
	 * Register a class directly with injection options.
	 *
	 * @param ctor contructor
	 * @param options injection options
	 */
	registerClass<T>(
		ctor: constructor<T>,
		options: RegistrationOptions<T>
	): void;

	/**
	 * Register a class directly.
	 *
	 * @param ctor contructor
	 */
	registerClass<T>(ctor: constructor<T>): void;

	/**
	 * Register a value with an injection token.
	 *
	 * @param token injection token
	 * @param value the value associated with the token
	 */
	registerValue<T>(token: InjectionToken<T>, value: T): void;

	/**
	 * Register a factory with an injection token. The factory can return either the T or Promise<T>.
	 *
	 * @param token injection token
	 * @param factory a factory for initializing the token
	 * @param options injection options
	 */
	registerFactory<T>(
		token: InjectionToken<T>,
		factory: (container: Kernel) => T | Promise<T>,
		options?: Omit<RegistrationOptions<T>, 'initialize'>
	): void;

	/**
	 * Register an injection token to another.
	 *
	 * @param token injection token
	 * @param to injection token
	 */
	registerToken<T>(token: InjectionToken<T>, to: InjectionToken<T>): void;

	/**
	 * Unregister an injection toke
	 *
	 * @param token injection token
	 */
	unregister<T>(token: InjectionToken<T>): void;

	/**
	 * Resolve latest registration for the given injection token.
	 *
	 * @param token injection token
	 * @return An instance or promise of T
	 */
	resolve<T>(token: InjectionToken<T>): Promise<T> | T;

	/**
	 * Resolve all registrations for the given injection token.
	 *
	 * @param token injection token
	 * @return An instance or promise of T
	 */
	resolveAll<T>(token: InjectionToken<T>): Promise<T[]>;

	/**
	 * Load a module.
	 * This is for splitting off registrations.
	 *
	 * @param module an instance of KernelModule
	 */
	load<T extends KernelModule>(module: T): void;

	/**
	 * Get a dependency tree for an injection token.
	 * A new instance of the kernel is created so there are no side-effects on the existing kernel.
	 *
	 * @param token injection token
	 * @return tree node for injection token
	 */
	dependencyTree<T>(token: InjectionToken<T>): Node;
}
