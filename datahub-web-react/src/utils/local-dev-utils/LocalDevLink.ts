import { ApolloLink, FetchResult, Observable, Operation } from '@apollo/client';
import { print } from 'graphql/language/printer';
import { parse } from 'graphql';

export type LocalDevMapping = {
    readonly request: {
        readonly operationName: string;
        readonly query: string;
        readonly variables: Record<string, any>;
    };
    readonly result: FetchResult;
    readonly delayMillis?: number;
};

/**
 * Based on MockLink from the apollo-client library.
 *
 * Unlike MockLink, this link allows mocked responses to be used multiple times.
 */
export class LocalDevLink extends ApolloLink {
    private readonly mappings: Map<string, LocalDevMapping> = new Map();

    constructor(mappings: readonly LocalDevMapping[]) {
        super();
        for (let i = 0; i < mappings.length; i++) {
            const mapping = mappings[i];
            const key = JSON.stringify({
                operationName: mapping.request.operationName,
                query: print(parse(mapping.request.query)),
                variables: mapping.request.variables,
            });
            this.mappings.set(key, mapping);
            console.trace(`Registered mapping with key: ${key}`);
        }
        console.info(`Registered ${mappings.length} GraphQL mocks for development.`);
    }

    public request(operation: Operation): Observable<FetchResult> | null {
        const key = JSON.stringify({
            operationName: operation.operationName,
            query: print(operation.query),
            variables: operation.variables,
        });
        console.trace(`Looking up mapping with key: ${key}`);
        const mapping = this.mappings.get(key);

        if (!mapping) {
            return new Observable((observer) => {
                try {
                    this.onError(
                        new Error(
                            `Could not find a mocked response for the query: ${print(
                                operation.query,
                            )} with variables ${JSON.stringify(operation.variables)}`,
                        ),
                    );
                } catch (err) {
                    observer.error(err);
                }
            });
        }

        return new Observable((observer) => {
            const { delayMillis, result } = mapping;

            const timer = setTimeout(() => {
                console.info(
                    `Simulated GraphQL response to "${operation.operationName}" operation with a delay of ${
                        delayMillis?.toFixed(0) ?? 0
                    } milliseconds`,
                );
                observer.next(result);
                observer.complete();
            }, delayMillis ?? 0);

            // return the cancellation handler
            return () => clearTimeout(timer);
        });
    }
}
