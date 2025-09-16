import type { constructor, RegistrationOptions } from '../Kernel';
import { Lifecycle } from '../Kernel';
import { store } from '../Reflection';

/**
 * Class decorator factory that allows the class' dependencies to be injected
 *
 * @param options registration options
 */
export function injectable<T>(
	options: RegistrationOptions<T> = { lifecycle: Lifecycle.Transient }
): (target: constructor<T>) => void {
	return (target: constructor<T>) => {
		store.get<T>(target).setOptions(options);
	};
}
