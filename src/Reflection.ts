import type { ConstructorParamInjectionToken, PropertyParamInjectionToken } from './Kernel';
import {
	Lifecycle,
	type constructor,
	type RegistrationOptions,
	type InjectionToken,
} from './Kernel';
import { formatToken } from './formatToken';

type TokenOptions = { multi?: boolean; optional?: boolean; autoFactory?: boolean };

type Metadata = RegistrationOptions<any> & {
	props: PropertyParamInjectionToken<any>[];
	params: ConstructorParamInjectionToken<any>[];
};

class ClassMetadata<T> {
	params: ConstructorParamInjectionToken<T>[] = [];
	props: PropertyParamInjectionToken<T>[] = [];
	#metadata: Metadata;
	options: RegistrationOptions<T>;
	finalized = false;

	constructor(readonly target: constructor<any>) {
		this.#metadata = {
			lifecycle: Lifecycle.Transient,
			props: [],
			params: [],
		};
		this.options = {
			lifecycle: Lifecycle.Transient,
		};
	}

	get metadata(): Metadata {
		if (!this.finalized) {
			this.#finalize();
		}
		return this.#metadata;
	}

	addConstructorToken(index: number, token?: InjectionToken<any>, options?: TokenOptions): void {
		if (this.finalized) {
			throw new Error('Cannot set options after metadata has been finalized');
		}
		const types = Reflect.getMetadata('design:paramtypes', this.target) || [];
		const paramType = types[index];
		if (!paramType) {
			throw new Error(
				`Invalid parameter index ${index} for class ${(this.target as constructor<T>).name}. Only ${types.length} parameters exist.`
			);
		}
		this.params.push({ type: 'constructor', index, token: token || paramType, ...options });
	}

	addPropertyToken(
		key: string | symbol,
		token?: InjectionToken<any>,
		options?: TokenOptions
	): void {
		if (this.finalized) {
			throw new Error('Cannot set options after metadata has been finalized');
		}
		const propType = Reflect.getMetadata('design:type', this.target.prototype, key);
		if (!propType) {
			throw new Error(
				`Invalid property key ${String(key)} for class ${(this.target as constructor<T>).name}.`
			);
		}
		this.props.push({ type: 'property', key, token: token || propType, ...options });
	}

	setOptions(options: RegistrationOptions<T>): void {
		if (this.finalized) {
			throw new Error('Cannot set options after metadata has been finalized');
		}
		this.options = options;
	}

	#finalize() {
		const paramTypes: constructor<any>[] =
			Reflect.getMetadata('design:paramtypes', this.target) || [];
		if (paramTypes.some((type) => !type)) {
			throw new Error(`circular dependency around ${formatToken(this.target)}`);
		}
		this.#metadata = {
			...this.#metadata,
			...this.options,
			props: this.props,
			params: paramTypes.map((type, index) => {
				const existing = this.params.find((p) => p.index === index);
				return existing || { type: 'constructor', index, token: type };
			}),
		};
	}
}

export class MetadataStore {
	store = new Map<object, ClassMetadata<any>>();

	get<T>(target: any): ClassMetadata<T> {
		let classMeta = this.store.get(target);
		if (!classMeta) {
			classMeta = new ClassMetadata<T>(target);
			this.store.set(target, classMeta);
		}
		return classMeta;
	}

	getMetadata(target: any): Metadata {
		return this.get(target).metadata;
	}

	getAll() {
		return Array.from(this.store.values()).map((m) => ({ target: m.target, ...m.metadata }));
	}
}

export const store = new MetadataStore();
