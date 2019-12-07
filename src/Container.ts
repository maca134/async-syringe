import { Registry } from './Registry';

export const INJECTION_TOKEN_METADATA_KEY = 'ioc-tokens';
export const REG_OPTS_METADATA_KEY = 'ioc-opts';

export enum Lifecycle {
	Transient,
	Singleton
}

export type constructor<T> = { new(...args: any[]): T; };
export type InjectionToken<T = any> = constructor<T> | string | symbol;
export type ParamInjectionToken<T> = { token: InjectionToken<T>, multi: boolean };
export type RegistrationOptions<T> = { lifecycle?: Lifecycle; initialize?: (instance: T) => Promise<void> | void };
export type Registration<T = any> = { resolve: () => T | Promise<T>; params?: ParamInjectionToken<T>[]; opts?: RegistrationOptions<T>; };

export class Container {
	private _singletons = new Map<InjectionToken<any>, Promise<any>>();
	private _registry = new Registry();

	registerClass<T>(token: InjectionToken<T>, ctor: constructor<T>, options: RegistrationOptions<T>): void;
	registerClass<T>(token: InjectionToken<T>, ctor: constructor<T>): void;
	registerClass<T>(token: InjectionToken<T>, options: RegistrationOptions<T>): void;
	registerClass<T>(token: InjectionToken<T>): void;
	registerClass<T>(token: InjectionToken<T>, ctorOrOptions?: constructor<T> | RegistrationOptions<T>, options?: RegistrationOptions<T>) {
		if (typeof ctorOrOptions === 'object') {
			options = ctorOrOptions;
		}

		let ctor: constructor<T>;
		if (typeof ctorOrOptions === 'function') {
			ctor = ctorOrOptions;
		} else if (!ctorOrOptions && typeof token === 'function') {
			ctor = token;
		} else {
			throw new Error(`no ctor provided for ${String(token)}`);
		}

		const paramTypes: constructor<any>[] = Reflect.getMetadata('design:paramtypes', ctor) || [];
		let opts: RegistrationOptions<T>;
		if (options) {
			opts = options;
		} else {
			opts = Reflect.getMetadata(REG_OPTS_METADATA_KEY, ctor) || { lifecycle: Lifecycle.Transient };
		}
		const paramTokens: Map<number, ParamInjectionToken<T>> = Reflect.getMetadata(INJECTION_TOKEN_METADATA_KEY, ctor) || new Map();
		if (paramTypes.some(type => !type)) {
			throw new Error(`circular dependency around ${String(token)}`);
		}
		const params = paramTypes.map((type, i) => paramTokens.get(i) || { token: type, multi: false });
		for (let i = 0; i < params.length; i++) {
			const param = params[i];
			if (typeof param.token === 'function' && ['Number', 'String', 'Array', 'Object', 'Function'].indexOf(param.token.name) > 0) {
				throw new Error(`can not inject primitive type at param ${i} in ${ctor.name}(${params.map(p => typeof p.token === 'function' ? p.token.name : p.token).join(',')})`);
			}
		}
		this._registry.set(token, { opts, params, resolve: () => this.resolveClass(token, ctor) });
	}

	registerValue<T>(token: InjectionToken<T>, value: T) {
		this._registry.set<T>(token, { resolve: () => value });
	}

	registerFactory<T>(token: InjectionToken<T>, factory: (container: Container) => T | Promise<T>, options?: Omit<RegistrationOptions<T>, 'initialize'>) {
		this._registry.set<T>(token, { resolve: () => factory(this), opts: options });
	}

	registerToken<T>(token: InjectionToken<T>, to: InjectionToken<T>) {
		this._registry.set<T>(token, { resolve: () => this.resolve(to) });
	}

	unregister<T>(token: InjectionToken<T>) {
		this._registry.setAll(token, []);
		this._singletons.delete(token);
	}

	resolve<T>(token: InjectionToken<T>): Promise<T> | T {
		if (!this._registry.has(token) && typeof token === 'function') {
			this.registerClass(token);
		}
		const registration = this._registry.get<T>(token);
		if (!registration) {
			throw new Error(`${String(token)} token not found`);
		}
		const isSingleton = registration.opts && registration.opts.lifecycle && registration.opts.lifecycle === Lifecycle.Singleton;
		if (isSingleton && this._singletons.has(token)) {
			return this._singletons.get(token) as Promise<T>;
		}
		const instance = Promise.resolve(registration.resolve());
		if (isSingleton) {
			this._singletons.set(token, instance);
		}
		return instance;
	}

	resolveAll<T>(token: InjectionToken<T>): Promise<T[]> {
		return Promise.all(this._registry.getAll<T>(token).map(registration => registration.resolve()));
	}

	private async resolveClass<T>(token: InjectionToken<T>, ctor: constructor<T>) {
		const registration = this._registry.get<T>(token);
		if (!registration) {
			throw new Error('token not found');
		}
		let params: any[] = [];
		if (registration.params) {
			params = await Promise.all(
				registration.params.map(param => param.multi ? this.resolveAll(param.token) : this.resolve(param.token)) as Promise<any>[]
			);
		}
		const instance = new Promise<T>(async (resolve, reject) => {
			const instance = new ctor(...params);
			try {
				if (registration.opts && registration.opts.initialize) {
					await registration.opts.initialize(instance);
				}
			} catch (err) {
				return reject(err);
			}
			resolve(instance);
		});
		return instance;
	}
}
