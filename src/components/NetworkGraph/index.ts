import cytoscape from 'cytoscape';
import { NetworkData, NetworkNode, NetworkEdge } from '@/types/network';
import { parseCSVData } from '@/utils/csv';
import { defaultStyles } from '@/styles/network';

type CyInstance = ReturnType<typeof cytoscape>;
type CyNode = ReturnType<CyInstance['nodes']>[number];
type CyElement = {
  data: {
    id?: string;
    source?: string;
    target?: string;
    label?: string;
    image?: string;
    quotes?: string;
    ventures?: string;
  };
  group?: 'nodes' | 'edges';
  selectable?: boolean;
  grabbable?: boolean;
};

type CyConfig = {
  container: HTMLElement;
  elements: CyElement[];
  style: Array<{
    selector: string;
    style: Record<string, any>;
  }>;
  layout: {
    name: string;
    idealEdgeLength?: number;
    nodeOverlap?: number;
    refresh?: number;
    fit?: boolean;
    padding?: number;
    randomize?: boolean;
    componentSpacing?: number;
    nodeRepulsion?: number;
    edgeElasticity?: number;
    nestingFactor?: number;
    gravity?: number;
    numIter?: number;
    initialTemp?: number;
    coolingFactor?: number;
    minTemp?: number;
  };
  minZoom?: number;
  maxZoom?: number;
  userPanningEnabled?: boolean;
  userZoomingEnabled?: boolean;
  boxSelectionEnabled?: boolean;
  autoungrabify?: boolean;
  autounselectify?: boolean;
  selectionType?: string;
};

export class NetworkGraph {
  private cy: CyInstance | null = null;
  private container: HTMLElement;
  private data: NetworkData | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
  }

  public async initialize(csvData: string): Promise<void> {
    this.data = parseCSVData(csvData);

    // Log the first few nodes to check image paths
    console.log('Sample nodes:', this.data.nodes.slice(0, 3));

    const config: CyConfig = {
      container: this.container,
      elements: this.transformDataToElements(),
      style: [
        ...defaultStyles,
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': '#ff0000',
            width: 3,
          },
        },
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 150,
        nodeOverlap: 30,
        refresh: 20,
        fit: true,
        padding: 50,
        randomize: false,
        componentSpacing: 150,
        nodeRepulsion: 600000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 60,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      },
      minZoom: 1,
      maxZoom: 3,
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: false,
      selectionType: 'single',
    };

    this.cy = cytoscape(config);

    // Enable pan and zoom
    this.cy.panningEnabled(true);
    this.cy.zoomingEnabled(true);
    this.cy.userZoomingEnabled(true);
    this.cy.userPanningEnabled(true);

    // Add event listener to prevent context menu from being blocked
    this.container.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
      return true;
    });

    // Log any nodes with missing images
    this.cy.nodes().forEach((node: CyNode) => {
      const img = new Image();
      img.onerror = () => {
        console.error(
          'Failed to load image for node:',
          node.data('label'),
          'Image path:',
          node.data('image')
        );
      };
      img.src = node.data('image');
    });

    // Add click handler for nodes
    this.cy.on('tap', 'node', (event: { target: CyNode }) => {
      // Reset all edges to default style
      this.cy.edges().removeClass('highlighted');

      // Get the clicked node
      const node = event.target;

      // Highlight all edges connected to this node
      node.connectedEdges().addClass('highlighted');
    });

    // Add click handler for background to reset highlighting
    this.cy.on('tap', (event: { target: any }) => {
      if (event.target === this.cy) {
        this.cy.edges().removeClass('highlighted');
      }
    });
  }

  private transformDataToElements(): CyElement[] {
    if (!this.data) {
      return [];
    }

    const elements: CyElement[] = [];
    const connectedPairs = new Set<string>();

    // Add nodes
    this.data.nodes.forEach((node: NetworkNode) => {
      elements.push({
        data: {
          id: node.name,
          label: node.name,
          image: node.image,
          quotes: node.quotes,
          ventures: node.ventures,
        },
        group: 'nodes',
        selectable: true,
        grabbable: true,
      });
    });

    // Add edges (only one per node pair)
    this.data.edges.forEach((edge: NetworkEdge) => {
      const nodePair = [edge.source, edge.target].sort().join('-');
      if (!connectedPairs.has(nodePair)) {
        elements.push({
          data: {
            id: `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            label: edge.relationship,
          },
          group: 'edges',
          selectable: true,
        });
        connectedPairs.add(nodePair);
      }
    });

    return elements;
  }
}

export default NetworkGraph;
