/**
 * Network Graph Data Structure Documentation
 * ----------------------------------------
 *
 * This file documents the data structure used for the influence map visualization.
 * The structure is designed to represent relationships between people and organizations,
 * including various types of influences and connections.
 *
 * Entity Types:
 * - person: Individual actors in the network
 * - organization: Companies, foundations, or other institutional entities
 *
 * Relationship Types:
 * - personal: Direct personal connections (e.g., "Friends with")
 * - professional: Work relationships (e.g., "Worked for", "Hired")
 * - financial: Monetary connections (e.g., "Donated", "Invested")
 * - political: Political influence (e.g., "Appointed", "Recommended")
 *
 * Example Usage:
 *
 * ```typescript
 * const sampleNode: NodeData = {
 *     id: "peter-thiel",
 *     name: "Peter Thiel",
 *     type: "person",
 *     image: "/public/images/thiel.jpg",
 *     quotes: ["Quote 1", "Quote 2"],
 *     ventures: ["PayPal", "Palantir"]
 * };
 *
 * const sampleEdge: EdgeData = {
 *     id: "thiel-luckey",
 *     source: "peter-thiel",
 *     target: "palmer-luckey",
 *     type: "personal",
 *     description: "Friends with Palmer Luckey"
 * };
 * ```
 *
 * Data Flow:
 * 1. CSV data is loaded from network_graph_relationships.csv
 * 2. transformCSVToNetworkData() converts it to NetworkData structure
 * 3. Cytoscape.js uses this data for visualization
 *
 * Adding New Data:
 * 1. For new people: Add a row to the CSV with Name, Influence, Ventures, etc.
 * 2. For new organizations: They are automatically created from the Ventures column
 * 3. For new relationship types: Update the RelationType type and transformer logic
 *
 * CSV Format:
 * - Name: Entity name (required)
 * - Influence: Semicolon-separated list of relationships
 * - Ventures: Semicolon-separated list of organizations
 * - Connections: Currently unused
 * - Quotes: Pipe-separated list of quotes
 * - Image: Path to profile image
 *
 * Validation Rules:
 * - IDs are auto-generated from names (lowercase, hyphenated)
 * - All nodes must have an id and name
 * - All edges must have source, target, and type
 * - Images should be in /public/images/
 *
 * @see transformCSVToNetworkData in dataTransformer.ts for implementation details
 */

// Re-export types for documentation completeness
export * from './network';
