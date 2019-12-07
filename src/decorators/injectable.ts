import { constructor, Lifecycle, REG_OPTS_METADATA_KEY, RegistrationOptions } from '../Container';

export function injectable<T>(options: RegistrationOptions<T> = { lifecycle: Lifecycle.Transient }): (target: constructor<T>) => void {
	return (target: constructor<T>) => {
		Reflect.defineMetadata(REG_OPTS_METADATA_KEY, options, target);
	};
}
