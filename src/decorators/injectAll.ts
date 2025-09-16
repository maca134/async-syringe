import type { InjectionToken } from '../Kernel';
import { store } from '../Reflection';

/**
 * Parameter decorator factory that allows for interface information to be stored in the constructor's metadata
 *
 * @param token injection token
 */

export function injectAll<T = any>(token: InjectionToken<T>, optional = false) {
	return (target: object, key?: string | symbol, index?: number) => {
		if (index !== undefined) {
			store.get<T>(target).addConstructorToken(index, token, {
				multi: true,
				autoFactory: false,
				optional,
			});
		} else if (key) {
			store.get<T>(target.constructor).addPropertyToken(key, token, {
				multi: true,
				autoFactory: false,
				optional,
			});
		}
	};
}
