import { transformCSVToNetworkData } from '../dataTransformer';
import { validateNetworkData, validateCSVRow } from '../dataValidator';

describe('Data Transformation and Validation', () => {
  const validCSV = `Name,Influence,Ventures,Connections,Quotes,Image
John Doe,Friends with Jane Smith;Hired Bob Jones,Tech Corp;AI Labs,3,Great quote|Another quote,https://example.com/john.jpg
Jane Smith,Donated $5M to Tech Corp,Finance Inc,2,Inspiring quote,https://example.com/jane.jpg`;

  it('transforms CSV data into network data structure', () => {
    const result = transformCSVToNetworkData(validCSV);

    expect(result.nodes).toHaveLength(4); // 2 people + 2 ventures
    expect(result.edges).toHaveLength(3); // 2 relationships + 1 donation

    const johnNode = result.nodes.find((n) => n.name === 'John Doe');
    expect(johnNode).toBeDefined();
    expect(johnNode?.ventures).toHaveLength(2);
    expect(johnNode?.quotes).toHaveLength(2);

    const donation = result.edges.find((e) => e.type === 'financial');
    expect(donation).toBeDefined();
    expect(donation?.amount).toBe('$5M');
  });

  it('validates CSV row data', () => {
    const validRow = {
      Name: 'John Doe',
      Influence: 'Friends with Jane',
      Ventures: 'Tech Corp',
      Quotes: 'Great quote',
      Image: 'https://example.com/john.jpg',
    };

    expect(() => validateCSVRow(validRow)).not.toThrow();

    const invalidRow = { ...validRow, Name: '' };
    expect(() => validateCSVRow(invalidRow)).toThrow('Name field cannot be empty');

    const missingField = { Name: 'John' };
    expect(() => validateCSVRow(missingField as any)).toThrow('Missing required fields');
  });

  it('validates network data structure', () => {
    const validData = {
      nodes: [
        {
          id: 'john-doe',
          name: 'John Doe',
          type: 'person',
          ventures: ['Tech Corp'],
          quotes: ['Great quote'],
          image: 'https://example.com/john.jpg',
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'john-doe',
          target: 'jane-smith',
          type: 'personal',
          description: 'Friends with Jane',
        },
      ],
    };

    expect(() => validateNetworkData(validData)).not.toThrow();

    const invalidData = {
      nodes: [
        {
          id: '',
          name: 'John Doe',
          type: 'invalid-type',
        },
      ],
      edges: [],
    };

    expect(() => validateNetworkData(invalidData)).toThrow();
  });

  it('handles empty or malformed CSV data', () => {
    expect(() => transformCSVToNetworkData('')).toThrow();
    expect(() => transformCSVToNetworkData('invalid,csv,data')).toThrow();
  });
});
