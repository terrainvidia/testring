import * as process from 'process';
import * as yargs from 'yargs';
import { loggerClientLocal, LoggerServer } from '@testring/logger';
import { getConfig } from '@testring/cli-config';
import { transport } from '@testring/transport';
import { IConfig } from '@testring/types';
import { runTests } from './commands/run';
import { runRecordingProcess } from './commands/record';

const pkg = require('../package.json');

const createField = (key: keyof IConfig, options: yargs.Options) => {
    yargs.option(key.toString(), options);
};

yargs.usage('$0 [command] <arguments>');

yargs.version(`testring version: ${pkg.version}`);

yargs.command('run', 'To run tests');

yargs.command('record', 'To make a record');

yargs.help();


createField('debug', {
    describe: 'Debugging flag',
    type: 'boolean'
});

createField('bail', {
    describe: 'Shut down app after test fail',
    type: 'boolean'
});

createField('workerLimit', {
    describe: 'Maximum amount of parallel child_process',
    type: 'number'
});

createField('retryCount', {
    describe: 'Number of retry attempts',
    type: 'number'
});

createField('retryDelay', {
    describe: 'Time of delay before retry',
    type: 'number'
});

createField('config', {
    describe: 'Custom path to config file',
    type: 'string'
});

createField('tests', {
    describe: 'Search path for test files (glob pattern)',
    type: 'string'
});

createField('plugins', {
    describe: 'Set of plugins (list). API: --plugins=plugin1 --plugins=plugin2 ...',
    type: 'array'
});

createField('httpThrottle', {
    describe: 'Time of delay before next http request',
    type: 'number'
});

createField('logLevel', {
    describe: 'Flag for filtering log records',
    type: 'string'
});

createField('envConfig', {
    describe: 'Path to environment config which overrides main config',
    type: 'string'
});

// CLI entry point, it makes all initialization job and
// handles all errors, that was not cached inside command

export const runCLI = async (argv: Array<string>) => {
    const args = yargs.parse(argv);
    const command = args._[2];

    const config = await getConfig(argv);

    let commandExecution;

    switch (command) {
        case 'run':
            commandExecution = runTests(config, process.stdout);
            break;

        case 'record':
            commandExecution = runRecordingProcess(config, process.stdout);
            break;

        default:
            yargs.showHelp();
            return;
    }

    commandExecution.catch((exception) => {
        new LoggerServer(config, transport, process.stdout);

        loggerClientLocal.error(exception);

        setTimeout(() => {
            process.exit(1);
        }, 500);
    });

};
