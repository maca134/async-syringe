import 'reflect-metadata';
import { store } from '../Reflection';
import { inject } from './inject';

test('inject adds correct metadata to class', () => {
	class Foo {
		@inject()
		bar!: Foo;

		constructor(@inject('foo') public foo: string) {}
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

	const prop = metadata.props.bar;
	if (!prop) {
		throw new Error('prop is null');
	}
	expect(prop).toHaveProperty('token');
	expect(prop.token).toStrictEqual(Foo);
});
