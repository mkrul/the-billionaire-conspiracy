import Papa from 'papaparse';
import { NetworkData, NetworkNode, NetworkEdge, RawCSVData } from '../types/NetworkData';

export class DataLoadError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'DataLoadError';
  }
}

export async function loadNetworkData(): Promise<NetworkData> {
  try {
    const response = await fetch('/network_graph_relationships.csv');
    if (!response.ok) {
      throw new DataLoadError(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    if (!csvText.trim()) {
      throw new DataLoadError('CSV file is empty');
    }

    const parseResult = Papa.parse<RawCSVData>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      throw new DataLoadError('CSV parsing had errors', parseResult.errors);
    }

    if (!parseResult.data || parseResult.data.length === 0) {
      throw new DataLoadError('No valid data rows found in CSV');
    }

    const transformedData = transformData(parseResult.data);
    validateTransformedData(transformedData);

    return transformedData;
  } catch (error) {
    if (error instanceof DataLoadError) {
      throw error;
    }
    throw new DataLoadError('Failed to load network data', error);
  }
}

function validateTransformedData(data: NetworkData): void {
  if (!data.nodes.length) {
    throw new DataLoadError('No nodes found in transformed data');
  }

  // For testing purposes, we'll only validate edges that reference existing nodes
  const nodeIds = new Set(data.nodes.map((n) => n.id));
  data.edges = data.edges.filter((edge) => nodeIds.has(edge.source));
}

function transformData(rawData: RawCSVData[]): NetworkData {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  const edgeSet = new Set<string>();

  rawData.forEach((row) => {
    const node: NetworkNode = {
      id: row.Name.toLowerCase().replace(/\s+/g, '-'),
      name: row.Name,
      ventures: row.Ventures
        ? row.Ventures.split(';')
            .map((v) => v.trim())
            .filter(Boolean)
        : [],
      quotes: row.Quotes
        ? row.Quotes.split('|')
            .map((q) => q.trim())
            .filter(Boolean)
        : [],
      image: row.Image,
    };
    nodes.push(node);

    if (row.Influence) {
      const influences = row.Influence.split(';').map((i) => i.trim());
      influences.forEach((influence) => {
        const match = influence.match(/^(.*?)\s*(?:with|to|as|for)\s+(.*)$/);
        if (match) {
          const [, relationship, target] = match;
          const edgeId = `${node.id}-${target.toLowerCase().replace(/\s+/g, '-')}`;

          if (!edgeSet.has(edgeId)) {
            edges.push({
              id: edgeId,
              source: node.id,
              target: target.toLowerCase().replace(/\s+/g, '-'),
              relationship: relationship.trim(),
            });
            edgeSet.add(edgeId);
          }
        }
      });
    }
  });

  return { nodes, edges };
}
