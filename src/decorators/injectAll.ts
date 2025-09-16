import type { InjectionToken } from '../Kernel';
import { store } from '../Reflection';

/**
 * Parameter decorator factory that allows for interface information to be stored in the constructor's metadata
 *
 * @param token injection token
 */
export function injectAll<T = any>(token: InjectionToken<T>, optional = false): ParameterDecorator {
	return (target: any, _: string | symbol | undefined, parameterIndex: number) => {
		store.get<T>(target).addConstructorToken(parameterIndex, token, {
			multi: true,
			autoFactory: false,
			optional,
		});
	};
}
