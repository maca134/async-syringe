import 'reflect-metadata';
import type { RegistrationOptions } from '../Kernel';
import { REG_OPTS_METADATA_KEY, Lifecycle } from '../Kernel';
import { injectable } from './injectable';

test('injectable adds correct metadata to class', () => {
	@injectable()
	class Foo {}
	const metadata = Reflect.getOwnMetadata(REG_OPTS_METADATA_KEY, Foo) as RegistrationOptions<Foo>;

	if (!metadata) {
		throw new Error('metadata is null');
	}

	expect(metadata).toHaveProperty('lifecycle');

	if (!metadata.lifecycle) {
		throw new Error('metadata.scope is null');
	}
	expect(metadata.lifecycle).toStrictEqual(Lifecycle.Transient);
});
