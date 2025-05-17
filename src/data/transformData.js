// Function to parse CSV string into array of objects
function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  return lines.slice(1).map((line) => {
    // Handle quoted fields properly
    const values = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue);

    return headers.reduce((obj, header, index) => {
      obj[header] = values[index]?.trim() || '';
      return obj;
    }, {});
  });
}

// Function to parse semicolon-separated strings into arrays
function parseList(str) {
  return str
    ? str
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

// Function to parse quotes into an array
function parseQuotes(quotesStr) {
  return quotesStr
    ? quotesStr
        .split('|')
        .map((quote) => quote.trim())
        .filter(Boolean)
    : [];
}

// Main function to transform data into Cytoscape elements
export function transformToCytoscapeElements(csvData) {
  try {
    const rawData = typeof csvData === 'string' ? parseCSV(csvData) : csvData;
    const elements = { nodes: [], edges: [] };
    const ventureConnections = new Map(); // Track ventures for creating business relationships

    // First pass: Create nodes and collect ventures
    rawData.forEach((row) => {
      // Create node
      elements.nodes.push({
        data: {
          id: row.Name,
          label: row.Name,
          image: row.Image,
          quotes: parseQuotes(row.Quotes),
          ventures: parseList(row.Ventures),
          type: 'person',
        },
      });

      // Track ventures for each person
      const ventures = parseList(row.Ventures);
      ventures.forEach((venture) => {
        if (!ventureConnections.has(venture)) {
          ventureConnections.set(venture, new Set());
        }
        ventureConnections.get(venture).add(row.Name);
      });
    });

    // Create venture nodes and business relationship edges
    ventureConnections.forEach((people, venture) => {
      // Add venture node
      elements.nodes.push({
        data: {
          id: venture,
          label: venture,
          type: 'venture',
        },
      });

      // Connect all people to this venture
      people.forEach((person) => {
        elements.edges.push({
          data: {
            id: `${person}-${venture}-venture`,
            source: person,
            target: venture,
            relationship: 'Associated with',
            type: 'business',
          },
        });
      });
    });

    // Second pass: Create influence and connection edges
    rawData.forEach((row) => {
      // Parse influence relationships
      const influences = parseList(row.Influence);
      influences.forEach((influence) => {
        const match = influence.match(/(.*?) with (.*?)(?:;|$)/);
        if (match) {
          const [, relationship, target] = match;
          elements.edges.push({
            data: {
              id: `${row.Name}-${target}`,
              source: row.Name,
              target: target,
              relationship: relationship.trim(),
              type: 'influence',
            },
          });
        }
      });

      // Add direct connections
      const connections = parseList(row.Connections);
      connections.forEach((target) => {
        if (
          !elements.edges.some(
            (edge) =>
              (edge.data.source === row.Name && edge.data.target === target) ||
              (edge.data.source === target && edge.data.target === row.Name)
          )
        ) {
          elements.edges.push({
            data: {
              id: `${row.Name}-${target}-connection`,
              source: row.Name,
              target: target,
              relationship: 'Connected to',
              type: 'connection',
            },
          });
        }
      });
    });

    return elements;
  } catch (error) {
    console.error('Error transforming data:', error);
    throw new Error(`Failed to transform data: ${error.message}`);
  }
}

// Function to fetch and transform CSV data
export async function loadNetworkData() {
  try {
    const response = await fetch('/network_graph_relationships.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    return transformToCytoscapeElements(csvText);
  } catch (error) {
    console.error('Error loading network data:', error);
    throw error;
  }
}
