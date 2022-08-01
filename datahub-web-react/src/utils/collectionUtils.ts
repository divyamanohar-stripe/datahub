export function addToMultimap<K, V>(map: Map<K, Set<V>>, key: K, value: V): boolean {
    let bucket = map.get(key);
    if (!bucket) {
        bucket = new Set();
        map.set(key, bucket);
    }
    if (bucket.has(value)) {
        return false;
    }
    bucket.add(value);
    return true;
}

export function mapGetWithDefault<K, V>(map: Map<K, V>, key: K, defaultFn: () => V): V {
    const found = map.get(key);
    if (found) return found;

    const value = defaultFn();
    map.set(key, value);
    return value;
}

export function mapUpdate<K, V>(map: Map<K, V>, key: K, updateFn: (prev: V | undefined) => V): V {
    const updated = updateFn(map.get(key));
    map.set(key, updated);
    return updated;
}

export function mapFromObjectArray<K, V>(array: ReadonlyArray<{ readonly key?: K; readonly value?: V }>): Map<K, V> {
    const map: Map<K, V> = new Map();
    array.forEach((entry) => {
        if (entry.key !== undefined && entry.value !== undefined) {
            map.set(entry.key, entry.value);
        }
    });
    return map;
}

export function sortBy<T>(array: T[], byFn: (x: T) => string | number): T[] {
    return array.sort((a, b) => {
        const byA = byFn(a);
        const byB = byFn(b);
        if (byA < byB) return -1;
        if (byA > byB) return 1;
        return 0;
    });
}
