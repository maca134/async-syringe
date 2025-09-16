import { store } from '../Reflection';
import 'reflect-metadata';
import { injectAll } from './injectAll';

test('injectAll adds correct metadata to class', () => {
	class Foo {
		constructor(@injectAll('foo') public foo: string[]) {}
	}

	const param = store.getMetadata(Foo).params[0];

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
