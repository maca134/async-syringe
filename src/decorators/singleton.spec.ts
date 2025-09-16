import 'reflect-metadata';
import { Lifecycle } from '../Kernel';
import { store } from '../Reflection';
import { singleton } from './singleton';

test('singleton adds correct metadata to class', () => {
	@singleton()
	class Foo {}
	const metadata = store.getMetadata(Foo);

	if (!metadata) {
		throw new Error('metadata is null');
	}

	expect(metadata).toHaveProperty('lifecycle');

	if (!metadata.lifecycle) {
		throw new Error('metadata.scope is null');
	}
	expect(metadata.lifecycle).toStrictEqual(Lifecycle.Singleton);
});
