import 'reflect-metadata';
import { singleton } from './singleton';
import {
	REG_OPTS_METADATA_KEY,
	Lifecycle,
	RegistrationOptions,
} from '../Kernel';

test('singleton adds correct metadata to class', () => {
	@singleton()
	class Foo {}
	const metadata = Reflect.getOwnMetadata(
		REG_OPTS_METADATA_KEY,
		Foo,
	) as RegistrationOptions<Foo>;

	if (!metadata) {
		throw new Error('metadata is null');
	}

	expect(metadata).toHaveProperty('lifecycle');

	if (!metadata.lifecycle) {
		throw new Error('metadata.scope is null');
	}
	expect(metadata.lifecycle).toStrictEqual(Lifecycle.Singleton);
});
