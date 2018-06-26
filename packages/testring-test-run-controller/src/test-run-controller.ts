import { loggerClientLocal } from '@testring/logger';
import { TestWorker, TestWorkerInstance } from '@testring/test-worker';
import { PluggableModule } from '@testring/pluggable-module';
import { IConfig } from '@testring/typings';
import { ITestFile } from '@testring/test-finder';

interface IQueuedTest {
    retryCount: number,
    test: ITestFile
}

const delay = (milliseconds: number) => new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
});

export enum TestRunControllerHooks {
    beforeRun = 'beforeRun',
}

export class TestRunController extends PluggableModule {

    private errors: Array<Error> = [];

    constructor(
        private config: Partial<IConfig>,
        private testWorker: TestWorker,
    ) {
        super([
            TestRunControllerHooks.beforeRun,
        ]);
    }

    public async runQueue(testSet: Array<ITestFile>): Promise<Error[] | void> {
        const testQueue = this.prepareTests(testSet);
        const testQueueAfterHook = await this.callHook(TestRunControllerHooks.beforeRun, testQueue);
        const configWorkerLimit = this.config.workerLimit || 0;

        const workerLimit = configWorkerLimit < testQueueAfterHook.length ?
            configWorkerLimit :
            testQueueAfterHook.length;

        const workers = this.createWorkers(workerLimit);

        try {
            await Promise.all(
                workers.map(worker => this.executeWorker(worker, testQueueAfterHook))
            );
        } catch (e) {
            loggerClientLocal.error(...this.errors);
            throw e;
        }

        if (this.errors.length) {
            return this.errors;
        }
    }

    private createWorkers(limit: number): Array<TestWorkerInstance> {
        const workers: Array<TestWorkerInstance> = [];

        for (let index = 0; index < limit; index++) {
            workers.push(this.testWorker.spawn());
        }

        return workers;
    }

    private prepareTests(testFiles: Array<ITestFile>): Array<IQueuedTest> {
        const testQueue = new Array(testFiles.length);
        const retryCount = this.config.retryCount || 0;

        for (let index = 0; index < testFiles.length; index++) {
            testQueue[index] = {
                retryCount: retryCount,
                test: testFiles[index]
            };
        }

        return testQueue;
    }

    private async occupyWorker(worker: TestWorkerInstance, queue: Array<IQueuedTest>): Promise<void> {
        if (queue.length > 0) {
            return this.executeWorker(worker, queue);
        } else {
            worker.kill();
        }
    }

    private async onTestFailed(
        exception: any,
        worker: TestWorkerInstance,
        test: IQueuedTest,
        queue: Array<IQueuedTest>
    ): Promise<void> {
        if (this.config.verbose) {
            this.errors.push(exception.error);
            throw exception.error;
        }

        if (test.retryCount > 0) {
            test.retryCount--;

            await delay(this.config.retryDelay || 0);

            queue.push(test);

            await this.executeWorker(worker, queue);
        } else {
            this.errors.push(exception.error);

            await this.occupyWorker(worker, queue);
        }
    }

    private async executeWorker(worker: TestWorkerInstance, queue: Array<IQueuedTest>): Promise<void> {
        const queuedTest = queue.pop();

        if (!queuedTest) {
            return;
        }

        try {
            await worker.execute(queuedTest.test.content, queuedTest.test.path, queuedTest.test.meta);
        } catch (error) {
            await this.onTestFailed(error, worker, queuedTest, queue);
        } finally {
            await this.occupyWorker(worker, queue);
        }
    }
}
