import type { InjectionToken, ParamInjectionToken } from '../Kernel';
import { INJECTION_TOKEN_METADATA_KEY } from '../Kernel';

/**
 * Parameter decorator factory that allows for interface information to be stored in the constructor's metadata
 *
 * @param token injection token
 */
export function inject<T = any>(token: InjectionToken<T>, optional = false): ParameterDecorator {
	return (target: any, _: string | symbol | undefined, parameterIndex: number) => {
		const tokens: Map<number, ParamInjectionToken<T>> = Reflect.getOwnMetadata(
			INJECTION_TOKEN_METADATA_KEY,
			target
		) || new Map<number, ParamInjectionToken<T>>();
		tokens.set(parameterIndex, {
			token,
			multi: false,
			autoFactory: false,
			optional,
		});
		Reflect.defineMetadata(INJECTION_TOKEN_METADATA_KEY, tokens, target);
	};
}
