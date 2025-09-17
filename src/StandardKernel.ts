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
import {
	Lifecycle,
	RegistrationType,
	isClassRegistration,
	isDisposable,
	isFactoryRegistration,
} from './Kernel';
import { type MetadataStore, store } from './Reflection';
import { Registry } from './Registry';
import { formatToken } from './formatToken';

export class TokenNotExist extends Error {}

export type StandardKernelOptions = {
	log: boolean | ((message: string) => void);
};

export class StandardKernel implements Kernel {
	readonly #parent?: Kernel;
	readonly #singletons = new Map<InjectionToken<any>, Promise<any>>();
	readonly #registry = new Registry();
	readonly #options: StandardKernelOptions;
	readonly #logger: (message: string) => void;

	constructor(options?: Partial<StandardKernelOptions>, parent?: Kernel) {
		this.#parent = parent;
		this.#logger = (message: string) => {
			if (!options?.log) {
				return;
			}
			const logger = typeof options?.log === 'function' ? options?.log : console.log;
			logger(`[StandardKernel] ${message}`);
		};
		this.registerValue(StandardKernel, this);
		this.registerValue('Kernel', this);
		this.#options = {
			log: false,
			...options,
		};
		this.#logger('Kernel created');
	}

	get metadata(): MetadataStore {
		return store;
	}

	registerClass<T>(
		token: InjectionToken<T>,
		ctorOrOptions?: constructor<T> | RegistrationOptions<T>,
		options?: RegistrationOptions<T>
	): void {
		this.#logger(`registerClass: ${formatToken(token)}`);
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
		this.#registry.set(token, {
			type: RegistrationType.Class,
			opts,
			params: metadata.params,
			props: metadata.props,
			value: ctor,
		});
	}

	registerValue<T>(token: InjectionToken<T>, value: T): void {
		this.#logger(`registerValue: ${formatToken(token)}`);
		this.#registry.set<T>(token, { type: RegistrationType.Value, value });
	}

	registerFactory<T>(
		token: InjectionToken<T>,
		factory: (kernel: Kernel) => T | Promise<T>,
		options?: Omit<RegistrationOptions<T>, 'initialize'>
	): void {
		this.#logger(`registerFactory: ${formatToken(token)}`);
		this.#registry.set<T>(token, {
			type: RegistrationType.Factory,
			value: factory,
			opts: options || {},
		});
	}

	registerToken<T>(token: InjectionToken<T>, to: InjectionToken<T>): void {
		this.#logger(`registerToken: ${formatToken(token)} -> ${String(to)}`);
		this.#registry.set<T>(token, {
			type: RegistrationType.Token,
			value: to,
		});
	}

	unregister<T>(token: InjectionToken<T>): void {
		this.#logger(`unregister: ${formatToken(token)}`);
		this.#registry.setAll(token, []);
		this.#singletons.delete(token);
	}

	// TODO: support ConstructorArgumentsObject
	resolve<T>(
		token: InjectionToken<T>,
		inject: ConstructorArgumentsArray = [],
		context: ResolutionContext = { scopedResolutions: new Map() }
	): Promise<T> {
		this.#logger(`resolve: ${formatToken(token)}`);
		if (!this.#registry.has(token) && this.#parent) {
			return this.#parent.resolve(token);
		}
		if (!this.#registry.has(token) && typeof token === 'function') {
			this.registerClass(token);
		}
		const registration = this.#registry.get<T>(token);
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
			kernel.#registry.setAll(token, [
				{
					type: RegistrationType.Class,
					value: registration.value,
					opts: registration.opts,
					params,
					props: registration.props,
				},
			]);
			return kernel.#resolveRegistration(
				token,
				kernel.#registry.get(token) as Registration,
				context
			);
		}
		return this.#resolveRegistration(token, registration, context);
	}

	resolveAll<T>(
		token: InjectionToken<T>,
		context: ResolutionContext = { scopedResolutions: new Map() }
	): Promise<T[]> {
		this.#logger(`resolveAll: ${formatToken(token)}`);
		if (!this.#registry.has(token) && this.#parent) {
			return this.#parent.resolveAll(token);
		}
		return Promise.all(
			this.#registry
				.getAll<T>(token)
				.map((registration) => this.#resolveRegistration(token, registration, context))
		);
	}

	load<T extends KernelModule>(module: T): void {
		this.#logger(`load: ${module.constructor.name}`);
		module.load(this);
	}

	// TODO: add properties to Node
	dependencyTree<T>(token: InjectionToken<T>, options?: StandardKernelOptions): Node {
		this.#logger(`dependencyTree: ${formatToken(token)}`);
		const kernel = new StandardKernel(options);
		for (const [token, reg] of this.#registry.entries()) {
			kernel.#registry.setAll(token, reg);
		}
		return (function resolve(token: InjectionToken) {
			if (!kernel.#registry.has(token) && typeof token === 'function') {
				kernel.registerClass(token);
			}
			const registration = kernel.#registry.get<T>(token);
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
		this.#logger(`isRegistered: ${formatToken(token)}`);
		return !!(
			this.#registry.has(token) ||
			(recursive && this.#parent && this.#parent.isRegistered(token, true))
		);
	}

	getChildKernel(): Kernel {
		this.#logger('getChildKernel');
		return new StandardKernel(this.#options, this);
	}

	async dispose(): Promise<void> {
		this.#logger('dispose');
		if (this.#parent) {
			this.#parent.dispose();
		}
		const singletons = Array.from(this.#singletons.values());
		await Promise.all(
			singletons.map(async (p) => {
				const instance = await p;
				if (isDisposable(instance)) {
					await instance.dispose();
				}
			})
		);
		this.#singletons.clear();
	}

	#resolveRegistration<T>(
		token: InjectionToken<T>,
		registration: Registration<T>,
		context: ResolutionContext
	): Promise<T> {
		this.#logger(`resolveRegistration: ${formatToken(token)}`);
		const lifecycle: Lifecycle =
			isClassRegistration(registration) || isFactoryRegistration(registration)
				? registration.opts.lifecycle || Lifecycle.Transient
				: Lifecycle.Transient;

		if (lifecycle == Lifecycle.Singleton) {
			if (this.#singletons.has(token)) {
				return this.#singletons.get(token) as Promise<T>;
			}
			const instance = this.#construct(registration, context);
			this.#singletons.set(token, instance);
			return instance;
		} else if (lifecycle == Lifecycle.Transient) {
			return this.#construct(registration, context);
		} else if (lifecycle == Lifecycle.Scoped) {
			if (context.scopedResolutions.has(token)) {
				return context.scopedResolutions.get(token) as Promise<T>;
			}
			const instance = this.#construct(registration, context);
			context.scopedResolutions.set(token, instance);
			return instance;
		} else {
			throw new Error('unknown lifecycle');
		}
	}

	#construct<T>(registration: Registration<T>, context: ResolutionContext): Promise<T> {
		this.#logger(`construct: ${registration.type}`);
		switch (registration.type) {
			case RegistrationType.Class:
				return this.#constructClass<T>(registration, context);

			case RegistrationType.Factory:
				return Promise.resolve(registration.value(this));

			case RegistrationType.Token:
				return this.resolve(registration.value);

			case RegistrationType.Value:
				return Promise.resolve(registration.value);
		}
		throw new Error('bad registration type');
	}

	async #constructClass<T>(registration: ClassRegistration<T>, context: ResolutionContext) {
		this.#logger(`constructClass: ${registration.value.name}`);
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
