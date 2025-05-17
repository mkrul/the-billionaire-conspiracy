import { NodeData, EdgeData, NetworkData, RelationType } from '../types/network';

function sanitizeId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

function parseInfluenceString(influence: string): EdgeData[] {
  if (!influence) return [];

  const relationships = influence.split(';').map((r) => r.trim());
  return relationships
    .map((rel, index) => {
      // Extract target name from relationship description
      const match = rel.match(
        /(?:Friends with|Hired|Appointed|Worked for|Founded|Donated|Recommended) ([^;]+)/
      );
      if (!match) return null;

      const targetName = match[1].trim();
      const targetId = sanitizeId(targetName);

      // Determine relationship type
      let type: RelationType = 'professional';
      if (rel.toLowerCase().includes('friends with')) type = 'personal';
      if (rel.toLowerCase().includes('donated')) type = 'financial';
      if (rel.toLowerCase().includes('appointed') || rel.toLowerCase().includes('recommended'))
        type = 'political';

      // Extract amount if present
      const amountMatch = rel.match(/\$[\d.]+[BM]+/);
      const amount = amountMatch ? amountMatch[0] : undefined;

      return {
        id: `${index}-${Date.now()}`,
        source: '', // Will be filled in by the main transformer
        target: targetId,
        type,
        description: rel,
        amount,
      };
    })
    .filter(Boolean) as EdgeData[];
}

function parseVentures(ventures: string): string[] {
  if (!ventures) return [];
  return ventures.split(';').map((v) => v.trim());
}

function parseQuotes(quotes: string): string[] {
  if (!quotes) return [];
  return quotes.split('|').map((q) => q.trim());
}

export function transformCSVToNetworkData(csvData: string): NetworkData {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');

  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];

  // Process each line except header
  lines.slice(1).forEach((line) => {
    if (!line.trim()) return;

    const [name, influence, ventures, , quotes, image] = line.split(',');
    if (!name) return;

    const id = sanitizeId(name);

    // Create node
    const node: NodeData = {
      id,
      name,
      type: 'person', // Default to person, can be updated if needed
      image: image?.trim(),
      quotes: parseQuotes(quotes),
      ventures: parseVentures(ventures),
    };
    nodes.push(node);

    // Create edges from influence relationships
    const nodeEdges = parseInfluenceString(influence);
    nodeEdges.forEach((edge) => {
      if (edge) {
        edge.source = id;
        edges.push(edge);
      }
    });
  });

  // Add organization nodes from ventures
  const allVentures = new Set<string>();
  nodes.forEach((node) => {
    node.ventures?.forEach((venture) => allVentures.add(venture));
  });

  allVentures.forEach((venture) => {
    nodes.push({
      id: sanitizeId(venture),
      name: venture,
      type: 'organization',
      ventures: [],
    });
  });

  return { nodes, edges };
}

// Usage example:
// import { readFileSync } from 'fs';
// const csvData = readFileSync('network_graph_relationships.csv', 'utf-8');
// const networkData = transformCSVToNetworkData(csvData);
