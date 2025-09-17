import { AutoFactory } from './AutoFactory';
import type {
	constructor,
	InjectionToken,
	Kernel,
	KernelModule,
	RegistrationOptions,
	Registration,
	ResolutionContext,
	Node,
	ClassRegistration,
	ConstructorArgumentsArray,
} from './Kernel';
import { Lifecycle, RegistrationType, isClassRegistration, isFactoryRegistration } from './Kernel';
import { type MetadataStore, store } from './Reflection';
import { Registry } from './Registry';
import { formatToken } from './formatToken';

export class TokenNotExist extends Error {}

export type StandardKernelOptions = {
	log: boolean | ((message: string) => void);
};

export class StandardKernel implements Kernel {
	private readonly _singletons = new Map<InjectionToken<any>, Promise<any>>();
	private readonly _registry = new Registry();
	private readonly _options: StandardKernelOptions;
	private readonly _logger: (message: string) => void;

	constructor(
		options?: Partial<StandardKernelOptions>,
		private readonly _parent?: Kernel
	) {
		this._logger = (message: string) => {
			if (!options?.log) {
				return;
			}
			const logger = typeof options?.log === 'function' ? options?.log : console.log;
			logger(`[StandardKernel] ${message}`);
		};
		this.registerValue(StandardKernel, this);
		this.registerValue('Kernel', this);
		this._options = {
			log: false,
			...options,
		};
		this._logger('Kernel created');
	}

	get metadata(): MetadataStore {
		return store;
	}

	registerClass<T>(
		token: InjectionToken<T>,
		ctorOrOptions?: constructor<T> | RegistrationOptions<T>,
		options?: RegistrationOptions<T>
	): void {
		this._logger(`registerClass: ${formatToken(token)}`);
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
			throw new Error(`no ctor provided for ${formatToken(token)}`);
		}

		const { metadata } = store.get(ctor);
		const opts = options || {
			initialize: metadata.initialize,
			lifecycle: metadata.lifecycle || Lifecycle.Transient,
		};

