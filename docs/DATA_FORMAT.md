# Network Graph Data Format Documentation

## Overview

The network graph visualization uses a CSV file format for data input, which is then transformed into a network data structure for visualization. This document outlines the data format requirements and provides guidance on updating the data.

## CSV Format

The data should be provided in a CSV file with the following columns:

| Column    | Description                                     | Required | Format                           |
| --------- | ----------------------------------------------- | -------- | -------------------------------- |
| Name      | Entity name (person or organization)            | Yes      | String                           |
| Influence | Semicolon-separated list of relationships       | Yes      | String (see Relationship Format) |
| Ventures  | Semicolon-separated list of associated ventures | Yes      | String                           |
| Quotes    | Pipe-separated list of quotes                   | No       | String                           |
| Image     | URL to entity's image                           | No       | Valid URL                        |

### Relationship Format

Relationships in the Influence column should follow these patterns:

- "Friends with [Name]" (creates a personal relationship)
- "Hired [Name]" (creates a professional relationship)
- "Appointed [Name]" (creates a political relationship)
- "Donated $[Amount] to [Name]" (creates a financial relationship)
- "Worked for [Name]" (creates a professional relationship)
- "Founded [Name]" (creates a professional relationship)
- "Recommended [Name]" (creates a political relationship)

Example:

```csv
Friends with Jane Smith;Donated $5M to Tech Corp;Hired Bob Jones
```

### Ventures Format

Ventures should be semicolon-separated names of organizations or projects:

```csv
Tech Corp;AI Labs;Innovation Fund
```

### Quotes Format

Quotes should be pipe-separated strings:

```csv
This is the first quote|This is the second quote|Another quote
```

## Example CSV

```csv
Name,Influence,Ventures,Connections,Quotes,Image
John Doe,Friends with Jane Smith;Hired Bob Jones,Tech Corp;AI Labs,3,Great quote|Another quote,https://example.com/john.jpg
Jane Smith,Donated $5M to Tech Corp,Finance Inc,2,Inspiring quote,https://example.com/jane.jpg
```

## Updating the Data

To update the network graph data:

1. Edit the CSV file following the format above
2. Ensure all required fields are present
3. Validate relationships follow the correct format
4. Check that all referenced entities exist in the data
5. Verify URLs are valid and accessible
6. Test the data by running the test suite:
   ```bash
   npm test
   ```

## Data Validation

The system performs the following validations:

1. Required fields must be present
2. Names cannot be empty
3. Image URLs must be valid
4. Relationship formats must match the patterns above
5. Entity references must be valid (no dangling references)

## Network Data Structure

The CSV is transformed into the following TypeScript interfaces:

```typescript
interface NodeData {
  id: string; // Sanitized name as ID
  name: string; // Original name
  type: 'person' | 'organization';
  image?: string; // Optional image URL
  quotes?: string[]; // Optional array of quotes
  ventures?: string[]; // Optional array of ventures
}

interface EdgeData {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  type: 'professional' | 'personal' | 'financial' | 'political';
  description: string; // Original relationship text
  amount?: string; // Optional amount for financial relationships
}

interface NetworkData {
  nodes: NodeData[];
  edges: EdgeData[];
}
```

## Error Handling

Common errors and their solutions:

1. "Missing required fields" - Ensure all required columns are present
2. "Name field cannot be empty" - Provide a name for each entity
3. "Invalid image URL" - Check image URL format and accessibility
4. "Invalid relationship format" - Verify relationship text matches patterns
5. "Referenced entity not found" - Ensure all referenced entities exist in data

## Best Practices

1. Keep entity names consistent throughout the data
2. Use clear, descriptive relationship descriptions
3. Provide high-quality, accessible images
4. Keep quotes concise and relevant
5. Regularly validate data using provided tools
6. Back up data before making large changes
7. Test visualization after significant updates
