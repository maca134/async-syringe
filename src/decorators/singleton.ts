import { injectable } from './injectable';
import { constructor, Lifecycle, RegistrationOptions } from '../Kernel';

/**
 * Class decorator factory that allows the class' dependencies to be injected
 * and indicate it is a singletion
 *
 * @param options registration options
 */
export function singleton<T>(
	options: Omit<RegistrationOptions<T>, 'lifecycle'> = {}
): (target: constructor<T>) => void {
	return injectable<T>({ ...options, lifecycle: Lifecycle.Singleton });
}
