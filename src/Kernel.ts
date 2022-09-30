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
	Scoped = 3,
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
	 * runs after the class is constucted and can return a promise
	 */
	initialize?: (instance: T) => any;
};

export type ResolutionContext = {
	scopedResolutions: Map<InjectionToken<any>, Promise<any>>;
};
export type constructor<T> = { new (...args: any[]): T };
export type InjectionToken<T = any> = constructor<T> | string | symbol;
export type ParamInjectionToken<T> = {
	token: InjectionToken<T>;
	multi: boolean;
	optional: boolean;
	autoFactory: boolean;
};
export enum RegistrationType {
	Class = 1,
	Factory = 2,
	Value = 3,
	Token = 4,
}

export interface RegistrationBase {
	type: RegistrationType;
}

export interface TokenRegistration<T = any> extends RegistrationBase {
	type: RegistrationType.Token;
	value: InjectionToken<T>;
}

export interface ValueRegistration<T = any> extends RegistrationBase {
	type: RegistrationType.Value;
	value: T;
}

export interface FactoryRegistration<T = any> extends RegistrationBase {
	type: RegistrationType.Factory;
	value: (kernel: Kernel) => T | Promise<T>;
	opts: Omit<RegistrationOptions<T>, 'initialize'>;
}

export interface ClassRegistration<T = any> extends RegistrationBase {
	type: RegistrationType.Class;
	params: ParamInjectionToken<T>[];
	opts: RegistrationOptions<T>;
	value: constructor<T>;
}

export type Registration<T = any> =
	| TokenRegistration<T>
	| ValueRegistration<T>
	| FactoryRegistration<T>
	| ClassRegistration<T>;

export function isTokenRegistration<T>(
	reg: Registration<T>,
): reg is TokenRegistration<T> {
	return reg.type === RegistrationType.Token;
}

export function isValueRegistration<T>(
	reg: Registration<T>,
): reg is ValueRegistration<T> {
	return reg.type === RegistrationType.Value;
}

export function isFactoryRegistration<T>(
	reg: Registration<T>,
): reg is FactoryRegistration<T> {
	return reg.type === RegistrationType.Factory;
}

export function isClassRegistration<T>(
	reg: Registration<T>,
): reg is ClassRegistration<T> {
	return reg.type === RegistrationType.Class;
}

export type InjectParam = { index: number; value: any };

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
		options: RegistrationOptions<T>,
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
		options: RegistrationOptions<T>,
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
		options?: Omit<RegistrationOptions<T>, 'initialize'>,
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
	resolve<T>(token: InjectionToken<T>, params?: InjectParam[]): Promise<T>;

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

	/**
	 * Check if a token is registered with the kernel
	 *
	 * @param token  injection token
	 * @param resursive check parent kernels
	 */
	isRegistered<T>(token: InjectionToken<T>, recursive?: boolean): boolean;
}
