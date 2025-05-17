import { loadNetworkData, DataLoadError } from '../src/utils/dataLoader';
import { NetworkData } from '../src/types/NetworkData';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

describe('Data Loader', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () =>
          Promise.resolve(`Name,Influence,Ventures,Connections,Quotes,Image
Peter Thiel,Friends with Palmer Luckey; Friends with Sam Altman,SpaceX; Anduril,Palmer Luckey; Sam Altman,"Quote 1 | Quote 2",/public/images/thiel.jpg`),
      })
    );
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('should load and transform nodes correctly', async () => {
    const networkData = await loadNetworkData();
    expect(networkData.nodes).toHaveLength(1);
    expect(networkData.nodes[0]).toEqual({
      id: 'peter-thiel',
      name: 'Peter Thiel',
      ventures: ['SpaceX', 'Anduril'],
      quotes: ['Quote 1', 'Quote 2'],
      image: '/public/images/thiel.jpg',
    });
  });

  it('should create edges correctly', async () => {
    const networkData = await loadNetworkData();
    expect(networkData.edges).toHaveLength(2);
    expect(networkData.edges).toEqual(
      expect.arrayContaining([
        {
          id: 'peter-thiel-palmer-luckey',
          source: 'peter-thiel',
          target: 'palmer-luckey',
          relationship: 'Friends',
        },
        {
          id: 'peter-thiel-sam-altman',
          source: 'peter-thiel',
          target: 'sam-altman',
          relationship: 'Friends',
        },
      ])
    );
  });

  it('should handle HTTP errors', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })
    );

    await expect(loadNetworkData()).rejects.toThrow(
      new DataLoadError('Failed to fetch data: 404 Not Found')
    );
  });

  it('should handle empty CSV files', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('   \n  \n'),
      })
    );

    await expect(loadNetworkData()).rejects.toThrow(new DataLoadError('CSV file is empty'));
  });

  it('should filter out edges with non-existent source nodes', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(`Name,Influence,Ventures,Connections,Quotes,Image
Peter Thiel,Friends with NonExistent Person,SpaceX,Palmer Luckey,"Quote 1",/public/images/thiel.jpg`),
      })
    );

    const networkData = await loadNetworkData();
    expect(networkData.nodes).toHaveLength(1);
    expect(networkData.edges).toHaveLength(1);
    expect(networkData.edges[0]).toEqual({
      id: 'peter-thiel-nonexistent-person',
      source: 'peter-thiel',
      target: 'nonexistent-person',
      relationship: 'Friends',
    });
  });
});
