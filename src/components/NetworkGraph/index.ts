import cytoscape from 'cytoscape';
import { NetworkData, NetworkNode, NetworkEdge } from '@/types/network';
import { parseCSVData } from '@/utils/csv';
import { defaultStyles } from '@/styles/network';

type CyInstance = ReturnType<typeof cytoscape>;
type CyNode = ReturnType<CyInstance['nodes']>[number];
type CyEdge = ReturnType<CyInstance['edges']>[number];
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
  private ventureLegendList: HTMLElement | null = null;
  private selectedVenture: string | null = null;
  private ventureColors: Record<string, string> = {};

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    // Get modal elements
    this.modal = document.getElementById('node-modal');
    this.modalCloseBtn = this.modal?.querySelector('.close') || null;

    // Get venture legend element
    this.ventureLegendList = document.getElementById('venture-list');

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

  private resetAllHighlights(): void {
    if (!this.cy) return;

    this.cy.nodes().forEach((node: CyNode) => {
      node.removeClass('highlight-venture-affiliated');
      node.removeClass('highlighted-node'); // Class for click highlight

      // Remove direct style overrides to allow stylesheet-defined styles to apply.
      node.removeStyle('background-color');
      node.removeStyle('border-color');
      node.removeStyle('border-width');
      node.removeStyle('border-opacity');
    });

    this.cy.edges().forEach((edge: CyEdge) => {
      edge.removeClass('highlighted'); // Class for click highlight

      // Remove direct style overrides for edges.
      edge.removeStyle('line-color');
      edge.removeStyle('width');
    });

    if (this.ventureLegendList) {
      const legendItems = this.ventureLegendList.querySelectorAll('li');
      legendItems.forEach((item) => item.classList.remove('selected'));
    }
    this.selectedVenture = null;
  }

  private highlightNodesByVenture(ventureName: string | null): void {
    if (!this.cy) return;
    this.resetAllHighlights(); // Always reset first

    if (ventureName && this.ventureColors[ventureName]) {
      this.selectedVenture = ventureName; // Set the selected venture
      const ventureColor = this.ventureColors[ventureName];

      const highlightedStyle = defaultStyles.find(
        (s) => s.selector === 'node.highlight-venture-affiliated'
      );
      const highlightedBorderOpacity = highlightedStyle?.style?.['border-opacity'] || 1;
      const ventureAffiliatedNodesCollection = this.cy.collection();

      this.cy.nodes().forEach((node: CyNode) => {
        const nodeVentures = node.data('ventures') as string | undefined;
        if (nodeVentures) {
          const ventureList = nodeVentures.split(';').map((v) => v.trim().toLowerCase());
          const ventureNameToCompare = ventureName.toLowerCase();
          if (ventureList.includes(ventureNameToCompare)) {
            node.addClass('highlight-venture-affiliated');
            node.style('border-color', ventureColor);
            node.style('border-opacity', highlightedBorderOpacity);
            ventureAffiliatedNodesCollection.merge(node);
          }
        }
      });

      this.cy.edges().forEach((edge: CyEdge) => {
        const sourceNode = edge.source();
        const targetNode = edge.target();
        if (
          ventureAffiliatedNodesCollection.anySame(sourceNode) &&
          ventureAffiliatedNodesCollection.anySame(targetNode)
        ) {
          edge.style('line-color', ventureColor);
          edge.style('width', 3);
        }
      });

      if (this.ventureLegendList) {
        const legendItems = this.ventureLegendList.querySelectorAll('li');
        legendItems.forEach((item) => {
          const textContent = item.querySelector('span')?.textContent;
          if (textContent === ventureName) {
            item.classList.add('selected');
          }
        });
      }
    }
  }

  private populateVentureLegend(ventureColors: Record<string, string>): void {
    if (!this.ventureLegendList) return;
    this.ventureLegendList.innerHTML = '';

    for (const ventureName in ventureColors) {
      if (Object.prototype.hasOwnProperty.call(ventureColors, ventureName)) {
        const color = ventureColors[ventureName];
        const listItem = document.createElement('li');
        const colorBox = document.createElement('div');
        colorBox.className = 'color-box';
        colorBox.style.backgroundColor = color;
        const nameSpan = document.createElement('span');
        nameSpan.textContent = ventureName;
        listItem.appendChild(colorBox);
        listItem.appendChild(nameSpan);

        listItem.addEventListener('click', () => {
          if (this.selectedVenture === ventureName) {
            this.highlightNodesByVenture(null); // Deselect
          } else {
            this.highlightNodesByVenture(ventureName); // Select
          }
        });
        this.ventureLegendList.appendChild(listItem);
      }
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

    // Update modal content
    const modalName = document.getElementById('modal-name');
    if (modalName) modalName.innerHTML = name;

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
              const ventureNameTrimmed = itemText.trim();
              const pill = document.createElement('div');
              pill.innerHTML = ventureNameTrimmed;

              // Find the venture color in a case-insensitive way
              const ventureKey = Object.keys(this.ventureColors).find(
                (key) => key.toLowerCase() === ventureNameTrimmed.toLowerCase()
              );
              const ventureColor = ventureKey ? this.ventureColors[ventureKey] : '#6c757d';

              pill.style.backgroundColor = ventureColor;
              pill.style.color = 'white';
              pill.style.paddingTop = '6px';
              pill.style.paddingBottom = '4px';
              pill.style.paddingLeft = '10px';
              pill.style.paddingRight = '10px';
              pill.style.borderRadius = '15px';
              pill.style.display = 'flex';
              pill.style.alignItems = 'center';
              pill.style.justifyContent = 'center';
              pill.style.lineHeight = '1';
              contentElement.appendChild(pill);
            });
            sectionElement.style.display = 'block';
          } else if (isList) {
            contentElement.innerHTML = '';
            const ul = document.createElement('ul');
            const items = content.split(';').filter((item: string) => item.trim());
            items.forEach((item: string) => {
              const li = document.createElement('li');
              li.innerHTML = item.trim();
              ul.appendChild(li);
            });
            contentElement.appendChild(ul);
          } else {
            contentElement.innerHTML = content;
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
          li.innerHTML = `"${quote.trim()}"`;
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

    this.ventureColors = {
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
      X: '#DDDDDD',
      'Cambridge Analytica': '#d900d9',
    };

    this.populateVentureLegend(this.ventureColors);

    const initialWidth = window.innerWidth;
    const initialHeight = window.innerHeight;
    const isSmallInitially = initialWidth <= 500 || initialHeight <= 650;
    const currentStyles = getResponsiveStyles(isSmallInitially); // This now includes edge.highlighted

    const config: CyConfig = {
      container: this.container,
      elements: this.transformDataToElements(),
      style: currentStyles, // Use responsive styles directly
      layout: {
        name: 'cose',
        idealEdgeLength: this.getResponsiveSize(initialWidth, initialHeight, 75, 100),
        nodeOverlap: this.getResponsiveSize(initialWidth, initialHeight, 20, 30),
        padding: this.getResponsiveSize(initialWidth, initialHeight, 30, 50),
        gravity: initialWidth < 768 ? 80 : 60,
        refresh: 20,
        fit: true,
        randomize: false,
        componentSpacing: this.getResponsiveSize(initialWidth, initialHeight, 80, 120),
        nodeRepulsion: this.getResponsiveSize(initialWidth, initialHeight, 300000, 450000),
        edgeElasticity: 100,
        nestingFactor: 5,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      },
      minZoom: this.getResponsiveSize(initialWidth, initialHeight, 0.5, 1), // Responsive minZoom
      maxZoom: 3,
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: false,
      selectionType: 'single',
    };

    this.cy = cytoscape(config);

    const layout = this.cy.layout(config.layout);
    layout.on('layoutready', () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const fitPadding = this.getResponsiveSize(currentWidth, currentHeight, 45, 75);
      this.cy.fit({ padding: fitPadding });
      console.log('Layout Ready Fit Complete:');
      console.log(
        '  Container Dimensions:',
        this.container.offsetWidth,
        'x',
        this.container.offsetHeight
      );
      console.log('  Graph Extent (after fit):', this.cy.extent());
      console.log('  Graph Zoom (after fit):', this.cy.zoom());
      console.log('  Graph Pan (after fit):', this.cy.pan());

      if (currentWidth <= 500 || currentHeight <= 650) {
        const currentPan = this.cy.pan();
        this.cy.pan({ x: currentPan.x, y: currentPan.y - 70 });
        console.log('  Graph Pan (after 500px adjustment):', this.cy.pan());
      }
    });
    layout.run();

    // This log might show pre-fit state or state before layout is fully ready
    console.log('Initial Cytoscape setup complete (pre-layout fit):');
    console.log(
      '  Container Dimensions (at setup):',
      this.container.offsetWidth,
      'x',
      this.container.offsetHeight
    );
    // Logging extent, zoom, pan here might be misleading as layout isn't finished.
    // The 'layoutready' event provides more accurate post-layout values.

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
      this.resetAllHighlights(); // Now correctly removes overrides

      const node = event.target;
      node.addClass('highlighted-node'); // Apply highlight class to the clicked node
      node.connectedEdges().addClass('highlighted'); // Apply highlight class to connected edges
      this.showModal(node);
    });

    // Add click handler for background to reset highlighting
    this.cy.on('tap', (event: { target: any }) => {
      if (event.target === this.cy) {
        this.resetAllHighlights();
      }
    });

    // Setup resize handling
    this.setupResizeHandling();
  }

  private setupResizeHandling(): void {
    this.resizeHandler = () => {
      if (this.cy) {
        this.cy.resize();

        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        const isSmallNow = currentWidth <= 500 || currentHeight <= 650;
        const newStyles = getResponsiveStyles(isSmallNow);
        this.cy.style().fromJson(newStyles).update(); // Update styles

        setTimeout(() => {
          const fitPadding = this.getResponsiveSize(currentWidth, currentHeight, 45, 75);
          this.cy.fit({ padding: fitPadding });

          console.log('Resize Fit Complete:');
          console.log(
            '  Container Dimensions:',
            this.container.offsetWidth,
            'x',
            this.container.offsetHeight
          );
          console.log('  Graph Extent (after fit):', this.cy.extent());
          console.log('  Graph Zoom (after fit):', this.cy.zoom());
          console.log('  Graph Pan (after fit):', this.cy.pan());

          if (currentWidth <= 500 || currentHeight <= 650) {
            // Re-apply pan adjustment after fit
            const currentPan = this.cy.pan();
            this.cy.pan({ x: currentPan.x, y: currentPan.y - 70 });
            console.log('  Graph Pan (after small viewport adjustment on resize):', this.cy.pan());
          }
        }, 100);
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

  private getResponsiveSize(
    width: number,
    height: number,
    smallValue: number,
    largeValue: number
  ): number {
    // Check both width and height to determine if we're in a small viewport
    if (width <= 500 || height <= 650) {
      return smallValue;
    } else if (width <= 768 || height <= 800) {
      // Middle size for medium viewports
      return smallValue + (largeValue - smallValue) * 0.5;
    }
    return largeValue;
  }
}

export default NetworkGraph;

function getResponsiveStyles(isSmallViewport: boolean) {
  // Extract original styles for modification or inclusion
  const originalNodeStyleDef = defaultStyles.find((s) => s.selector === 'node');
  const originalEdgeStyleDef = defaultStyles.find((s) => s.selector === 'edge');
  // Capture any other styles that are not 'node' or 'edge' (e.g., class selectors, etc.)
  const otherDefaultStyles = defaultStyles.filter(
    (s) => s.selector !== 'node' && s.selector !== 'edge'
  );

  if (
    !originalNodeStyleDef ||
    !originalNodeStyleDef.style ||
    !originalEdgeStyleDef ||
    !originalEdgeStyleDef.style
  ) {
    console.error(
      'Critical: Could not find original node or edge style definitions in defaultStyles. Highlighting and other styles may fail.'
    );
    // Fallback: return defaultStyles and try to append highlighted, but this indicates a problem.
    return [
      ...defaultStyles, // Use the original defaultStyles as a base
      {
        selector: 'edge.highlighted',
        style: { 'line-color': '#ff0000', width: 3 },
      },
      {
        selector: 'node.highlighted-node',
        style: {
          'background-color': '#ff0000',
          'border-color': '#ff0000',
          'border-width': 3,
          'border-opacity': 1, // Ensure full opacity for the border
        },
      },
    ];
  }

  const responsiveNodeStyleProps = { ...originalNodeStyleDef.style }; // Clone original node style properties

  if (isSmallViewport) {
    responsiveNodeStyleProps.width = 70;
    responsiveNodeStyleProps.height = 70;
    responsiveNodeStyleProps['font-size'] = 14;
  } else {
    // Ensure it reverts to original values if not small (or set explicitly to defaults)
    responsiveNodeStyleProps.width = originalNodeStyleDef.style.width || 60; // Fallback to known default
    responsiveNodeStyleProps.height = originalNodeStyleDef.style.height || 60;
    responsiveNodeStyleProps['font-size'] = originalNodeStyleDef.style['font-size'] || 12;
  }

  const finalStyles = [
    ...otherDefaultStyles, // Add any other styles from defaultStyles first
    {
      selector: 'node', // The main node style
      style: responsiveNodeStyleProps,
    },
    {
      selector: 'edge', // The main edge style
      style: originalEdgeStyleDef.style,
    },
    {
      selector: 'edge.highlighted', // The specific style for highlighted edges
      style: {
        'line-color': '#ff0000', // Red color
        width: 3, // Slightly thicker
      },
    },
    {
      selector: 'node.highlighted-node', // Style for the highlighted node
      style: {
        'background-color': '#ff0000', // Red background
        'border-color': '#ff0000', // Darker red border for visibility
        'border-width': 3, // Increased border width
        'border-opacity': 1, // Ensure full opacity for the border
      },
    },
  ];

  return finalStyles;
}
