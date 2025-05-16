/**
 * CSV Parser for Network Graph
 * Transforms the CSV data into a format compatible with Highcharts networkgraph
 */

class NetworkDataParser {
    constructor() {
        this.nodes = [];
        this.links = [];
        this.nodeMap = new Map(); // To keep track of node indices
        this.primaryNames = new Set(); // Will store names from the Names column
        this.jsonData = null; // Add storage for JSON format
    }

    /**
     * Parse CSV content into graph data
     * @param {string} csvContent - Raw CSV content
     * @returns {Object} Object with nodes and links arrays
     */
    parseCSV(csvContent) {
        // Reset data
        this.nodes = [];
        this.links = [];
        this.nodeMap = new Map();
        this.primaryNames = new Set();

        // Split CSV into lines and get headers
        const lines = csvContent.trim().split('\n');

        // First pass: collect all primary names from the Names column
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const values = this.parseCSVLine(line);
            const name = values[0];
            if (name) {
                this.primaryNames.add(name.trim());
            }
        }

        // Second pass: create nodes and relationships
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const values = this.parseCSVLine(line);
            const name = values[0];
            const influence = values[1];
            const venturesStr = values[2];
            const connectionsStr = values[3];
            const quotesStr = values[4];

            // Process ventures and other data
            const ventures = venturesStr ? venturesStr.split(';').map(v => v.trim()) : [];
            const connections = connectionsStr ? connectionsStr.split(';').map(c => c.trim()) : [];
            const quotes = quotesStr ? quotesStr.split('|').map(q => q.trim()) : [];

            // Add primary node
            if (!this.nodeMap.has(name)) {
                const nodeIndex = this.nodes.length;
                this.nodeMap.set(name, nodeIndex);
                this.nodes.push({
                    id: name,
                    ventures: ventures,
                    quotes: quotes,
                    connectionCount: connections.length
                });
            }

            // Process relationships only for primary names
            const influenceRelationships = this.parseInfluenceField(influence);
            for (const rel of influenceRelationships) {
                if (rel.target && this.primaryNames.has(rel.target)) {
                    this.links.push({
                        source: name,
                        target: rel.target,
                        type: rel.type
                    });

                    // Add target node if it doesn't exist yet
                    if (!this.nodeMap.has(rel.target)) {
                        const nodeIndex = this.nodes.length;
                        this.nodeMap.set(rel.target, nodeIndex);
                        this.nodes.push({
                            id: rel.target,
                            ventures: [],
                            quotes: [],
                            connectionCount: 0
                        });
                    }
                }
            }
        }

        return {
            nodes: this.nodes,
            links: this.links
        };
    }

    /**
     * Parse a CSV line, properly handling quoted values
     * @param {string} line - CSV line to parse
     * @returns {Array} Array of values from the line
     */
    parseCSVLine(line) {
        const result = [];
        let currentValue = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"' && !inQuotes) {
                inQuotes = true;
                continue;
            }

            if (char === '"' && inQuotes) {
                // Check if it's an escaped quote
                if (i + 1 < line.length && line[i + 1] === '"') {
                    currentValue += '"';
                    i++; // Skip the next quote
                } else {
                    inQuotes = false;
                }
                continue;
            }

            if (char === ',' && !inQuotes) {
                result.push(currentValue.trim());
                currentValue = '';
                continue;
            }

            currentValue += char;
        }

        // Add the last value
        result.push(currentValue.trim());

        return result;
    }

    /**
     * Parse the influence field to extract relationships
     * @param {string} influenceField - Influence field from CSV
     * @returns {Array} Array of relationship objects {target, type}
     */
    parseInfluenceField(influenceField) {
        if (!influenceField) {
            return [];
        }

        const relationships = [];
        const influenceItems = influenceField.split(';');

        for (const item of influenceItems) {
            const trimmedItem = item.trim();

            // Look for patterns like "Friends with John Doe" or "Hired Jane Smith"
            // These patterns indicate a relationship type and a target person

            // Common relationship types to look for
            const relationshipTypes = [
                "Friends with", "Hired", "Appointed", "Worked for",
                "Donated to", "Founded", "Recommended", "Contributed to"
            ];

            for (const relType of relationshipTypes) {
                if (trimmedItem.startsWith(relType)) {
                    const target = trimmedItem.substring(relType.length).trim();
                    if (target) {
                        relationships.push({
                            type: relType,
                            target: target
                        });
                    }
                    break;
                }
            }
        }

        return relationships;
    }

    /**
     * Load CSV file from a URL and parse it
     * @param {string} filePath - Path to the CSV file
     * @returns {Promise} Promise resolving to parsed data
     */
    async loadAndParseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';

            input.onchange = async (event) => {
                const file = event.target.files[0];
                const reader = new FileReader();

                reader.onload = (e) => {
                    try {
                        const csvContent = e.target.result;
                        const parsedData = this.parseCSV(csvContent);
                        resolve(parsedData);
                    } catch (error) {
                        reject(error);
                    }
                };

                reader.onerror = (error) => {
                    reject(error);
                };
                reader.readAsText(file);
            };

            input.click();
        });
    }

    /**
     * Enhanced CSV loading with better error handling
     * @param {string} filePath - Path to the CSV file
     * @returns {Promise} Promise resolving to parsed data
     */
    async loadAndParseCSVFromPath(filePath) {
        try {
            const response = await fetch(filePath);

            if (!response.ok) {
                throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
            }

            const csvContent = await response.text();
            const parsedResult = this.parseCSV(csvContent);
            return parsedResult;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Optimize the network data for performance
     * @param {Object} data - The parsed graph data
     * @param {number} maxNodes - Maximum number of nodes to show (if needed)
     * @returns {Object} Optimized graph data
     */
    optimizeNetworkData(data, maxNodes = 0) {
        // If we have more nodes than maxNodes and maxNodes is specified
        if (maxNodes > 0 && data.nodes.length > maxNodes) {
            // Sort nodes by connection count (most connected first)
            const sortedNodes = [...data.nodes].sort((a, b) =>
                (b.connectionCount || 0) - (a.connectionCount || 0));

            // Take the top maxNodes
            const topNodes = sortedNodes.slice(0, maxNodes);
            const topNodeIds = new Set(topNodes.map(node => node.id));

            // Filter links to only include those connected to top nodes
            const filteredLinks = data.links.filter(link =>
                topNodeIds.has(link.source) && topNodeIds.has(link.target));

            const optimizedData = {
                nodes: topNodes,
                links: filteredLinks
            };
            return optimizedData;
        }
        return data;
    }

    /**
     * Get the current data in JSON format
     * @returns {Object} Object with nodes and links arrays
     */
    toJSON() {
        return {
            nodes: this.nodes.map(node => ({
                id: node.id,
                ventures: node.ventures || [],
                quotes: node.quotes || [],
                connectionCount: node.connectionCount || 0
            })),
            links: this.links
        };
    }

    /**
     * Save the current data to a JSON file
     * @returns {string} JSON string of the data
     */
    saveToJSON() {
        return JSON.stringify(this.toJSON(), null, 2);
    }

    /**
     * Load data from JSON format
     * @param {Object} jsonData - The JSON data to load
     */
    loadFromJSON(jsonData) {
        this.nodes = jsonData.nodes;
        this.links = jsonData.links;
        this.nodeMap = new Map();

        // Rebuild nodeMap
        this.nodes.forEach((node, index) => {
            this.nodeMap.set(node.id, index);
        });

        return {
            nodes: this.nodes,
            links: this.links
        };
    }
}
