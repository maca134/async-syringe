import type { Factory } from './Factory';
import type { constructor, ConstructorArgumentsObject, InjectionToken, Kernel } from './Kernel';

export class AutoFactory<T extends constructor<any>> implements Factory<T> {
	readonly #kernel: Kernel;
	readonly #token: InjectionToken;

	constructor(kernel: Kernel, token: InjectionToken) {
		this.#kernel = kernel;
		this.#token = token;
	}

	/**
	 * create a new instance of T
	 *
	 * @param args constructor parameters
	 */
	create(...args: ConstructorParameters<T>): Promise<InstanceType<T>> {
		return this.#kernel.resolve<InstanceType<T>>(
			this.#token,
			args.map((value, index) => ({ index, value }))
		);
	}

	/**
	 * Asynchronously creates an instance of type `T` using the provided constructor arguments.
	 *
	 * @param args - An object containing the constructor arguments for type `T`.
	 *               The keys represent the argument indices, and the values are the corresponding argument values.
	 * 				For example, to pass 'foo' as the first argument and 'bar' as the third argument, you would call:
	 * 				```typescript
	 * 				class Baz {}
	 * 				class Foo { constructor(foo: string, baz: Baz, bar: string ) {} }
	 *
	 * 				// Baz is automatically resolved and injected
	 * 				fooFactory.createWithArgs({ 0: 'foo', 2: 'bar' });
	 * 				```
	 * @returns A promise that resolves to an instance of type `T`.
	 */
	createWithArgs(args: ConstructorArgumentsObject<T>): Promise<InstanceType<T>> {
		return this.#kernel.resolve<InstanceType<T>>(
			this.#token,
			Object.entries(args).map(([key, value]) => ({ index: Number(key), value }))
		);
	}
}
