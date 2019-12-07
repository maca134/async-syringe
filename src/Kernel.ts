export const INJECTION_TOKEN_METADATA_KEY = 'ioc-tokens';
export const REG_OPTS_METADATA_KEY = 'ioc-opts';

export enum Lifecycle {
	Transient = 1,
	Singleton = 2,
}

export type constructor<T> = { new(...args: any[]): T; };
export type InjectionToken<T = any> = constructor<T> | string | symbol;
export type ParamInjectionToken<T> = { token: InjectionToken<T>, multi: boolean };
export type RegistrationOptions<T> = { lifecycle?: Lifecycle; initialize?: (instance: T) => Promise<void> | void };
export type Registration<T = any> = { resolve: () => T | Promise<T>; params?: ParamInjectionToken<T>[]; opts?: RegistrationOptions<T>; };

export interface KernelModule {
	load(kernal: Kernel): void;
}

export interface Kernel {
	registerClass<T>(token: InjectionToken<T>, ctor: constructor<T>, options: RegistrationOptions<T>): void;
	registerClass<T>(token: InjectionToken<T>, ctor: constructor<T>): void;
	registerClass<T>(token: InjectionToken<T>, options: RegistrationOptions<T>): void;
	registerClass<T>(token: InjectionToken<T>): void;
	registerValue<T>(token: InjectionToken<T>, value: T): void;
	registerFactory<T>(token: InjectionToken<T>, factory: (container: Kernel) => T | Promise<T>, options?: Omit<RegistrationOptions<T>, 'initialize'>): void;
	registerToken<T>(token: InjectionToken<T>, to: InjectionToken<T>): void;
	unregister<T>(token: InjectionToken<T>): void;
	resolve<T>(token: InjectionToken<T>): Promise<T> | T;
	resolveAll<T>(token: InjectionToken<T>): Promise<T[]>;
	load<T extends KernelModule>(module: T): void;
}
