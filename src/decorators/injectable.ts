import {
	constructor,
	Lifecycle,
	REG_OPTS_METADATA_KEY,
	RegistrationOptions
} from '../Kernel';

/**
 * Class decorator factory that allows the class' dependencies to be injected
 *
 * @param options registration options
 */
export function injectable<T>(
	options: RegistrationOptions<T> = { lifecycle: Lifecycle.Transient }
): (target: constructor<T>) => void {
	return (target: constructor<T>) => {
		Reflect.defineMetadata(REG_OPTS_METADATA_KEY, options, target);
	};
}
