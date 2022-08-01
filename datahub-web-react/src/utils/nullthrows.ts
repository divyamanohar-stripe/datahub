export function nullthrows<T>(value: T | undefined | null): T {
    if (value === undefined || value === null) {
        const message = `unexpected ${value === undefined ? 'undefined' : 'null'} passed to nullthrows()`;
        // The error is useless without a stack trace; use console.error to make sure the dev has the needed info.
        // nullthrows() should only be used when the developer has knowledge the compiler doesn't have,
        // rather than for argument checking.
        console.error(message);
        throw new Error();
    }
    return value;
}
