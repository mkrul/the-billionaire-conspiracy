// Initialize the parser

// Relationship type color mapping - MOVED TO GLOBAL SCOPE
const relationshipColors = {
    'Friends with': '#4285F4',    // Blue
    'Hired': '#34A853',           // Green
    'Appointed': '#FBBC05',       // Yellow
    'Worked for': '#EA4335',      // Red
    'Donated to': '#8E44AD',      // Purple
    'Founded': '#F39C12',         // Orange
    'Recommended': '#1ABC9C',     // Turquoise
    'Contributed to': '#E74C3C'   // Bright Red
};

// Default color for other relationship types - MOVED TO GLOBAL SCOPE
const defaultColor = '#95A5A6';

try {
    const parser = new NetworkDataParser();

    // Global variables for filtering and highlighting
    let activeFilters = {
        relationships: new Set(),
        ventures: new Set()
    };
    let searchTerm = '';
    let highlightedNode = null;
    let nodeMap = {}; // Move nodeMap to a scope accessible by updateVisualization
    let currentChart = null; // Add a variable to hold the chart instance

    // Helper function to filter the graph data to a specific connected component
    function filterGraphComponent(originalGraphData, startNodeId) {
        const nodesToKeep = new Set();
        const linksToKeep = [];
        let queue = [];

        const startNode = originalGraphData.nodes.find(n => n.id === startNodeId);

        if (!startNode) {
            console.warn(`Start node "${startNodeId}" for filtering was not found. Displaying an empty graph.`);
            return { nodes: [], links: [] };
        }

        const adj = new Map();
        originalGraphData.links.forEach(link => {
            if (!adj.has(link.source)) adj.set(link.source, []);
            if (!adj.has(link.target)) adj.set(link.target, []);
            adj.get(link.source).push(link.target);
            adj.get(link.target).push(link.source);
        });

        nodesToKeep.add(startNodeId);
        queue.push(startNodeId);

        while (queue.length > 0) {
            const currentNodeId = queue.shift();
            const neighbors = adj.get(currentNodeId) || [];

            for (const neighborId of neighbors) {
                if (originalGraphData.nodes.some(n => n.id === neighborId) && !nodesToKeep.has(neighborId)) {
                    nodesToKeep.add(neighborId);
                    queue.push(neighborId);
                }
            }
        }

        const filteredNodes = originalGraphData.nodes.filter(node => nodesToKeep.has(node.id));
        const filteredLinks = originalGraphData.links.filter(link =>
            nodesToKeep.has(link.source) && nodesToKeep.has(link.target)
        );

        if (filteredNodes.length > 0 && filteredNodes.length < originalGraphData.nodes.length) {
            console.log(`Filtered graph from ${originalGraphData.nodes.length} nodes to ${filteredNodes.length} nodes, and from ${originalGraphData.links.length} links to ${filteredLinks.length} links, focusing on component including "${startNodeId}".`);
        } else if (filteredNodes.length === 0 && startNode) {
             console.warn(`Filtering for "${startNodeId}" resulted in an empty graph, although the start node was found. It might be an isolated node.`);
        }

        return {
            nodes: filteredNodes,
            links: filteredLinks
        };
    }

    // Load and parse the CSV, then create the graph
    async function initNetworkGraph() {
        try {
            // Load and parse the CSV data
            const rawGraphData = await parser.loadAndParseCSVFromPath('network_graph_relationships.csv');

            const targetNodeId = "Peter Thiel";
            const filteredGraphData = filterGraphComponent(rawGraphData, targetNodeId);

            if (filteredGraphData.nodes.length === 0 && rawGraphData.nodes.length > 0) {
                 console.error(`Filtering removed all nodes. This could be due to "${targetNodeId}" not being found or being an isolated node with no links. Check data and node ID.`);
                 document.getElementById('container').innerHTML =
                     `<div class="error">Failed to display the graph component for "${targetNodeId}". The node might be missing or isolated.</div>`;
                 return;
            }

            // Create network graph using Highcharts
            createNetworkGraph(filteredGraphData);
            initializeControls(filteredGraphData); // Initialize controls with the filtered data
            updateVisualization();
        } catch (error) {
            console.error("Error during graph initialization:", error);
            document.getElementById('container').innerHTML =
                `<div class="error">Failed to load graph data: ${error.message}</div>`;
        }
    }

    // Create the network graph using Highcharts
    function createNetworkGraph(graphData) {
        // Destroy existing chart if it exists
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }

        // Format the data for Highcharts networkgraph
        const chartData = graphData.links.map(link => [
            link.source,
            link.target,
            link.type
        ]);

        // Create a node map for quick lookup
        graphData.nodes.forEach(node => {
            nodeMap[node.id] = node;
        });

        // Configure and create the chart
        currentChart = Highcharts.chart('container', { // Assign the chart instance
            chart: {
                type: 'networkgraph',
                marginTop: 80,
                zooming: {
                    mouseWheel: true,
                    type: 'xy'
                },
                panning: {
                    enabled: true,
                    type: 'xy'
                },
                panKey: 'shift'
            },
            title: {
                text: 'Network Graph: Relationships Visualization'
            },
            subtitle: {
                text: 'Data source: network_graph_relationships.csv'
            },
            plotOptions: {
                networkgraph: {
                    keys: ['from', 'to', 'type'],
                    layoutAlgorithm: {
                        enableSimulation: true,
                        friction: -0.9,
                        initialPositions: 'circle'
                    }
                }
            },
            tooltip: {
                useHTML: true,
                formatter: function() {
                    // Node tooltip
                    if (this.point.linksFrom === undefined && this.point.linksTo === undefined) {
                        const node = nodeMap[this.point.name];
                        if (!node) return `<b>${this.point.name}</b>`;

                        let html = `<div class="tooltip-container">`;
                        html += `<h3>${this.point.name}</h3>`;

                        if (node.ventures && node.ventures.length > 0) {
                            html += `<p><b>Ventures:</b> ${node.ventures.join(', ')}</p>`;
                        }

                        if (node.quotes && node.quotes.length > 0) {
                            html += `<p><b>Quote:</b> "${node.quotes[0]}"</p>`;
                        }

                        html += `<p><b>Connections:</b> ${node.connectionCount}</p>`;
                        html += `</div>`;

                        return html;
                    }
                    // Link tooltip
                    else {
                        const fromNode = nodeMap[this.point.from];
                        const toNode = nodeMap[this.point.to];

                        if (this.point.type) {
                            return `<b>${this.point.from}</b> ${this.point.type} <b>${this.point.to}</b>`;
                        } else {
                            return `<b>${this.point.from}</b> → <b>${this.point.to}</b>`;
                        }
                    }
                }
            },
            series: [{
                marker: {
                    radius: 15 // <-- Simplified static radius for testing
                },
                dataLabels: {
                    enabled: true,
                    linkFormat: '',
                    allowOverlap: true
                },
                data: chartData,
                nodes: graphData.nodes.map(node => {
                    return {
                        id: node.id,
                        // Node-specific styling can be added here
                    };
                }),
                // Color links based on relationship type
                link: {
                    color: function() {
                        return relationshipColors[this.type] || defaultColor;
                    },
                    width: 2
                }
            }]
        });
    }

    // Initialize filters and search
    function initializeControls(graphData) {
        // Initialize relationship filters
        const relationshipTypes = Object.keys(relationshipColors);
        const relationshipFilters = document.getElementById('relationship-filters');
        relationshipTypes.forEach(type => {
            const filterOption = createFilterOption(type, 'relationships');
            relationshipFilters.appendChild(filterOption);
        });

        // Initialize ventures filters
        const ventures = new Set();
        graphData.nodes.forEach(node => {
            if (node.ventures) {
                node.ventures.forEach(venture => ventures.add(venture));
            }
        });
        const venturesFilters = document.getElementById('ventures-filters');
        Array.from(ventures).sort().forEach(venture => {
            const filterOption = createFilterOption(venture, 'ventures');
            venturesFilters.appendChild(filterOption);
        });

        // Initialize search
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            updateVisualization();
        });

        // Call createLegend after controls are initialized
        createLegend();
    }

    // Function to create the legend (moved from index.html)
    function createLegend() {
        const legendContainer = document.getElementById('relationship-legend');
        const relationshipTypes = Object.keys(relationshipColors);

        legendContainer.innerHTML = '';
        relationshipTypes.forEach(type => {
            const item = document.createElement('div');
            item.className = 'legend-item';

            const colorBox = document.createElement('span');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = relationshipColors[type];

            const label = document.createElement('span');
            label.className = 'legend-label';
            label.textContent = type;

            item.appendChild(colorBox);
            item.appendChild(label);
            legendContainer.appendChild(item);
        });
    }

    function createFilterOption(value, type) {
        const div = document.createElement('div');
        div.className = 'filter-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = value;
        checkbox.id = `filter-${value}`;

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                activeFilters[type].add(value);
            } else {
                activeFilters[type].delete(value);
            }
            updateVisualization();
        });

        const label = document.createElement('label');
        label.htmlFor = `filter-${value}`;
        label.textContent = value;

        div.appendChild(checkbox);
        div.appendChild(label);
        return div;
    }

    function updateVisualization() {
        const chart = currentChart; // Use the stored chart instance
        if (!chart) {
            return;
        }

        const series = chart.series[0]; // Assuming the network graph is the first series

        series.points.forEach(point => {
            if (point.isNode) {
                // --- Node Visibility Logic ---
                let nodeVisible = true;

                // Apply search filter (hides if search term is present and doesn't match)
                if (searchTerm && !point.name.toLowerCase().includes(searchTerm)) {
                    nodeVisible = false;
                }

                // Apply ventures filters (hides if venture filters are active and node has no matching venture)
                if (nodeVisible && activeFilters.ventures.size > 0) {
                    const nodeData = nodeMap[point.name];
                    const hasMatchingVenture = nodeData && nodeData.ventures && nodeData.ventures.some(venture =>
                        activeFilters.ventures.has(venture)
                    );
                    if (!hasMatchingVenture) {
                         nodeVisible = false;
                    }
                }

                // Apply relationship filters to nodes (hides if relationship filters are active and node has no matching link)
                if (nodeVisible && activeFilters.relationships.size > 0) {
                     const hasMatchingLink = (point.linksFrom || []).some(link =>
                         activeFilters.relationships.has(link.type)
                     ) || (point.linksTo || []).some(link =>
                         activeFilters.relationships.has(link.type)
                     );
                     if (!hasMatchingLink) {
                         nodeVisible = false;
                     }
                }

                 // Set node visibility. setVisible works for nodes and their data labels.
                 // Pass false for redraw to update all points before a single redraw.
                 point.setVisible(nodeVisible, false);


            } else {
                // --- Link Visibility Logic ---
                // point is a link
                let linkVisible = true;

                // Apply relationship filters to links (hides if relationship filters are active and link type doesn't match)
                if (activeFilters.relationships.size > 0) {
                    if (!activeFilters.relationships.has(point.type)) {
                        linkVisible = false;
                    }
                }

                // Set link visibility by changing color. Use original color if visible, transparent if hidden.
                // We need the original color. We can store it on the point when the chart is created.
                // For now, let's use the color derived from relationshipColors or defaultColor.
                 const originalColor = relationshipColors[point.type] || defaultColor;
                 point.update({
                     color: linkVisible ? originalColor : 'transparent',
                 }, false); // Update link color without redrawing

            }
        });

        // Redraw the chart once after updating all points
        chart.redraw();
    }

    // Modify the existing click event handler in createNetworkGraph
    function handleNodeClick(event) {
        const node = event.point;
        const nodeData = nodeMap[node.name];

        // Update info panel
        const infoPanel = document.getElementById('info-panel');
        const infoContent = infoPanel.querySelector('.info-content');

        infoContent.innerHTML = `
            <h3>${node.name}</h3>
            ${nodeData.ventures ? `<p><b>Ventures:</b> ${nodeData.ventures.join(', ')}</p>` : ''}
            ${nodeData.quotes ? `<p><b>Quotes:</b> "${nodeData.quotes[0]}"</p>` : ''}
            <h4>Relationships:</h4>
            <ul>
                ${node.linksFrom ? node.linksFrom.map(link =>
                    `<li>${link.type} ${link.to}</li>`
                ).join('') : ''}
                ${node.linksTo ? node.linksTo.map(link =>
                    `<li>${link.from} ${link.type} this person</li>`
                ).join('') : ''}
            </ul>
        `;

        infoPanel.classList.add('active');

        // Highlight connected nodes
        highlightConnectedNodes(node);
    }

    function highlightConnectedNodes(node) {
        const chart = currentChart;
        if (!chart) return;

        // Reset previous highlighting
        chart.series[0].points.forEach(point => {
            point.update({
                color: null,
                opacity: 1
            }, false);
        });

        // Highlight the selected node and its connections
        const connectedNodes = new Set();
        connectedNodes.add(node.name);

        if (node.linksFrom) {
            node.linksFrom.forEach(link => connectedNodes.add(link.to));
        }
        if (node.linksTo) {
            node.linksTo.forEach(link => connectedNodes.add(link.from));
        }

        chart.series[0].points.forEach(point => {
            if (!connectedNodes.has(point.name)) {
                point.update({
                    opacity: 0.2
                }, false);
            }
        });

        chart.redraw();
    }

    // Add close button handler
    document.querySelector('.close-btn').addEventListener('click', () => {
        document.getElementById('info-panel').classList.remove('active');
        // Reset highlighting
        const chart = currentChart;
        if (!chart) return;
        chart.series[0].points.forEach(point => {
            point.update({
                opacity: 1
            }, false);
        });
        chart.redraw();
    });

    // Export functionality
    function exportNetworkData() {
        const chart = currentChart;
        if (!chart) return;

        // Get visible nodes and links
        const visibleNodes = [];
        const visibleLinks = [];

        chart.series[0].points.forEach(point => {
            if (point.visible) {
                if (point.linksFrom || point.linksTo) {
                    visibleNodes.push(point.name);

                    if (point.linksFrom) {
                        point.linksFrom.forEach(link => {
                            if (link.to && chart.get(link.to).visible) {
                                visibleLinks.push({
                                    source: point.name,
                                    target: link.to,
                                    type: link.type
                                });
                            }
                        });
                    }
                }
            }
        });

        // Create export data using the parser's format
        const exportData = parser.toJSON(); // Use the parser's JSON format

        // Filter to only visible nodes if needed
        if (visibleNodes.length > 0) {
            exportData.nodes = exportData.nodes.filter(node =>
                visibleNodes.includes(node.id)
            );
            exportData.links = visibleLinks;
        }

        // Convert to JSON and create download
        const dataStr = "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "network_graph_export.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    // Add function to load JSON data
    async function loadJSONData(jsonData) {
        try {
            const parsedData = parser.loadFromJSON(jsonData);
            createNetworkGraph(parsedData);
            initializeControls(parsedData);
            updateVisualization();
        } catch (error) {
            console.error("Error loading JSON data:", error);
            throw error;
        }
    }

    // Image export function
    function exportAsImage() {
        const chart = currentChart;
        if (!chart) return;

        // Hide control panels for clean screenshot
        const controlPanel = document.querySelector('.control-panel');
        const infoPanel = document.querySelector('.info-panel');
        const legendContainer = document.querySelector('.legend-container');

        const originalControlDisplay = controlPanel.style.display;
        const originalInfoDisplay = infoPanel.style.display;
        const originalLegendDisplay = legendContainer.style.display;

        controlPanel.style.display = 'none';
        infoPanel.style.display = 'none';
        legendContainer.style.display = 'none';

        // Export as PNG
        chart.exportChart({
            type: 'image/png',
            filename: 'network_graph'
        }, {
            chart: {
                backgroundColor: '#ffffff'
            }
        });

        // Restore panels after short delay
        setTimeout(() => {
            controlPanel.style.display = originalControlDisplay;
            infoPanel.style.display = originalInfoDisplay;
            legendContainer.style.display = originalLegendDisplay;
        }, 1000);
    }

    // Performance optimization for large datasets
    function optimizeForLargeDatasets() {
        const chart = currentChart; // Use the stored chart instance
        if (!chart || !chart.series || !chart.series[0]) return;

        const series = chart.series[0];

        // Reduce number of points rendered at once for better performance
        if (series.points.length > 50) { // This count includes nodes and links.
            // Adjust layoutAlgorithm for better performance with large datasets
            if (series.options.layoutAlgorithm) {
                series.options.layoutAlgorithm.enableSimulation = false;
                series.options.layoutAlgorithm.integration = 'euler';
                series.options.layoutAlgorithm.gravitationalConstant = 0.1;
            }

            // Reduce marker radius for less visual clutter
            series.points.forEach(point => {
                if (point.isNode) { // Process only nodes
                    const nodeInfo = nodeMap[point.id]; // Use point.id
                    let newRadius = 5; // Default small radius
                    if (nodeInfo) {
                        const connectionCount = Number(nodeInfo.connectionCount) || 0; // Ensure connectionCount is a number, default to 0
                        // The original logic in this function used 'connectionCount' directly, not 'connectionCount * 2'
                        newRadius = Math.max(5, Math.min(20, 5 + connectionCount));
                    }

                    point.update({
                        marker: {
                            radius: newRadius
                        }
                    }, false); // No redraw per point
                }
            });

            chart.redraw(); // Single redraw after all updates
        }
    }

    // Initialize when the page is loaded
    document.addEventListener('DOMContentLoaded', () => {
        initNetworkGraph();

        // Add export buttons to page
        const controlPanel = document.querySelector('.control-panel');

        const exportSection = document.createElement('div');
        exportSection.className = 'export-section';
        exportSection.innerHTML = `
            <h4>Export Options</h4>
            <button id="export-data" class="export-btn">Export Data (JSON)</button>
            <button id="export-image" class="export-btn">Export Image (PNG)</button>
            <button id="optimize-performance" class="export-btn">Optimize Performance</button>
        `;

        controlPanel.appendChild(exportSection);

        // Add event listeners
        document.getElementById('export-data').addEventListener('click', exportNetworkData);
        document.getElementById('export-image').addEventListener('click', exportAsImage);
        document.getElementById('optimize-performance').addEventListener('click', optimizeForLargeDatasets);
    });
} catch (error) {
    console.error("A critical error occurred in the application:", error);
    // Optionally, display a user-friendly message on the page as well
    const container = document.getElementById('container');
    if (container) {
        container.innerHTML =
            `<div class="error">A critical error occurred. Please check the console for details. ${error.message}</div>`;
    }
}
