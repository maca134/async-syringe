import type { Factory } from './Factory';
import type { constructor, InjectionToken, Kernel } from './Kernel';

export class AutoFactory<T extends constructor<any>> implements Factory<T> {
	constructor(
		private _kernel: Kernel,
		private _token: InjectionToken
	) {}

	/**
	 * create a new instance of T
	 *
	 * @param args constructor parameters
	 */
	create(...args: ConstructorParameters<T>): Promise<InstanceType<T>> {
		return this._kernel.resolve<InstanceType<T>>(
			this._token,
			args.map((value, index) => ({ index, value }))
		);
	}
}
