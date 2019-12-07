import { injectable } from './injectable';
import { constructor, Lifecycle, RegistrationOptions } from '../Container';

export function singleton<T>(options: Omit<RegistrationOptions<T>, 'lifecycle'> = {}): (target: constructor<T>) => void {
	return injectable<T>({ ...options, lifecycle: Lifecycle.Singleton });
}
