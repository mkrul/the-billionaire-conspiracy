import cytoscape from 'cytoscape';

describe('Cytoscape initialization', () => {
  it('should be able to create a cytoscape instance', () => {
    const cy = cytoscape({
      container: document.createElement('div'),
      elements: [],
    });

    expect(cy).toBeDefined();
    expect(cy.elements().length).toBe(0);
  });
});
