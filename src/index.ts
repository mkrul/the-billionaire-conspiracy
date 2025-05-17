import cytoscape, { Core, CytoscapeOptions } from 'cytoscape';
import { NetworkData } from './types/network';
import { transformCSVToNetworkData } from './utils/dataTransformer';

async function initializeNetwork(): Promise<Core> {
  // Fetch and transform the CSV data
  const response = await fetch('/network_graph_relationships.csv');
  const csvData = await response.text();
  const networkData: NetworkData = transformCSVToNetworkData(csvData);

  // Transform network data into Cytoscape format
  const elements = {
    nodes: networkData.nodes.map((node) => ({
      data: {
        ...node,
        label: node.name,
      },
    })),
    edges: networkData.edges.map((edge) => ({
      data: {
        ...edge,
        label: edge.amount || '',
      },
    })),
  };

  const config: CytoscapeOptions = {
    container: document.getElementById('cy'),
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          label: 'data(name)',
          width: 40,
          height: 40,
          'font-size': 10,
          'text-wrap': 'wrap',
          'text-max-width': 80,
          'text-valign': 'bottom',
          'text-halign': 'center',
          'background-image': 'data(image)',
          'background-fit': 'cover',
        },
      },
      {
        selector: 'node[type="organization"]',
        style: {
          shape: 'rectangle',
          'background-color': '#44f',
          width: 30,
          height: 30,
        },
      },
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#999',
          'target-arrow-color': '#999',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          label: 'data(amount)',
          'font-size': 8,
          'text-rotation': 'autorotate',
        },
      },
      {
        selector: 'edge[type="personal"]',
        style: {
          'line-color': '#f44',
          'target-arrow-color': '#f44',
        },
      },
      {
        selector: 'edge[type="financial"]',
        style: {
          'line-color': '#4f4',
          'target-arrow-color': '#4f4',
        },
      },
      {
        selector: 'edge[type="political"]',
        style: {
          'line-color': '#44f',
          'target-arrow-color': '#44f',
        },
      },
    ],
    layout: {
      name: 'cose',
      animate: true,
      animationDuration: 1000,
      nodeDimensionsIncludeLabels: true,
      padding: 50,
    },
  };

  // Add error handling for container initialization
  const container = document.getElementById('cy');
  if (!container) {
    throw new Error('Cytoscape container element not found');
  }

  const cy: Core = cytoscape(config);

  // Add hover effect
  cy.on('mouseover', 'node', (event) => {
    const node = event.target;
    const quotes = node.data('quotes');
    if (quotes?.length) {
      // TODO: Show tooltip with first quote
      console.log(quotes[0]);
    }
  });

  // Log initialization
  console.log(`Cytoscape.js initialized successfully - Version: ${cy.version()}`);
  console.log(`Network loaded with ${cy.nodes().length} nodes and ${cy.edges().length} edges`);

  return cy;
}

// Initialize the network when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeNetwork().catch((error) => {
    console.error('Failed to initialize network:', error);
  });
});
