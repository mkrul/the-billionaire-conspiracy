import { transformToCytoscapeElements } from './transformData';

const sampleData = `Name,Influence,Ventures,Connections,Quotes,Image
Alice,Friends with Bob; Hired Charlie,Company A; Company B,Bob; Charlie,"Quote 1 | Quote 2",/images/alice.jpg
Bob,Hired Charlie,Company B,,Quote 3,/images/bob.jpg
Charlie,,,Alice; Bob,,/images/charlie.jpg`;

describe('transformToCytoscapeElements', () => {
  const elements = transformToCytoscapeElements(sampleData);

  describe('Node Creation', () => {
    test('creates correct number of person nodes', () => {
      const personNodes = elements.nodes.filter((n) => n.data.type === 'person');
      expect(personNodes).toHaveLength(3);
    });

    test('creates correct number of venture nodes', () => {
      const ventureNodes = elements.nodes.filter((n) => n.data.type === 'venture');
      expect(ventureNodes).toHaveLength(2); // Company A and Company B
    });

    test('creates nodes with correct properties', () => {
      const aliceNode = elements.nodes.find((n) => n.data.id === 'Alice');
      expect(aliceNode.data).toEqual({
        id: 'Alice',
        label: 'Alice',
        image: '/images/alice.jpg',
        quotes: ['Quote 1', 'Quote 2'],
        ventures: ['Company A', 'Company B'],
        type: 'person',
      });
    });
  });

  describe('Edge Creation', () => {
    test('creates influence edges', () => {
      const influenceEdges = elements.edges.filter((e) => e.data.type === 'influence');
      expect(influenceEdges).toHaveLength(3); // Alice->Bob, Alice->Charlie, Bob->Charlie
    });

    test('creates business relationship edges', () => {
      const businessEdges = elements.edges.filter((e) => e.data.type === 'business');
      expect(businessEdges).toHaveLength(3); // Alice->CompanyA, Alice->CompanyB, Bob->CompanyB
    });

    test('creates connection edges', () => {
      const connectionEdges = elements.edges.filter((e) => e.data.type === 'connection');
      // Should only create connections that aren't already covered by influence relationships
      const expectedConnections = elements.edges.filter(
        (e) =>
          e.data.type === 'connection' &&
          !elements.edges.some(
            (ie) =>
              ie.data.type === 'influence' &&
              ((ie.data.source === e.data.source && ie.data.target === e.data.target) ||
                (ie.data.source === e.data.target && ie.data.target === e.data.source))
          )
      );
      expect(expectedConnections.length).toBeGreaterThan(0);
    });

    test('creates edges with correct properties', () => {
      const aliceBobEdge = elements.edges.find(
        (e) => e.data.source === 'Alice' && e.data.target === 'Bob' && e.data.type === 'influence'
      );
      expect(aliceBobEdge.data).toEqual({
        id: 'Alice-Bob',
        source: 'Alice',
        target: 'Bob',
        relationship: 'Friends',
        type: 'influence',
      });
    });
  });

  describe('Error Handling', () => {
    test('handles malformed CSV data gracefully', () => {
      const malformedData = 'Name,Bad,Data\nAlice,1,2,3,4\nBob,1';
      expect(() => transformToCytoscapeElements(malformedData)).not.toThrow();
    });

    test('handles empty data', () => {
      expect(() => transformToCytoscapeElements('')).toThrow();
    });
  });
});
