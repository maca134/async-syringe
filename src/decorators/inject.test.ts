import 'reflect-metadata';
import { inject } from './inject';
import { INJECTION_TOKEN_METADATA_KEY, ParamInjectionToken } from '../Kernel';

test('inject adds correct metadata to class', () => {
	class Foo {
		constructor(@inject('foo') public foo: string) {}
	}
	const metadata = Reflect.getOwnMetadata(
		INJECTION_TOKEN_METADATA_KEY,
		Foo
	) as Map<number, ParamInjectionToken<any>>;

	const param = metadata.get(0);

	if (!param) {
		throw new Error('param is null');
	}

	expect(param).not.toBeUndefined();
	expect(param).toHaveProperty('token');
	expect(param).toHaveProperty('multi');
	expect(param.token).toStrictEqual('foo');
	expect(param.multi).toStrictEqual(false);
});
