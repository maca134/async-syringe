import type { constructor } from './Kernel';

export type ConstructorArguments<
	T extends constructor<any>,
	U extends readonly unknown[] = ConstructorParameters<T>,
> = {
	[K in keyof U]: { [P in K]: U[K] };
}[number];

export interface Factory<T extends constructor<any>> {
	create(...args: ConstructorParameters<T>): Promise<InstanceType<T>>;
	createWithArgs(args: ConstructorArguments<T>): Promise<InstanceType<T>>;
}
