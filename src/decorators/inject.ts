import { INJECTION_TOKEN_METADATA_KEY, InjectionToken, ParamInjectionToken } from '../Container';

export function inject<T = any>(token: InjectionToken<T>) {
	return (target: any, _: string | symbol, parameterIndex: number) => {
		const tokens: Map<number, ParamInjectionToken<T>> = Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) || new Map<number, ParamInjectionToken<T>>();
		tokens.set(parameterIndex, { token, multi: false });
		Reflect.defineMetadata(INJECTION_TOKEN_METADATA_KEY, tokens, target);
	};
}
