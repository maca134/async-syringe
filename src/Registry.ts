import { InjectionToken, Registration } from './Kernel';

export class Registry {
	protected _registryMap = new Map<InjectionToken<any>, Registration[]>();

	public entries(): IterableIterator<[InjectionToken<any>, Registration[]]> {
		return this._registryMap.entries();
	}

	public getAll<T>(key: InjectionToken<T>): Registration<T>[] {
		this.ensure(key);
		return this._registryMap.get(key)!;
	}

	public get<T>(key: InjectionToken<T>): Registration<T> | null {
		this.ensure(key);
		const value = this._registryMap.get(key)!;
		return value[value.length - 1] || null;
	}

	public set<T>(key: InjectionToken<T>, value: Registration<T>): void {
		this.ensure(key);
		this._registryMap.get(key)!.push(value);
	}

	public setAll(key: InjectionToken<any>, value: Registration[]): void {
		this._registryMap.set(key, value);
	}

	public has(key: InjectionToken<any>): boolean {
		this.ensure(key);
		return this._registryMap.get(key)!.length > 0;
	}

	public clear(): void {
		this._registryMap.clear();
	}

	private ensure(key: InjectionToken<any>): void {
		if (!this._registryMap.has(key)) {
			this._registryMap.set(key, []);
		}
	}
}
