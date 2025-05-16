document.addEventListener('DOMContentLoaded', function() {
    fetch('graph_data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            const cy = cytoscape({
                container: document.getElementById('influenceGraph'),
                elements: {
                    nodes: data.nodes,
                    edges: data.edges
                },
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#666',
                            'label': 'data(label)',
                            'width': '60px',
                            'height': '60px',
                            'font-size': '10px',
                            'text-valign': 'center',
                            'text-halign': 'center',
                            'color': '#fff'
                        }
                    },
                    {
                        selector: 'node[type="person"]',
                        style: {
                            'background-color': '#007bff', // Blue for person
                             'shape': 'ellipse'
                        }
                    },
                    {
                        selector: 'node[type="organization"]',
                        style: {
                            'background-color': '#28a745', // Green for organization
                            'shape': 'rectangle'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 3,
                            'line-color': '#ccc',
                            'target-arrow-color': '#ccc',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier'
                        }
                    }
                ],
                layout: {
                    name: 'cose', // Concentric layout, good for small graphs
                    idealEdgeLength: 100,
                    nodeOverlap: 20,
                    refresh: 20,
                    fit: true,
                    padding: 30,
                    randomize: false,
                    componentSpacing: 100,
                    nodeRepulsion: 400000,
                    edgeElasticity: 100,
                    nestingFactor: 5,
                    gravity: 80,
                    numIter: 1000,
                    initialTemp: 200,
                    coolingFactor: 0.95,
                    minTemp: 1.0
                }
            });

            // Example: Log node data on click
            cy.on('tap', 'node', function(evt){
                var node = evt.target;
                console.log('Tapped node: ' + node.id() + ', Label: ' + node.data('label'));
            });

            // Basic zoom and pan are enabled by default.

        })
        .catch(error => {
            console.error('Error loading graph data:', error);
            const graphDiv = document.getElementById('influenceGraph');
            if (graphDiv) {
                graphDiv.innerHTML = '<p style="color: red; text-align: center;">Error loading graph data. Please check console.</p>';
            }
        });
});
