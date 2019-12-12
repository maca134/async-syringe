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
	Node,
	RegistrationType,
	isClassRegistration,
	InjectParam,
	isFactoryRegistration
} from './Kernel';
import { Registry } from './Registry';
import { AutoFactory } from './AutoFactory';

export class TokenNotExist extends Error {}

export class StandardKernel implements Kernel {
	private _singletons = new Map<InjectionToken<any>, Promise<any>>();
	private _registry = new Registry();

	constructor(private readonly _parent?: Kernel) {
		this.registerValue(StandardKernel, this);
		this.registerValue('Kernel', this);
	}

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
			(type, i) =>
				paramTokens.get(i) || {
					token: type,
					multi: false,
					autoFactory: false,
					optional: false
				}
		);
		// need to save value and not a scoped function
		this._registry.set(token, {
			type: RegistrationType.Class,
			opts,
			params,
			value: ctor
		});
	}

	registerValue<T>(token: InjectionToken<T>, value: T): void {
		this._registry.set<T>(token, { type: RegistrationType.Value, value });
	}

	registerFactory<T>(
		token: InjectionToken<T>,
		factory: (kernel: Kernel) => T | Promise<T>,
		options?: Omit<RegistrationOptions<T>, 'initialize'>
	): void {
		this._registry.set<T>(token, {
			type: RegistrationType.Factory,
			value: factory,
			opts: options || {}
		});
	}

	registerToken<T>(token: InjectionToken<T>, to: InjectionToken<T>): void {
		this._registry.set<T>(token, {
			type: RegistrationType.Token,
			value: to
		});
	}

	unregister<T>(token: InjectionToken<T>): void {
		this._registry.setAll(token, []);
		this._singletons.delete(token);
	}

	resolve<T>(
		token: InjectionToken<T>,
		injectParams: InjectParam[] = [],
		context: ResolutionContext = { scopedResolutions: new Map() }
	): Promise<T> {
		if (!this._registry.has(token) && typeof token === 'function') {
			this.registerClass(token);
		}
		if (!this._registry.has(token) && this._parent) {
			return this._parent.resolve(token);
		}
		const registration = this._registry.get<T>(token);
		if (!registration) {
			throw new TokenNotExist(`${String(token)} token not found`);
		}
		if (injectParams.length > 0 && isClassRegistration(registration)) {
			const kernel = this.getChildKernel() as StandardKernel;
			kernel._registry.setAll(token, [
				{
					type: RegistrationType.Class,
					value: registration.value,
					opts: registration.opts,
					params: registration.params.map((param, i) => {
						const injectParam = injectParams.find(
							p => p.index === i
						);
						if (!injectParam) {
							return param;
						}
						const token = `${String(
							registration.params[i].token
						)}-${injectParam.index}`;
						kernel.registerValue(token, injectParam.value);
						return {
							token,
							multi: param.multi,
							autoFactory: param.autoFactory,
							optional: param.optional
						};
					})
				}
			]);
			return kernel.resolveRegistration(
				token,
				kernel._registry.get(token) as Registration,
				context
			);
		}
		return this.resolveRegistration(token, registration, context);
	}

	resolveAll<T>(
		token: InjectionToken<T>,
		context: ResolutionContext = { scopedResolutions: new Map() }
	): Promise<T[]> {
		if (!this._registry.has(token) && this._parent) {
			return this._parent.resolveAll(token);
		}
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
				throw new TokenNotExist(`${String(token)} token not found`);
			}

			const children = isClassRegistration(registration)
				? (registration.params
						.map(param => {
							try {
								return resolve(param.token);
							} catch (err) {
								if (
									err instanceof TokenNotExist &&
									param.optional
								) {
									return undefined;
								} else {
									throw err;
								}
							}
						})
						.filter(i => !!i) as Node[])
				: [];
			const lifecycle: Lifecycle =
				isClassRegistration(registration) ||
				isFactoryRegistration(registration)
					? registration.opts.lifecycle || Lifecycle.Transient
					: Lifecycle.Transient;
			const node: Node = {
				name: typeof token === 'function' ? token.name : String(token),
				lifecycle: Lifecycle[lifecycle],
				children
			};
			return node;
		})(token);
	}

	isRegistered<T>(token: InjectionToken<T>, recursive?: boolean): boolean {
		return !!(
			this._registry.has(token) ||
			(recursive &&
				this._parent &&
				this._parent.isRegistered(token, true))
		);
	}

	getChildKernel(): Kernel {
		return new StandardKernel(this);
	}

	private resolveRegistration<T>(
		token: InjectionToken<T>,
		registration: Registration<T>,
		context: ResolutionContext
	): Promise<T> {
		const lifecycle: Lifecycle =
			isClassRegistration(registration) ||
			isFactoryRegistration(registration)
				? registration.opts.lifecycle || Lifecycle.Transient
				: Lifecycle.Transient;

		if (lifecycle == Lifecycle.Singleton) {
			if (this._singletons.has(token)) {
				return this._singletons.get(token) as Promise<T>;
			}
			const instance = this.construct(registration, context);
			this._singletons.set(token, instance);
			return instance;
		} else if (lifecycle == Lifecycle.Transient) {
			return this.construct(registration, context);
		} else if (lifecycle == Lifecycle.Scoped) {
			if (context.scopedResolutions.has(token)) {
				return context.scopedResolutions.get(token) as Promise<T>;
			}
			const instance = this.construct(registration, context);
			context.scopedResolutions.set(token, instance);
			return instance;
		} else {
			throw new Error('unknown lifecycle');
		}
	}

	private async construct<T>(
		registration: Registration<T>,
		context: ResolutionContext
	): Promise<T> {
		switch (registration.type) {
			case RegistrationType.Class:
				for (let i = 0; i < registration.params.length; i++) {
					const param = registration.params[i];
					if (
						typeof param.token !== 'string' &&
						typeof param.token !== 'symbol' &&
						[
							'Number',
							'String',
							'Array',
							'Object',
							'Function'
						].indexOf(param.token.name) > -1
					) {
						throw new Error(
							`can not inject primitive type ${param.token.name}`
						);
					}
				}
				const params: any[] = await Promise.all(
					registration.params.map(param => {
						try {
							if (param.multi) {
								return this.resolveAll(param.token, context);
							} else if (param.autoFactory) {
								return new AutoFactory(this, param.token);
							} else {
								return this.resolve(param.token, [], context);
							}
						} catch (err) {
							if (
								err instanceof TokenNotExist &&
								param.optional
							) {
								return undefined;
							} else {
								throw err;
							}
						}
					}) as Promise<any>[]
				);
				const instance = new registration.value(...params);
				if (registration.opts && registration.opts.initialize) {
					await registration.opts.initialize(instance);
				}
				return instance;

			case RegistrationType.Factory:
				return await registration.value(this);

			case RegistrationType.Token:
				return await this.resolve(registration.value);

			case RegistrationType.Value:
				return Promise.resolve(registration.value);
		}
		throw new Error('bad registration type');
	}
}
