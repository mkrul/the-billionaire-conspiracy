import type { Core, ElementDefinition } from 'cytoscape';
import cytoscape from 'cytoscape';
import { NetworkData, NetworkNode, NetworkEdge } from '@/types/network';
import { parseCSVData } from '@/utils/csv';
import { defaultStyles } from '@/styles/network';

export class NetworkGraph {
  private cy: Core | null = null;
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

    this.cy = cytoscape({
      container: this.container,
      elements: this.transformDataToElements(),
      style: defaultStyles,
      layout: {
        name: 'cose',
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
        minTemp: 1.0,
      },
      // Allow context menu events
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: false,
      selectionType: 'single',
    });

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
  }

  private transformDataToElements(): ElementDefinition[] {
    if (!this.data) {
      return [];
    }

    const elements: ElementDefinition[] = [];

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

    // Add edges
    this.data.edges.forEach((edge: NetworkEdge) => {
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
    });

    return elements;
  }
}

export default NetworkGraph;
