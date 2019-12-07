import {
	constructor,
	INJECTION_TOKEN_METADATA_KEY,
	InjectionToken,
	Kernel,
	KernelModule,
	Lifecycle,
	ParamInjectionToken,
	REG_OPTS_METADATA_KEY,
	RegistrationOptions,
	Registration,
	ResolutionContext,
	Node
} from './Kernel';
import { Registry } from './Registry';

export class StandardKernel implements Kernel {
	private _singletons = new Map<InjectionToken<any>, Promise<any>>();
	private _registry = new Registry();

	registerClass<T>(
		token: InjectionToken<T>,
		ctorOrOptions?: constructor<T> | RegistrationOptions<T>,
		options?: RegistrationOptions<T>
	): void {
		if (typeof ctorOrOptions === 'object') {
			options = ctorOrOptions;
		}
		let ctor: constructor<T>;
		if (typeof ctorOrOptions === 'function') {
			ctor = ctorOrOptions;
		} else if (
			(!ctorOrOptions || typeof ctorOrOptions === 'object') &&
			typeof token === 'function'
		) {
			ctor = token;
		} else {
			throw new Error(`no ctor provided for ${String(token)}`);
		}

		const paramTypes: constructor<any>[] =
			Reflect.getMetadata('design:paramtypes', ctor) || [];
		let opts: RegistrationOptions<T>;
		if (options) {
			opts = options;
		} else {
			opts = Reflect.getMetadata(REG_OPTS_METADATA_KEY, ctor) || {
				lifecycle: Lifecycle.Transient
			};
		}
		const paramTokens: Map<number, ParamInjectionToken<T>> =
			Reflect.getMetadata(INJECTION_TOKEN_METADATA_KEY, ctor) ||
			new Map();
		if (paramTypes.some(type => !type)) {
			throw new Error(`circular dependency around ${String(token)}`);
		}
		const params = paramTypes.map(
			(type, i) => paramTokens.get(i) || { token: type, multi: false }
		);
		for (let i = 0; i < params.length; i++) {
			const param = params[i];
			if (
				typeof param.token === 'function' &&
				['Number', 'String', 'Array', 'Object', 'Function'].indexOf(
					param.token.name
				) > 0
			) {
				throw new Error(
					`can not inject primitive type at param ${i} in ${
						ctor.name
					}(${params
						.map(p =>
							typeof p.token === 'function'
								? p.token.name
								: p.token
						)
						.join(',')})`
				);
			}
		}
		this._registry.set(token, {
			opts,
			params,
			resolve: context => this.resolveClass(token, ctor, context)
		});
	}

	registerValue<T>(token: InjectionToken<T>, value: T): void {
		this._registry.set<T>(token, { resolve: () => value });
	}

	registerFactory<T>(
		token: InjectionToken<T>,
		factory: (container: Kernel) => T | Promise<T>,
		options?: Omit<RegistrationOptions<T>, 'initialize'>
	): void {
		this._registry.set<T>(token, {
			resolve: () => factory(this),
			opts: options
		});
	}

	registerToken<T>(token: InjectionToken<T>, to: InjectionToken<T>): void {
		this._registry.set<T>(token, { resolve: () => this.resolve(to) });
	}

	unregister<T>(token: InjectionToken<T>): void {
		this._registry.setAll(token, []);
		this._singletons.delete(token);
	}

	resolve<T>(
		token: InjectionToken<T>,
		context: ResolutionContext = { scopedResolutions: new Map() }
	): Promise<T> | T {
		if (!this._registry.has(token) && typeof token === 'function') {
			this.registerClass(token);
		}
		const registration = this._registry.get<T>(token);
		if (!registration) {
			throw new Error(`${String(token)} token not found`);
		}
		return this.resolveRegistration(token, registration, context);
	}

	resolveAll<T>(
		token: InjectionToken<T>,
		context: ResolutionContext = { scopedResolutions: new Map() }
	): Promise<T[]> {
		return Promise.all(
			this._registry
				.getAll<T>(token)
				.map(registration =>
					this.resolveRegistration(token, registration, context)
				)
		);
	}

	load<T extends KernelModule>(module: T): void {
		module.load(this);
	}

	dependencyTree<T>(token: InjectionToken<T>): Node {
		const kernel = new StandardKernel();
		for (const [token, reg] of this._registry.entries()) {
			kernel._registry.setAll(token, reg);
		}

		return (function resolve(token: InjectionToken) {
			if (!kernel._registry.has(token) && typeof token === 'function') {
				kernel.registerClass(token);
			}
			const registration = kernel._registry.get<T>(token);
			if (!registration) {
				throw new Error(`${String(token)} token not found`);
			}
			const node: Node = {
				name: typeof token === 'function' ? token.name : String(token),
				lifecycle:
					Lifecycle[
						registration &&
						registration.opts &&
						registration.opts.lifecycle
							? registration.opts.lifecycle
							: Lifecycle.Transient
					],
				children:
					(registration.params &&
						registration.params.map(param =>
							resolve(param.token)
						)) ||
					[]
			};
			return node;
		})(token);
	}

	private resolveRegistration<T>(
		token: InjectionToken<T>,
		registration: Registration<T>,
		context: ResolutionContext
	): Promise<T> {
		const lifecycle: Lifecycle =
			registration.opts && registration.opts.lifecycle
				? registration.opts.lifecycle
				: Lifecycle.Transient;

		if (lifecycle == Lifecycle.Singleton) {
			if (this._singletons.has(token)) {
				return this._singletons.get(token) as Promise<T>;
			}
			const instance = Promise.resolve(registration.resolve(context));
			this._singletons.set(token, instance);
			return instance;
		} else if (lifecycle == Lifecycle.Transient) {
			return Promise.resolve(registration.resolve(context));
		} else if (lifecycle == Lifecycle.Scoped) {
			if (context.scopedResolutions.has(token)) {
				return context.scopedResolutions.get(token) as Promise<T>;
			}
			const instance = Promise.resolve(registration.resolve(context));
			context.scopedResolutions.set(token, instance);
			return instance;
		} else {
			throw new Error('unknown lifecycle');
		}
	}

	private async resolveClass<T>(
		token: InjectionToken<T>,
		ctor: constructor<T>,
		context: ResolutionContext
	): Promise<T> {
		const registration = this._registry.get<T>(token);
		if (!registration) {
			throw new Error('token not found');
		}
		let params: any[] = [];
		if (registration.params) {
			params = await Promise.all(
				registration.params.map(param =>
					param.multi
						? this.resolveAll(param.token, context)
						: this.resolve(param.token, context)
				) as Promise<any>[]
			);
		}
		const instance = new ctor(...params);
		if (registration.opts && registration.opts.initialize) {
			await registration.opts.initialize(instance);
		}
		return instance;
	}
}
