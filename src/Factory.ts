import type { constructor, ConstructorArgumentsObject } from './Kernel';

export interface Factory<T extends constructor<any>> {
	create(...args: ConstructorParameters<T>): Promise<InstanceType<T>>;
	createWithArgs(args: ConstructorArgumentsObject<T>): Promise<InstanceType<T>>;
}
