import { MobxPromiseImpl, MobxPromise, MobxPromiseFactory, MobxPromiseInputUnion } from './MobxPromise';

export const remoteData: MobxPromiseFactory = function<R>(
    input: MobxPromiseInputUnion<R>,
    defaultResult?: R
) {
    const normalizedInput = MobxPromiseImpl.normalizeInput(
        input,
        defaultResult
    );
    const { invoke, onError } = normalizedInput;
    return new MobxPromise({
        ...input,
        invoke,
        default: normalizedInput.default,
        onError: error => {
            if (onError) {
                onError(error);
            }
        },
    });
};

export { MobxPromiseImpl, MobxPromise };
export type { MobxPromiseFactory, MobxPromiseInputUnion };
