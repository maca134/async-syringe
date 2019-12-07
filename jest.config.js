module.exports = {
	rootDir: '.',
	clearMocks: true,
	coverageDirectory: 'coverage',
	collectCoverageFrom: ['src/**/*.ts'],
	coveragePathIgnorePatterns: [
		'/node_modules/',
		'types\\.ts',
		'index\\.ts',
		'.+\\.d\\.ts',
		'\\.spec\\.ts'
	],
	globals: {
		'ts-jest': {
			tsConfig: 'tsconfig.test.json'
		}
	},
	moduleFileExtensions: ['ts', 'tsx', 'js'],
	testEnvironment: 'node',
	transform: {
		'^.+\\.tsx?$': 'ts-jest'
	}
};
