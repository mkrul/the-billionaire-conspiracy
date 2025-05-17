export type EntityType = 'person' | 'organization';
export type RelationType = 'professional' | 'personal' | 'financial' | 'political';

export interface NodeData {
  id: string;
  name: string;
  type: EntityType;
  image?: string;
  quotes?: string[];
  ventures?: string[];
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  description: string;
  amount?: string;
}

export interface NetworkData {
  nodes: NodeData[];
  edges: EdgeData[];
}
