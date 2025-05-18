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
    influence?: string;
    connections?: string;
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
  private resizeObserver: ResizeObserver | null = null;
  private resizeHandler: (() => void) | null = null;
  private orientationHandler: (() => void) | null = null;
  private modal: HTMLElement | null = null;
  private modalCloseBtn: HTMLElement | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    // Get modal elements
    this.modal = document.getElementById('node-modal');
    this.modalCloseBtn = this.modal?.querySelector('.close') || null;

    // Setup modal close button
    if (this.modalCloseBtn) {
      this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    }

    // Close modal when clicking outside
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }
  }

  private showModal(node: CyNode): void {
    if (!this.modal) return;

    const name = node.data('label') || '';
    const image = node.data('image') || '';
    const influence = node.data('influence') || '';
    const ventures = node.data('ventures') || '';
    const connections = node.data('connections') || '';
    const quotes = node.data('quotes') || '';

    const ventureColors: Record<string, string> = {
      SpaceX: '#000080',
      Anduril: '#008000',
      Palantir: '#800080',
      Meta: '#e39400',
      Rumble: '#a1522d',
      Paypal: '#00c2c2',
      Praxis: '#999900',
      Urbit: '#808080',
      Linkedin: '#4783b5',
      OpenAI: '#008080',
      Coinbase: '#2fc22f',
      'Heritage Foundation': '#800000',
      X: '#000000',
      'Cambridge Analytica': '#d900d9',
    };

    // Update modal content
    const modalName = document.getElementById('modal-name');
    if (modalName) modalName.textContent = name;

    const modalImage = document.getElementById('modal-image') as HTMLImageElement;
    if (modalImage) modalImage.src = image;

    // Handle each section - hide if empty
    const sections = [
      { id: 'modal-influence', content: influence, isList: true },
      { id: 'modal-ventures', content: ventures, isList: true },
      { id: 'modal-connections', content: connections, isList: false },
    ];

    sections.forEach(({ id, content, isList }) => {
      const sectionElement = document
        .getElementById(id)
        ?.closest('.modal-section') as HTMLElement | null;
      if (!sectionElement) return;

      const contentElement = document.getElementById(id) as HTMLElement | null;
      if (contentElement) {
        if (content.trim()) {
          if (id === 'modal-ventures') {
            contentElement.innerHTML = '';
            contentElement.style.display = 'flex';
            contentElement.style.flexWrap = 'wrap';
            contentElement.style.gap = '8px';

            const items = content.split(';').filter((item: string) => item.trim());
            items.forEach((itemText: string) => {
              const ventureName = itemText.trim();
              const pill = document.createElement('div');
              pill.textContent = ventureName;
              pill.style.backgroundColor = ventureColors[ventureName] || '#6c757d';
              pill.style.color = 'white';
              pill.style.padding = '5px 10px';
              pill.style.borderRadius = '15px';
              contentElement.appendChild(pill);
            });
            sectionElement.style.display = 'block';
          } else if (isList) {
            contentElement.innerHTML = '';
            const ul = document.createElement('ul');
            const items = content.split(';').filter((item: string) => item.trim());
            items.forEach((item: string) => {
              const li = document.createElement('li');
              li.textContent = item.trim();
              ul.appendChild(li);
            });
            contentElement.appendChild(ul);
          } else {
            contentElement.textContent = content;
          }
          sectionElement.style.display = 'block';
        } else {
          contentElement.innerHTML = '';
          sectionElement.style.display = 'none';
        }
      }
    });

    // Handle quotes section
    const quotesSection = document.getElementById('modal-quotes')?.closest('.modal-section');
    const modalQuotes = document.getElementById('modal-quotes');
    if (modalQuotes && quotesSection) {
      modalQuotes.innerHTML = '';
      const quoteItems = quotes.split('|').filter((q: string) => q.trim());

      if (quoteItems.length > 0) {
        quoteItems.forEach((quote: string) => {
          const li = document.createElement('li');
          li.textContent = `"${quote.trim()}"`;
          modalQuotes.appendChild(li);
        });
        (quotesSection as HTMLElement).style.display = 'block';
      } else {
        (quotesSection as HTMLElement).style.display = 'none';
      }
    }

    // Show modal with flexbox centering
    this.modal.style.display = 'flex';
    this.modal.classList.add('active');
  }

  private closeModal(): void {
    if (this.modal) {
      this.modal.style.display = 'none';
      this.modal.classList.remove('active');
    }
  }

  public async initialize(csvData: string): Promise<void> {
    this.data = parseCSVData(csvData);

    const isMobile = window.innerWidth < 768;

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
        idealEdgeLength: isMobile ? 100 : 150,
        nodeOverlap: isMobile ? 20 : 30,
        refresh: 20,
        fit: true,
        padding: isMobile ? 30 : 50,
        randomize: false,
        componentSpacing: isMobile ? 100 : 150,
        nodeRepulsion: isMobile ? 400000 : 600000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: isMobile ? 80 : 60,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      },
      minZoom: isMobile ? 0.5 : 1,
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

      // Show modal with node details
      this.showModal(node);
    });

    // Add click handler for background to reset highlighting
    this.cy.on('tap', (event: { target: any }) => {
      if (event.target === this.cy) {
        this.cy.edges().removeClass('highlighted');
      }
    });

    // Setup resize handling
    this.setupResizeHandling();
  }

  private setupResizeHandling(): void {
    // Handle window resize events to make the graph responsive
    this.resizeHandler = () => {
      if (this.cy) {
        this.cy.resize();
        this.cy.fit();
      }
    };

    window.addEventListener('resize', this.resizeHandler);

    // Use ResizeObserver for container size changes if supported
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.resizeHandler) {
          this.resizeHandler();
        }
      });
      this.resizeObserver.observe(this.container);
    }

    // Initial orientation change handling for mobile
    this.orientationHandler = () => {
      setTimeout(() => {
        if (this.resizeHandler) {
          this.resizeHandler();
        }
      }, 100); // Small delay to ensure layout has updated
    };

    window.addEventListener('orientationchange', this.orientationHandler);
  }

  public destroy(): void {
    // Remove event listeners when component is destroyed
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.orientationHandler) {
      window.removeEventListener('orientationchange', this.orientationHandler);
      this.orientationHandler = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove modal event listeners
    if (this.modalCloseBtn) {
      this.modalCloseBtn.removeEventListener('click', () => this.closeModal());
    }

    if (this.modal) {
      this.modal.removeEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }

    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
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
          influence: node.influence,
          connections: node.connections,
        },
        group: 'nodes',
        selectable: true,
        grabbable: false,
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
