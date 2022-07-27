/* eslint-disable */

const fs = require('fs').promises;
const path = require('path');

const MOCKS_FILE = path.resolve(__dirname, 'src', 'utils', 'local-dev-utils', 'MockData.json');

/* Read a Chrome-exported HAR file containing captured requests and add them to MockData.json */
async function main() {
    const mockData = await fs
        .readFile(MOCKS_FILE, { encoding: 'UTF-8' })
        .then((json) => JSON.parse(json))
        .catch((err) => {
            if (err.code === 'ENOENT') {
                return [];
            } else {
                throw err;
            }
        });

    const resultsBySerializedRequest = Object.fromEntries(
        mockData.map(({ request, result }) => [JSON.stringify(request), result]),
    );

    const [, , filename] = process.argv;
    if (!filename) {
        console.error('Run this script with a single argument, the path to the Chrome-exported HAR file.');
        process.exit(1);
    }

    // See http://www.softwareishard.com/blog/har-12-spec/ for HAR schema
    const harData = await fs
        .readFile(filename, { encoding: 'UTF-8' })
        .then((json) => JSON.parse(json))
        .catch((err) => {
            console.err(`Could not read file at path ${filename}:`, err);
            process.exit(1);
        });

    for (const entry of harData.log.entries) {
        const { request, response } = entry;
        if (request.method !== 'POST' || !request.url.endsWith('/api/v2/graphql')) {
            continue;
        }
        if (!request.postData || request.postData.mimeType !== 'application/json') {
            continue;
        }
        if (!response.content || response.content.mimeType !== 'application/json') {
            continue;
        }
        // normalize the request data to make a consistent key
        const serializedRequest = JSON.stringify(JSON.parse(request.postData.text));

        resultsBySerializedRequest[serializedRequest] = {
            delayMillis: entry.time, 
            result: JSON.parse(response.content.text)
        };
    }

    const sortedMockDataEntries = [...Object.entries(resultsBySerializedRequest)];
    sortedMockDataEntries.sort(([a], [b]) => (a < b ? -1 : 1));

    const outputMockData = sortedMockDataEntries.map(([serializedRequest, response]) => ({
        request: JSON.parse(serializedRequest),
        ...response,
    }));
    await fs.writeFile(MOCKS_FILE, JSON.stringify(outputMockData, null, 2));
}

if (require.main === module) {
    main()
        .then()
        .catch((err) => console.error('Uncaught exception:', err));
}
