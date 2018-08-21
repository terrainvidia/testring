import * as chai from 'chai';
import { loggerClient } from '@testring/logger';

type AssertionAPI = typeof chai['assert'] & { _errorMessages: Array<any> };

export const createAssertion = (isSoft = false) => {
    const root: AssertionAPI = Object.assign({}, chai.assert, {
        _errorMessages: []
    });

    return new Proxy<AssertionAPI>(root, {
        get(target, fieldName: string) {
            if (fieldName === '_errorMessages') {
                return target._errorMessages;
            }

            const typeOfAssert = isSoft ? 'softAssert' : 'assert';

            const originalMethod = chai.assert[fieldName];
            const methodAsString = target[fieldName].toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
            const stringStart = methodAsString.indexOf('(') + 1;
            const stringEnd = methodAsString.indexOf(')');
            const methodArgs = methodAsString.slice(stringStart, stringEnd).match(/([^\s,]+)/g) || [];

            return async (...args) => {
                const successMessage = originalMethod.length === args.length ? args.pop() : '';
                const assertArguments: Array<any> = [];

                let assertMessage = `[${typeOfAssert}] ${fieldName}`;

                for (let index = 0; index < methodArgs.length; index++) {
                    if (index === args.length) {
                        break;
                    }

                    const argsString = typeof args[index] !== 'undefined' ?
                        JSON.stringify(args[index]) :
                        'undefined';

                    assertArguments.push(methodArgs[index] + ' = ' + argsString);
                }

                assertMessage += `(${assertArguments.join(', ')})`;

                try {
                    originalMethod(...args);

                    if (successMessage) {
                        await loggerClient.info(successMessage);
                        //TODO makeScreenShot
                        await loggerClient.debug(assertMessage);
                    } else {
                        await loggerClient.debug(assertMessage);
                        //TODO makeScreenShot
                    }
                } catch (error) {
                    if (successMessage) {
                        await loggerClient.warn(successMessage);
                        //TODO makeScreenShot
                        await loggerClient.error(assertMessage);
                    } else {
                        await loggerClient.warn(assertMessage);
                    }

                    if (isSoft) {
                        target._errorMessages.push(successMessage || assertMessage || error.message);
                    } else {
                        error.message = (successMessage || assertMessage || error.message);

                        throw error;
                    }
                }
            };
        }
    });
};