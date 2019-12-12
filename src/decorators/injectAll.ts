import {
	INJECTION_TOKEN_METADATA_KEY,
	InjectionToken,
	ParamInjectionToken
} from '../Kernel';

/**
 * Parameter decorator factory that allows for interface information to be stored in the constructor's metadata
 *
 * @param token injection token
 */
export function injectAll<T = any>(token: InjectionToken<T>, optional = false) {
	return (target: any, _: string | symbol, parameterIndex: number) => {
		const tokens: Map<number, ParamInjectionToken<T>> =
			Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) ||
			new Map<number, ParamInjectionToken<T>>();
		tokens.set(parameterIndex, {
			token,
			multi: true,
			autoFactory: false,
			optional
		});
		Reflect.defineMetadata(INJECTION_TOKEN_METADATA_KEY, tokens, target);
	};
}
