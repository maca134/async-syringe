import 'reflect-metadata';
import { INJECTION_TOKEN_METADATA_KEY, ParamInjectionToken } from '../Kernel';
import { autoFactory } from './autoFactory';

test('injectAll adds correct metadata to class', () => {
	class Foo {
		constructor(@autoFactory('foo') public foo: any) {}
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
	expect(param.token).toStrictEqual('foo');
	expect(param).toHaveProperty('multi');
	expect(param.multi).toStrictEqual(false);
	expect(param).toHaveProperty('autoFactory');
	expect(param.autoFactory).toStrictEqual(true);
});
