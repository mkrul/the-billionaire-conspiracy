import { NetworkData, NetworkNode, NetworkEdge } from './types';

export function parseCSVData(csvData: string): NetworkData {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');
    const node: NetworkNode = {
      name: values[0],
      influence: values[1],
      ventures: values[2],
      connections: values[3],
      quotes: values[4],
      image: values[5],
    };
    nodes.push(node);

    // Parse influence relationships into edges
    const influences = node.influence.split(';').map((s) => s.trim());
    influences.forEach((influence) => {
      if (!influence) return;

      // Extract relationship and target from influence string
      // Format: "Relationship with Target"
      const match = influence.match(/^(.*?) with (.*)$/);
      if (match) {
        edges.push({
          source: node.name,
          target: match[2],
          relationship: match[1],
        });
      } else {
        // If no "with" found, use the whole string as relationship
        const target = influence.split(' ').pop() || '';
        const relationship = influence.split(' ').slice(0, -1).join(' ');
        edges.push({
          source: node.name,
          target,
          relationship,
        });
      }
    });
  }

  return { nodes, edges };
}
