import { nullthrows } from './nullthrows';

export function rankGraphNodes(
    initialNodeId: string,
    outgoingEdges: Map<string, ReadonlySet<string>>,
): Map<string, number> {
    const ranks: Map<string, number> = new Map();
    const queue: string[] = [];

    ranks.set(initialNodeId, 0);
    queue.push(initialNodeId);

    while (queue.length > 0) {
        const nextNodeId = nullthrows(queue.shift());
        const rank = nullthrows(ranks.get(nextNodeId));
        outgoingEdges.get(nextNodeId)?.forEach((otherNodeId) => {
            if (ranks.has(otherNodeId)) {
                return;
            }
            ranks.set(otherNodeId, rank + 1);
            queue.push(otherNodeId);
        });
    }

    return ranks;
}
