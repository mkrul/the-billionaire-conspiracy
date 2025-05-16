/**
 * CSV Parser for Network Graph
 * Transforms the CSV data into a format compatible with Highcharts networkgraph
 */

class NetworkDataParser {
    constructor() {
        this.nodes = [];
        this.links = [];
        this.nodeMap = new Map(); // To keep track of node indices
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

        // Split CSV into lines and get headers
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',');

        // Process each line (skip header)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) {
                continue; // Skip empty lines
            }

            // Parse CSV line (handling quoted values properly)
            const values = this.parseCSVLine(line);

            // Extract data from CSV values
            const name = values[0];
            const influence = values[1];
            const venturesStr = values[2];
            const connectionsStr = values[3];
            const quotesStr = values[4];

            // Process ventures (comma-separated list)
            const ventures = venturesStr ? venturesStr.split(';').map(v => v.trim()) : [];

            // Process connections (comma-separated list)
            const connections = connectionsStr ? connectionsStr.split(';').map(c => c.trim()) : [];

            // Process quotes (semicolon-separated list)
            const quotes = quotesStr ? quotesStr.split('|').map(q => q.trim()) : [];

            // Add node if not already in the list
            if (!this.nodeMap.has(name)) {
                const nodeIndex = this.nodes.length;
                this.nodeMap.set(name, nodeIndex);

                this.nodes.push({
                    id: name,
                    ventures: ventures,
                    quotes: quotes,
                    // Count connections as a measure of influence for node sizing
                    connectionCount: connections.length
                });
            }

            // Parse influence field to extract relationship types
            const influenceRelationships = this.parseInfluenceField(influence);

            // Create links based on relationships
            for (const rel of influenceRelationships) {
                if (rel.target) {
                    this.links.push({
                        source: name,
                        target: rel.target,
                        type: rel.type
                    });

                    // Ensure the target node also exists
                    if (!this.nodeMap.has(rel.target)) {
                        const nodeIndex = this.nodes.length;
                        this.nodeMap.set(rel.target, nodeIndex);
                        this.nodes.push({
                            id: rel.target,
                            ventures: [], // No venture info if not a primary row
                            quotes: [],   // No quote info
                            connectionCount: 0 // No explicit connections from its own row
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
}
