/**
 * Represents a node in the influence network.
 * Each node represents a person or organization in the network.
 */
export interface NetworkNode {
  /** Unique identifier for the node, generated from the name in lowercase with spaces replaced by hyphens */
  id: string;
  /** Display name of the person or organization */
  name: string;
  /** List of ventures/organizations associated with this node */
  ventures: string[];
  /** List of notable quotes from this person */
  quotes: string[];
  /** Path to the profile image */
  image: string;
}

/**
 * Represents a relationship (edge) between two nodes in the network.
 * Each edge represents a connection or influence between two entities.
 */
export interface NetworkEdge {
  /** Unique identifier for the edge, generated from source-target IDs */
  id: string;
  /** ID of the node where the relationship originates */
  source: string;
  /** ID of the node where the relationship points to */
  target: string;
  /** Description of the relationship (e.g., "Friends", "Hired", "Donated to") */
  relationship: string;
}

/**
 * Complete network data structure containing all nodes and edges.
 */
export interface NetworkData {
  /** List of all nodes in the network */
  nodes: NetworkNode[];
  /** List of all relationships between nodes */
  edges: NetworkEdge[];
}

/**
 * Raw data structure from the CSV file.
 * This interface matches the columns in network_graph_relationships.csv.
 */
export interface RawCSVData {
  /** Name of the person or organization */
  Name: string;
  /** Semicolon-separated list of influences, each in format "relationship with target" */
  Influence: string;
  /** Semicolon-separated list of ventures/organizations */
  Ventures: string;
  /** Semicolon-separated list of connections */
  Connections: string;
  /** Pipe-separated list of quotes */
  Quotes: string;
  /** Path to the profile image */
  Image: string;
}

/**
 * Loading states for the network data.
 */
export type NetworkDataLoadingState = {
  /** The current loading status */
  status: 'idle' | 'loading' | 'success' | 'error';
  /** The loaded data, if status is 'success' */
  data?: NetworkData;
  /** Error message if status is 'error' */
  error?: string;
};
