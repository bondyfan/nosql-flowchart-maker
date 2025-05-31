export type DatabaseType = 'document' | 'graph' | 'key-value';

export interface Field {
  name: string;
  type: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
}

export interface Separator {
  id: string;
  x: number;
  label: string;
  color: string;
}

export interface NodeData {
  label: string;
  type: 'document' | 'array' | 'process' | string;
  fields: Field[];
  properties: Record<string, string | number | boolean>;
  collectionId?: string;
}