/// <reference types="mocha" />

import * as chai from 'chai';
import { IConfig } from '@testring/types';
import { mergeConfigs } from '../src/merge-configs';

describe('getConfig', () => {
    it('should get config with correct array of plugins (strings)', () => {
        const config = mergeConfigs(
            {
                plugins: ['plugin1', 'plugin2']
            },
            {
                plugins: ['plugin2', 'plugin3']
            }
        );

        chai.expect(config).to.be.deep.equals({
            plugins: ['plugin1', 'plugin2', 'plugin3']
        });
    });

    it('should get config with correct array of plugins (arrays)', () => {
        const config = mergeConfigs<IConfig>(
            {
                plugins: [
                    'plugin2',
                    ['plugin1', {
                        cache: false
                    }]
                ]
            },
            {
                plugins: [
                    ['plugin1', {
                        debug: true
                    }],
                    ['plugin2', {
                        test: 1
                    }]
                ]
            }
        );

        chai.expect(config).to.be.deep.equals({
            plugins: [
                ['plugin2', {
                    test: 1
                }],
                ['plugin1', {
                    cache: false,
                    debug: true
                }]
            ]
        });
    });

    it('should get config with correct array of plugins (string + array)', () => {
        const config = mergeConfigs<IConfig>(
            {
                plugins: [
                    'plugin2',
                    'plugin1',
                ],
            },
            {
                plugins: [
                    ['plugin1', {
                        debug: true,
                    }],
                ],
            },
        );

        chai.expect(config).to.be.deep.equals({
            plugins: [
                'plugin2',
                ['plugin1', {
                    debug: true,
                }],
            ],
        });
    });

    it('should get config with correct array of plugins (array + undefined value)', () => {
        const config = mergeConfigs<IConfig>(
            {
                plugins: [
                    ['plugin1', {
                        debug: true,
                    }],
                ],
            },
            {
                plugins: [
                    'plugin2',
                    ['plugin1', {
                        debug: undefined,
                    }],
                ],
            },
        );

        chai.expect(config).to.be.deep.equals({
            plugins: [
                ['plugin1', {
                    debug: undefined,
                }],
                'plugin2',
            ]
        });
    });
});
