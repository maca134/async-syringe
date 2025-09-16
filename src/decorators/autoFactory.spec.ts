import 'reflect-metadata';
import { store } from '../Reflection';
import { autoFactory } from './autoFactory';

test('injectAll adds correct metadata to class', () => {
	class Foo {
		constructor(@autoFactory('foo') public foo: any) {}
	}
	const metadata = store.getMetadata(Foo);
	if (!metadata) {
		throw new Error('metadata is null');
	}

	const param = metadata.params[0];

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
