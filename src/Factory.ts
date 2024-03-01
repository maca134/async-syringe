import type { constructor } from './Kernel';

export interface Factory<T extends constructor<any>> {
	create(...args: ConstructorParameters<T>): Promise<InstanceType<T>>;
}
