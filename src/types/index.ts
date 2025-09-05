export type DatabaseType = 'document' | 'graph' | 'key-value';

export interface Field {
  name: string;
  type: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  parentId?: string; // For subcollections - references parent collection ID
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
  _isDocumentAction?: boolean;
  _referencedFields?: Set<string>;
  _fieldValues?: Map<string, { valueType: string; fixedValue?: string }>;
  _connectedFieldName?: string;
  _sourceDocumentLabel?: string;
  _isAutoNamed?: boolean;
  _cumulativeFieldValues?: Map<string, { valueType: string; fixedValue?: string }>;
}