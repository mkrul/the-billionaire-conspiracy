import { z } from 'zod';

export const NodeDataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['person', 'organization']),
  image: z.string().url().optional(),
  quotes: z.array(z.string()).optional(),
  ventures: z.array(z.string()).optional(),
});

export const EdgeDataSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.enum(['professional', 'personal', 'financial', 'political']),
  description: z.string().min(1),
  amount: z.string().optional(),
});

export const NetworkDataSchema = z.object({
  nodes: z.array(NodeDataSchema),
  edges: z.array(EdgeDataSchema),
});

export function validateNetworkData(data: unknown) {
  return NetworkDataSchema.parse(data);
}

export function validateCSVRow(row: Record<string, string>) {
  const requiredFields = ['Name', 'Influence', 'Ventures', 'Quotes', 'Image'];
  const missingFields = requiredFields.filter((field) => !(field in row));

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  if (!row.Name.trim()) {
    throw new Error('Name field cannot be empty');
  }

  if (row.Image && !row.Image.startsWith('http')) {
    throw new Error('Image must be a valid URL');
  }

  return true;
}
