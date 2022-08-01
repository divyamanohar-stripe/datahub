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
        }
        console.info(`Registered ${mappings.length} GraphQL mocks for development.`);
    }

    public request(operation: Operation): Observable<FetchResult> | null {
        const key = JSON.stringify({
            operationName: operation.operationName,
            query: print(operation.query),
            variables: operation.variables,
        });
        const mapping = this.mappings.get(key);

        if (!mapping || !mapping.result) {
            console.warn(
                [
                    '*'.repeat(80),
                    `  The mapping for a "${operation.operationName}" query is missing.`,
                    '*'.repeat(80),
                    '',
                    `If this is an existing operation, capture the same action in production and run add-local-mocks.js.`,
                    '',
                    `If this is a new operation, go to https://datahub.corp.stripe.com/api/graphiql and capture execution of the following:`,
                    '',
                    'Query:',
                    print(operation.query).replace(/^/gm, '    '),
                    '',
                    'Variables:',
                    JSON.stringify(operation.variables).replace(/^/gm, '    '),
                    '',
                ].join('\n'),
            );
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
                    `\nSimulated GraphQL response with a delay of ${delayMillis?.toFixed(0) ?? 0} milliseconds:\n${
                        operation.operationName
                    }(${JSON.stringify(operation.variables, null, 2)})\n\n`,
                );
                observer.next(result);
                observer.complete();
            }, delayMillis ?? 0);

            // return the cancellation handler
            return () => clearTimeout(timer);
        });
    }
}