		// need to save value and not a scoped function
		this._registry.set(token, {
			type: RegistrationType.Class,
			opts,
			params: metadata.params,
			props: metadata.props,
			value: ctor,
		});
	}

	registerValue<T>(token: InjectionToken<T>, value: T): void {
		this._logger(`registerValue: ${formatToken(token)}`);
		this._registry.set<T>(token, { type: RegistrationType.Value, value });
	}

	registerFactory<T>(
		token: InjectionToken<T>,
		factory: (kernel: Kernel) => T | Promise<T>,
		options?: Omit<RegistrationOptions<T>, 'initialize'>
	): void {
		this._logger(`registerFactory: ${formatToken(token)}`);
		this._registry.set<T>(token, {
			type: RegistrationType.Factory,
			value: factory,
			opts: options || {},
		});
	}

	registerToken<T>(token: InjectionToken<T>, to: InjectionToken<T>): void {
		this._logger(`registerToken: ${formatToken(token)} -> ${String(to)}`);
		this._registry.set<T>(token, {
			type: RegistrationType.Token,
			value: to,
		});
	}

	unregister<T>(token: InjectionToken<T>): void {
		this._logger(`unregister: ${formatToken(token)}`);
		this._registry.setAll(token, []);
		this._singletons.delete(token);
	}

	// TODO: support ConstructorArgumentsObject
	resolve<T>(
		token: InjectionToken<T>,
		inject: ConstructorArgumentsArray = [],
		context: ResolutionContext = { scopedResolutions: new Map() }
	): Promise<T> {
		this._logger(`resolve: ${formatToken(token)}`);
		if (!this._registry.has(token) && this._parent) {
			return this._parent.resolve(token);
		}
		if (!this._registry.has(token) && typeof token === 'function') {
			this.registerClass(token);
		}
		const registration = this._registry.get<T>(token);
		if (!registration) {
			throw new TokenNotExist(`${formatToken(token)} token not found`);
		}
		const injectParams = !Array.isArray(inject)
			? Object.entries(inject).map(([key, value]) => ({ index: Number(key), value }))
			: inject;

		if (injectParams.length > 0 && isClassRegistration(registration)) {
			const kernel = this.getChildKernel() as StandardKernel;
			const params = registration.params.map((param, i) => {
				const injectParam = injectParams.find((p) => p.index === i);
				if (!injectParam) {
					return param;
				}
				const token = Symbol.for(
					`${String(registration.params[i].token)}-${injectParam.index}`
				);
				kernel.registerValue(token, injectParam.value);
				return {
					type: param.type,
					token,
					index: param.index,
				};
			});
			kernel._registry.setAll(token, [
				{
					type: RegistrationType.Class,
					value: registration.value,
					opts: registration.opts,
					params,
					props: registration.props,
				},
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
		this._logger(`resolveAll: ${formatToken(token)}`);
		if (!this._registry.has(token) && this._parent) {
			return this._parent.resolveAll(token);
		}
		return Promise.all(
			this._registry
				.getAll<T>(token)
				.map((registration) => this.resolveRegistration(token, registration, context))
		);
	}

	load<T extends KernelModule>(module: T): void {
		this._logger(`load: ${module.constructor.name}`);
		module.load(this);
	}

	dependencyTree<T>(token: InjectionToken<T>, options?: StandardKernelOptions): Node {
		this._logger(`dependencyTree: ${formatToken(token)}`);
		const kernel = new StandardKernel(options);
		for (const [token, reg] of this._registry.entries()) {
			kernel._registry.setAll(token, reg);
		}
		return (function resolve(token: InjectionToken) {
			if (!kernel._registry.has(token) && typeof token === 'function') {
				kernel.registerClass(token);
			}
			const registration = kernel._registry.get<T>(token);
			if (!registration) {
				throw new TokenNotExist(`${formatToken(token)} token not found`);
			}

			const children = isClassRegistration(registration)
				? (registration.params
						.map((param) => {
							try {
								return resolve(param.token);
							} catch (err) {
								if (err instanceof TokenNotExist && param.optional) {
									return undefined;
								} else {
									throw err;
								}
							}
						})
						.filter((i) => !!i) as Node[])
				: [];
			const lifecycle: Lifecycle =
				isClassRegistration(registration) || isFactoryRegistration(registration)
					? registration.opts.lifecycle || Lifecycle.Transient
					: Lifecycle.Transient;
			const node: Node = {
				name: typeof token === 'function' ? token.name : String(token),
				lifecycle: Lifecycle[lifecycle],
				children,
			};
			return node;
		})(token);
	}

	isRegistered<T>(token: InjectionToken<T>, recursive?: boolean): boolean {
		this._logger(`isRegistered: ${formatToken(token)}`);
		return !!(
			this._registry.has(token) ||
			(recursive && this._parent && this._parent.isRegistered(token, true))
		);
	}

	getChildKernel(): Kernel {
		this._logger('getChildKernel');
		return new StandardKernel(this._options, this);
	}

	private resolveRegistration<T>(
		token: InjectionToken<T>,
		registration: Registration<T>,
		context: ResolutionContext
	): Promise<T> {
		this._logger(`resolveRegistration: ${formatToken(token)}`);
		const lifecycle: Lifecycle =
			isClassRegistration(registration) || isFactoryRegistration(registration)
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

	private construct<T>(registration: Registration<T>, context: ResolutionContext): Promise<T> {
		this._logger(`construct: ${registration.type}`);
		switch (registration.type) {
			case RegistrationType.Class:
				return this.constructClass<T>(registration, context);

			case RegistrationType.Factory:
				return Promise.resolve(registration.value(this));

			case RegistrationType.Token:
				return this.resolve(registration.value);

			case RegistrationType.Value:
				return Promise.resolve(registration.value);
		}
		throw new Error('bad registration type');
	}

	private async constructClass<T>(
		registration: ClassRegistration<T>,
		context: ResolutionContext
	) {
		this._logger(`constructClass: ${registration.value.name}`);
		for (let i = 0; i < registration.params.length; i++) {
			const param = registration.params[i];
			if (
				typeof param.token !== 'string' &&
				typeof param.token !== 'symbol' &&
				['Number', 'String', 'Array', 'Object', 'Function'].indexOf(param.token.name) > -1
			) {
				throw new Error(
					`can not inject primitive type ${param.token.name}(${i}) - ${registration.value.name}`
				);
			}
		}
		const params: any[] = await Promise.all(
			registration.params.map((param) => {
				try {
					if (param.multi) {
						return this.resolveAll(param.token, context);
					} else if (param.autoFactory) {
						return new AutoFactory(this, param.token);
					} else {
						return this.resolve(param.token, [], context);
					}
				} catch (err) {
					if (err instanceof TokenNotExist && param.optional) {
						return undefined;
					} else {
						throw err;
					}
				}
			}) as Promise<any>[]
		);
		const instance = new registration.value(...params);

		await Promise.all(
			Object.entries(registration.props).map(async ([_, prop]) => {
				try {
					if (prop.multi) {
						(instance as any)[prop.key] = await this.resolveAll(prop.token, context);
					} else if (prop.autoFactory) {
						(instance as any)[prop.key] = new AutoFactory(this, prop.token);
					} else {
						(instance as any)[prop.key] = await this.resolve(prop.token, [], context);
					}
				} catch (err) {
					if (err instanceof TokenNotExist && prop.optional) {
						(instance as any)[prop.key] = undefined;
					} else {
						throw err;
					}
				}
			})
		);

		if (registration.opts && registration.opts.initialize) {
			await registration.opts.initialize(instance);
		}
		return instance;
	}
}
