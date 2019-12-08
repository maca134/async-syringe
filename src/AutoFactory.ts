import { constructor, InjectionToken, InjectParam, Kernel } from './Kernel';
import { Factory } from './Factory';

export class AutoFactory<T extends constructor<any>> implements Factory<T> {
	constructor(private _kernel: Kernel, private _token: InjectionToken) {}

	/**
	 * create a new instance of T
	 *
	 * @param args constructor parameters
	 */
	create(...args: ConstructorParameters<T>): Promise<InstanceType<T>> {
		return this._kernel.resolve<InstanceType<T>>(
			this._token,
			(args as any[]).reduce((p, c, i) => {
				p.push({
					index: i,
					value: c
				});
				return p;
			}, new Array<InjectParam>())
		);
	}
}
