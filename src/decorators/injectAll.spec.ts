import 'reflect-metadata';
import { injectAll } from './injectAll';
import { INJECTION_TOKEN_METADATA_KEY, ParamInjectionToken } from '../Kernel';

test('injectAll adds correct metadata to class', () => {
	class Foo {
		constructor(@injectAll('foo') public foo: string[]) {}
	}
	const metadata = Reflect.getOwnMetadata(
		INJECTION_TOKEN_METADATA_KEY,
		Foo
	) as Map<number, ParamInjectionToken<any>>;

	if (!metadata) {
		throw new Error('metadata is null');
	}

	const param = metadata.get(0);

	if (!param) {
		throw new Error('param is null');
	}

	expect(param).toHaveProperty('token');
	expect(param).toHaveProperty('multi');
	expect(param.token).toStrictEqual('foo');
	expect(param.multi).toStrictEqual(true);
	expect(param).toHaveProperty('autoFactory');
	expect(param.autoFactory).toStrictEqual(false);
});
