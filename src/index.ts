import cytoscape, { Core, CytoscapeOptions } from 'cytoscape';

const config: CytoscapeOptions = {
  container: document.getElementById('cy'),
  elements: {
    nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }],
    edges: [{ data: { id: 'ab', source: 'a', target: 'b' } }],
  },
  style: [
    {
      selector: 'node',
      style: {
        'background-color': '#666',
        label: 'data(id)',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 3,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
      },
    },
  ],
  layout: {
    name: 'grid',
  },
};

// Add error handling for container initialization
const container = document.getElementById('cy');
if (!container) {
  throw new Error('Cytoscape container element not found');
}

const cy: Core = cytoscape(config);

// Verify initialization
console.log(`Cytoscape.js initialized successfully - Version: ${cy.version()}`);

export default cy;
