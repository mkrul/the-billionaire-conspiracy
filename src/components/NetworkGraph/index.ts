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
    idealEdgeLength?: number | ((node: CyNode) => number);
    nodeOverlap?: number | ((node: CyNode) => number);
    refresh?: number;
    fit?: boolean;
    padding?: number | ((node: CyNode) => number);
    randomize?: boolean;
    componentSpacing?: number | ((node: CyNode) => number);
    nodeRepulsion?: number | ((node: CyNode) => number);
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
  private ventureLegendContainer: HTMLElement | null = null;
  private ventureLegendList: HTMLElement | null = null;
  private ventureToggleBtn: HTMLElement | null = null;
  private selectedVenture: string | null = null;
  private ventureColors: Record<string, string> = {};
  private isVenturePanelCollapsed: boolean = false;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    // Get modal elements
    this.modal = document.getElementById('node-modal');
    this.modalCloseBtn = this.modal?.querySelector('.close') || null;

    // Get venture legend elements
    this.ventureLegendList = document.getElementById('venture-list');

    // Only setup toggle if we have the list element
    if (this.ventureLegendList) {
      this.ventureLegendList.style.paddingTop = '10px';
      this.setupVentureToggle();
    }

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

  private updateVentureListItemMargins(): void {
    if (!this.ventureLegendList) return;

    const isSmallViewport = window.innerWidth <= 600;
    const listItems = this.ventureLegendList.querySelectorAll('li');

    listItems.forEach((item) => {
      if (isSmallViewport) {
        item.style.marginBottom = '0px';
      } else {
        item.style.marginBottom = '5px'; // Default margin for larger screens
      }
    });
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
    this.updateVentureListItemMargins(); // Call to set initial margins
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
    const minDimension = Math.min(initialWidth, initialHeight);

    // Ensure container has proper dimensions before initialization
    this.container.style.width = `${initialWidth}px`;
    this.container.style.height = `${initialHeight}px`;

    const config: CyConfig = {
      container: this.container,
      elements: this.transformDataToElements(),
      style: defaultStyles, // Use the default styles directly
      layout: {
        name: 'cose',
        idealEdgeLength: minDimension * 0.15,
        nodeOverlap: minDimension * 0.03,
        padding: 20, // Use consistent padding with resizeHandler
        gravity: 60,
        refresh: 20,
        fit: true,
        randomize: false,
        componentSpacing: minDimension * 0.12,
        nodeRepulsion: minDimension * 450,
        edgeElasticity: 100,
        nestingFactor: 5,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      },
      minZoom: 0.2,
      maxZoom: 3,
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: false,
      selectionType: 'single',
    };

    this.cy = cytoscape(config);

    // Setup resize handling
    this.setupResizeHandling();

    // Ensure graph is properly sized before running layout
    if (this.cy) {
      this.cy.resize();
      this.cy.fit({
        padding: 20,
        animate: false,
      });
    }

    // Run the layout
    const layout = this.cy.layout(config.layout);

    // After layout is done, ensure graph is properly fitted
    layout.one('layoutstop', () => {
      if (this.cy) {
        this.cy.fit({
          padding: 20,
          animate: false,
        });
      }
    });

    // Add additional safety check to ensure proper sizing during layout computation
    if (typeof MutationObserver !== 'undefined') {
      const layoutObserver = new MutationObserver(() => {
        if (this.cy) {
          this.cy.resize();
          this.cy.fit({
            padding: 20,
            animate: false,
          });
        }
      });

      // Observe changes to container's children (which will include cytoscape elements)
      layoutObserver.observe(this.container, { childList: true, subtree: true });

      // Disconnect after layout is complete
      layout.one('layoutstop', () => {
        layoutObserver.disconnect();
      });
    }

    layout.run();

    this.cy.on('tap', 'node', (event: any) => {
      const node = event.target;

      // Clear existing highlights first
      this.resetAllHighlights();

      // Add highlight class to the clicked node
      node.addClass('highlighted-node');

      // Highlight connected edges
      node.connectedEdges().addClass('highlighted');

      // Show the modal
      this.showModal(node);
    });

    // Add listener for tap on background to reset highlights
    this.cy.on('tap', (event: any) => {
      // Check if the tap target is the core (background)
      if (event.target === this.cy) {
        this.resetAllHighlights();
      }
    });
  }

  private setupResizeHandling(): void {
    this.resizeHandler = () => {
      if (this.cy) {
        // Update container dimensions first
        this.container.style.width = `${window.innerWidth}px`;
        this.container.style.height = `${window.innerHeight}px`;

        // Then resize the graph
        this.cy.resize();

        // Fit with consistent padding
        this.cy.fit({
          padding: 20,
          animate: {
            duration: 200,
            easing: 'ease-in-out',
          },
        });
      }
      // Update venture list item margins on resize
      this.updateVentureListItemMargins();
    };

    window.addEventListener('resize', this.resizeHandler);

    // Use ResizeObserver for container size changes
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.resizeHandler) {
          this.resizeHandler();
        }
      });
      this.resizeObserver.observe(this.container);
    }

    // Handle orientation changes
    this.orientationHandler = () => {
      setTimeout(() => {
        if (this.resizeHandler) {
          this.resizeHandler();
        }
      }, 100);
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
      this.modalCloseBtn.removeEventListener('click', this.closeModal.bind(this));
    }

    if (this.modal) {
      const modalClickHandler = (e: Event) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      };
      this.modal.removeEventListener('click', modalClickHandler);
    }

    // Remove venture toggle event listener
    if (this.ventureToggleBtn) {
      this.ventureToggleBtn.removeEventListener('click', this.toggleVenturePanel.bind(this));
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

  // New method to setup the venture toggle button
  private setupVentureToggle(): void {
    if (!this.ventureLegendList) return;

    const listParent = this.ventureLegendList.parentElement || document.body;

    // Remove existing heading
    const existingHeading = listParent.querySelector('h3');
    if (existingHeading) {
      existingHeading.parentElement?.removeChild(existingHeading);
    }

    // Create header container
    const headerContainer = document.createElement('div');
    headerContainer.className = 'venture-header';
    headerContainer.style.display = 'flex';
    headerContainer.style.justifyContent = 'space-between';
    headerContainer.style.alignItems = 'center';
    headerContainer.style.padding = '8px 12px';
    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Ventures';
    title.style.margin = '0';
    title.style.fontSize = '16px';
    title.style.lineHeight = '10px';
    title.style.display = 'flex';
    title.style.alignItems = 'center';
    title.style.padding = '0';
    headerContainer.appendChild(title);

    // Create toggle button with icon
    this.ventureToggleBtn = document.createElement('button');
    this.ventureToggleBtn.className = 'venture-toggle';
    this.ventureToggleBtn.setAttribute('aria-label', 'Toggle ventures panel');
    this.ventureToggleBtn.style.background = 'none';
    this.ventureToggleBtn.style.border = 'none';
    this.ventureToggleBtn.style.cursor = 'pointer';
    this.ventureToggleBtn.innerHTML = '☰'; // Hamburger character
    this.ventureToggleBtn.style.fontSize = '21px';
    this.ventureToggleBtn.style.color = 'white';
    this.ventureToggleBtn.style.lineHeight = '0';
    this.ventureToggleBtn.style.display = 'flex';
    this.ventureToggleBtn.style.alignItems = 'center';
    this.ventureToggleBtn.style.padding = '0';
    this.ventureToggleBtn.style.paddingBottom = '5px';
    this.ventureToggleBtn.style.margin = 'auto 0';

    // Add click handler
    const toggleHandler = this.toggleVenturePanel.bind(this);
    this.ventureToggleBtn.addEventListener('click', toggleHandler);

    // Add the button to header
    headerContainer.appendChild(this.ventureToggleBtn);

    // Add header to parent
    if (listParent.firstChild) {
      listParent.insertBefore(headerContainer, listParent.firstChild);
    } else {
      listParent.appendChild(headerContainer);
    }
  }

  private toggleVenturePanel(): void {
    if (!this.ventureLegendList || !this.ventureToggleBtn) return;

    this.isVenturePanelCollapsed = !this.isVenturePanelCollapsed;

    if (this.isVenturePanelCollapsed) {
      this.ventureLegendList.style.display = 'none';
      // Keep hamburger icon the same, no change
    } else {
      this.ventureLegendList.style.removeProperty('display');
      // Keep hamburger icon the same, no change
    }
  }
}

export default NetworkGraph;

function getResponsiveStyles(currentWidth: number, currentHeight: number) {
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

  // Determine if it's a small viewport based on width
  const isSmallViewport = currentWidth <= 600; // Changed from 700 to 600 and removed height condition

  if (isSmallViewport) {
    responsiveNodeStyleProps.width = 80; // Increased from 60 to 80
    responsiveNodeStyleProps.height = 80; // Increased from 60 to 80
    responsiveNodeStyleProps['font-size'] = 16; // Increased from 14 to 16
  } else {
    // Ensure it reverts to original values if not small (or set explicitly to defaults)
    responsiveNodeStyleProps.width = originalNodeStyleDef.style.width || 60;
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
