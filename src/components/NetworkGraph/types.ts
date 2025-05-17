export interface NetworkNode {
  name: string;
  image: string;
  quotes: string;
  ventures: string;
  influence: string;
  connections: string;
}

export interface NetworkEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}
