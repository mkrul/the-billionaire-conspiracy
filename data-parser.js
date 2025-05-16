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
        console.log("Starting parseCSV with content:", csvContent);
        // Reset data
        this.nodes = [];
        this.links = [];
        this.nodeMap = new Map();

        // Split CSV into lines and get headers
        const lines = csvContent.trim().split('\n');
        console.log("CSV lines:", lines);
        const headers = lines[0].split(',');
        console.log("CSV headers:", headers);

        // Process each line (skip header)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            console.log(`Processing line ${i}:`, line);
            if (!line.trim()) {
                console.log(`Skipping empty line ${i}`);
                continue; // Skip empty lines
            }

            // Parse CSV line (handling quoted values properly)
            const values = this.parseCSVLine(line);
            console.log(`Parsed values for line ${i}:`, values);

            // Extract data from CSV values
            const name = values[0];
            const influence = values[1];
            const venturesStr = values[2];
            const connectionsStr = values[3];
            const quotesStr = values[4];
            console.log(`Data for ${name}: Influence - ${influence}, Ventures - ${venturesStr}, Connections - ${connectionsStr}, Quotes - ${quotesStr}`);

            // Process ventures (comma-separated list)
            const ventures = venturesStr ? venturesStr.split(';').map(v => v.trim()) : [];
            console.log(`Ventures for ${name}:`, ventures);

            // Process connections (comma-separated list)
            const connections = connectionsStr ? connectionsStr.split(';').map(c => c.trim()) : [];
            console.log(`Connections for ${name}:`, connections);

            // Process quotes (semicolon-separated list)
            const quotes = quotesStr ? quotesStr.split('|').map(q => q.trim()) : [];
            console.log(`Quotes for ${name}:`, quotes);

            // Add node if not already in the list
            if (!this.nodeMap.has(name)) {
                const nodeIndex = this.nodes.length;
                this.nodeMap.set(name, nodeIndex);
                console.log(`Adding new node: ${name} at index ${nodeIndex}`);

                this.nodes.push({
                    id: name,
                    ventures: ventures,
                    quotes: quotes,
                    // Count connections as a measure of influence for node sizing
                    connectionCount: connections.length
                });
                console.log(`Node ${name} added:`, this.nodes[this.nodes.length - 1]);
            } else {
                console.log(`Node ${name} already exists.`);
            }

            // Parse influence field to extract relationship types
            const influenceRelationships = this.parseInfluenceField(influence);
            console.log(`Influence relationships for ${name}:`, influenceRelationships);

            // Create links based on relationships
            for (const rel of influenceRelationships) {
                if (rel.target) {
                    console.log(`Creating link from ${name} to ${rel.target} of type ${rel.type}`);
                    this.links.push({
                        source: name,
                        target: rel.target,
                        type: rel.type
                    });
                    console.log("Current links:", this.links);

                    // Ensure the target node also exists
                    if (!this.nodeMap.has(rel.target)) {
                        const nodeIndex = this.nodes.length;
                        this.nodeMap.set(rel.target, nodeIndex);
                        console.log(`Adding new target node: ${rel.target} at index ${nodeIndex}`);
                        this.nodes.push({
                            id: rel.target,
                            ventures: [], // No venture info if not a primary row
                            quotes: [],   // No quote info
                            connectionCount: 0 // No explicit connections from its own row
                        });
                        console.log(`Target node ${rel.target} added:`, this.nodes[this.nodes.length - 1]);
                    } else {
                        console.log(`Target node ${rel.target} already exists.`);
                    }
                }
            }
        }
        console.log("Finished parseCSV. Final nodes:", this.nodes);
        console.log("Finished parseCSV. Final links:", this.links);

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
        console.log("Parsing CSV line:", line);
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
        console.log("Parsed CSV line result:", result);

        return result;
    }

    /**
     * Parse the influence field to extract relationships
     * @param {string} influenceField - Influence field from CSV
     * @returns {Array} Array of relationship objects {target, type}
     */
    parseInfluenceField(influenceField) {
        console.log("Parsing influence field:", influenceField);
        if (!influenceField) {
            console.log("Empty influence field, returning empty array.");
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
                        console.log(`Found relationship: Type - ${relType}, Target - ${target}`);
                    }
                    break;
                }
            }
        }
        console.log("Parsed influence field relationships:", relationships);

        return relationships;
    }

    /**
     * Load CSV file from a URL and parse it
     * @param {string} filePath - Path to the CSV file
     * @returns {Promise} Promise resolving to parsed data
     */
    async loadAndParseCSV(filePath) {
        console.log("loadAndParseCSV called with filePath:", filePath);
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
                        console.log("CSV content loaded in loadAndParseCSV:", csvContent);
                        const parsedData = this.parseCSV(csvContent);
                        console.log("Data parsed in loadAndParseCSV:", parsedData);
                        resolve(parsedData);
                    } catch (error) {
                        console.error("Error in loadAndParseCSV reader.onload:", error);
                        reject(error);
                    }
                };

                reader.onerror = (error) => {
                    console.error("Error in loadAndParseCSV reader.onerror:", error);
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
        console.log("loadAndParseCSVFromPath called with filePath:", filePath);
        try {
            const response = await fetch(filePath);
            console.log("Fetch response status:", response.status);

            if (!response.ok) {
                console.error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
                throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
            }

            const csvContent = await response.text();
            console.log("CSV content loaded in loadAndParseCSVFromPath:", csvContent);
            const parsedResult = this.parseCSV(csvContent);
            console.log("Data parsed in loadAndParseCSVFromPath:", parsedResult);
            return parsedResult;
        } catch (error) {
            console.error('Error loading CSV file in loadAndParseCSVFromPath:', error);
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
        console.log("optimizeNetworkData called with data:", data, "and maxNodes:", maxNodes);
        // If we have more nodes than maxNodes and maxNodes is specified
        if (maxNodes > 0 && data.nodes.length > maxNodes) {
            console.log(`Optimizing data: Reducing nodes from ${data.nodes.length} to ${maxNodes}`);
            // Sort nodes by connection count (most connected first)
            const sortedNodes = [...data.nodes].sort((a, b) =>
                (b.connectionCount || 0) - (a.connectionCount || 0));
            console.log("Sorted nodes for optimization:", sortedNodes);

            // Take the top maxNodes
            const topNodes = sortedNodes.slice(0, maxNodes);
            console.log("Top nodes after optimization:", topNodes);
            const topNodeIds = new Set(topNodes.map(node => node.id));

            // Filter links to only include those connected to top nodes
            const filteredLinks = data.links.filter(link =>
                topNodeIds.has(link.source) && topNodeIds.has(link.target));
            console.log("Filtered links after optimization:", filteredLinks);

            const optimizedData = {
                nodes: topNodes,
                links: filteredLinks
            };
            console.log("Returning optimized data:", optimizedData);
            return optimizedData;
        }
        console.log("No optimization needed or applied. Returning original data.");
        return data;
    }
}
