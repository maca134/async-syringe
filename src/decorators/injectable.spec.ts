import 'reflect-metadata';
import { injectable } from './injectable';
import {
	REG_OPTS_METADATA_KEY,
	Lifecycle,
	RegistrationOptions
} from '../Kernel';

test('injectable adds correct metadata to class', () => {
	@injectable()
	class Foo {
		constructor() {}
	}
	const metadata = Reflect.getOwnMetadata(
		REG_OPTS_METADATA_KEY,
		Foo
	) as RegistrationOptions<Foo>;

	if (!metadata) {
		throw new Error('metadata is null');
	}

	expect(metadata).toHaveProperty('lifecycle');

	if (!metadata.lifecycle) {
		throw new Error('metadata.scope is null');
	}
	expect(metadata.lifecycle).toStrictEqual(Lifecycle.Transient);
});
