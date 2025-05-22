import cytoscape from 'cytoscape';
import { NetworkData, NetworkEdge, NetworkNode } from './types/network';
import { transformCSVToNetworkData } from './utils/dataTransformer';

async function initializeNetwork() {
  // Fetch and transform the CSV data
  const response = await fetch('/network_graph_relationships.csv');
  const csvData = await response.text();
  const networkData: NetworkData = transformCSVToNetworkData(csvData);

  // Transform network data into Cytoscape format
  const elements = {
    nodes: networkData.nodes.map((node: NetworkNode) => ({
      data: {
        ...node,
        label: node.name,
      },
    })),
    edges: networkData.edges.map((edge: NetworkEdge) => ({
      data: {
        ...edge,
        label: edge.relationship || '',
      },
    })),
  };

  const config = {
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
          label: 'data(relationship)',
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
      animate: false,
      animationDuration: 1000,
      nodeDimensionsIncludeLabels: true,
      padding: 50,
      idealEdgeLength: 30,
      nodeOverlap: 20,
      refresh: 20,
      fit: true,
      randomize: false,
      componentSpacing: 30,
      nodeRepulsion: 10000,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 100,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0,
    },
    zoomingEnabled: false,
    userZoomingEnabled: false,
    minZoom: 0.1,
    maxZoom: 4,
    panningEnabled: true,
    userPanningEnabled: true,
  };

  const container = document.getElementById('cy');
  if (!container) {
    throw new Error('Cytoscape container element not found');
  }

  const cy = cytoscape(config);

  cy.one('layoutstop', () => {
    cy.fit(undefined, 50);
    cy.center();

    cy.zoomingEnabled(true);
    cy.userZoomingEnabled(true);

    if (config.layout && typeof config.layout === 'object') {
      const layoutConfig = cy.layout({
        ...config.layout,
        name: 'cose',
        animate: true,
        fit: false,
      });
      if (layoutConfig && typeof layoutConfig.run === 'function') {
        layoutConfig.run();
      }
    }

    console.log('Layout complete, zooming enabled.');
  });

  cy.on('mouseover', 'node', (event: any) => {
    const node = event.target;
    const quotes = node.data('quotes');
    if (quotes?.length) {
      console.log(quotes[0]);
    }
  });

  console.log(`Cytoscape.js initialized successfully - Version: ${cy.version()}`);
  console.log(`Network loaded with ${cy.nodes().length} nodes and ${cy.edges().length} edges`);

  return cy;
}

document.addEventListener('DOMContentLoaded', () => {
  initializeNetwork().catch((error) => {
    console.error('Failed to initialize network:', error);
  });
});
