import type { InjectionToken, Registration } from './Kernel';

export class Registry {
	protected _registryMap = new Map<InjectionToken<any>, Registration[]>();

	entries(): IterableIterator<[InjectionToken<any>, Registration[]]> {
		return this._registryMap.entries();
	}

	getAll<T>(key: InjectionToken<T>): Registration<T>[] {
		this.#ensure(key);
		return this._registryMap.get(key)!;
	}

	get<T>(key: InjectionToken<T>): Registration<T> | null {
		this.#ensure(key);
		const value = this._registryMap.get(key)!;
		return value[value.length - 1] || null;
	}

	set<T>(key: InjectionToken<T>, value: Registration<T>): void {
		this.#ensure(key);
		this._registryMap.get(key)!.push(value);
	}

	setAll(key: InjectionToken<any>, value: Registration[]): void {
		this._registryMap.set(key, value);
	}

	has(key: InjectionToken<any>): boolean {
		this.#ensure(key);
		return this._registryMap.get(key)!.length > 0;
	}

	clear(): void {
		this._registryMap.clear();
	}

	#ensure(key: InjectionToken<any>): void {
		if (!this._registryMap.has(key)) {
			this._registryMap.set(key, []);
		}
	}
}
