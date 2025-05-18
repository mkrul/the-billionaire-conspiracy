import { NetworkData, NetworkNode, NetworkEdge } from '../types/network';

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === '|' && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Push the last value
  values.push(currentValue.trim());

  // Remove quotes from values
  return values.map((v) => v.replace(/^"|"$/g, ''));
}

function normalizeImagePath(path: string): string {
  // Remove /public/ prefix and ensure the path starts with /
  return path.replace('/public/', '/');
}

export function parseCSVData(csvData: string): NetworkData {
  const lines = csvData.split('\n');
  const headers = parseCSVLine(lines[0]);
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];

  // First pass: collect all nodes
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const node: NetworkNode = {
      name: values[0],
      influence: values[1],
      ventures: values[2],
      connections: values[3],
      quotes: values[4],
      image: normalizeImagePath(values[5]),
    };
    nodes.push(node);
  }

  // Create a map of partial names to full names for matching
  const nameMap = new Map<string, string>();
  nodes.forEach((node) => {
    nameMap.set(node.name, node.name); // Full name mapping
    // Add last name mapping
    const lastName = node.name.split(' ').pop() || '';
    if (lastName && lastName !== node.name) {
      nameMap.set(lastName, node.name);
    }
  });

  // Second pass: create edges with correct name references
  nodes.forEach((node) => {
    // Parse influence relationships into edges
    const influences = node.influence.split(';').map((s) => s.trim());
    influences.forEach((influence) => {
      if (!influence) return;

      // Extract relationship and target from influence string
      // Format: "Relationship with Target"
      const match = influence.match(/^(.*?) with (.*)$/);
      if (match) {
        const targetName = nameMap.get(match[2].trim()) || match[2].trim();
        if (nameMap.has(targetName)) {
          edges.push({
            source: node.name,
            target: targetName,
            relationship: match[1].trim(),
          });
        }
      } else {
        // If no "with" found, use the whole string as relationship
        const parts = influence.split(' ');
        const lastWord = parts.pop() || '';
        const targetName = nameMap.get(lastWord) || lastWord;
        if (nameMap.has(targetName)) {
          edges.push({
            source: node.name,
            target: targetName,
            relationship: parts.join(' ').trim(),
          });
        }
      }
    });

    // Parse connections into additional edges
    if (node.connections) {
      const connections = node.connections.split(';').map((s) => s.trim());
      connections.forEach((connection) => {
        if (!connection) return;
        const targetName = nameMap.get(connection) || connection;
        if (nameMap.has(targetName)) {
          edges.push({
            source: node.name,
            target: targetName,
            relationship: 'Connected to',
          });
        }
      });
    }
  });

  return { nodes, edges };
}
