import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  FirestoreError
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Node, Edge } from 'reactflow';
import { NodeData, DatabaseType, Collection, Separator } from '../types';

export interface FlowchartData {
  id: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  collections: Collection[];
  separators: Separator[];
  dbType: DatabaseType;
  updatedAt: Timestamp | Date;
  createdAt: Timestamp | Date;
}

const COLLECTION_NAME = 'flowcharts';
const DEFAULT_FLOWCHART_ID = 'default';

export class FirestoreService {
  // Helper function to remove undefined values recursively
  private static cleanUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUndefinedValues(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanUndefinedValues(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  static async saveFlowchart(
    nodes: Node<NodeData>[], 
    edges: Edge[], 
    dbType: DatabaseType,
    collections: Collection[] = [],
    separators: Separator[] = [],
    flowchartId: string = DEFAULT_FLOWCHART_ID
  ): Promise<void> {
    try {
      const flowchartRef = doc(db, COLLECTION_NAME, flowchartId);
      
      const flowchartData = {
        id: flowchartId,
        nodes: this.cleanUndefinedValues(nodes),
        edges: this.cleanUndefinedValues(edges),
        collections: this.cleanUndefinedValues(collections),
        separators: this.cleanUndefinedValues(separators),
        dbType,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      console.log('🧹 Cleaned data for Firebase:', { 
        originalNodesCount: nodes.length,
        cleanedNodesCount: flowchartData.nodes.length,
        sampleProcessNode: flowchartData.nodes.find((n: any) => n.type === 'process')
      });

      await setDoc(flowchartRef, flowchartData, { merge: true });
    } catch (error) {
      console.error('Error saving flowchart:', error);
      
      // Check for specific Firebase errors
      if (error instanceof Error) {
        const firestoreError = error as FirestoreError;
        
        if (firestoreError.code === 'permission-denied') {
          console.error('❌ PERMISSION DENIED: Check Firestore security rules');
        } else if (firestoreError.code === 'unauthenticated') {
          console.error('❌ UNAUTHENTICATED: User needs to be authenticated');
        } else if (firestoreError.code === 'network-request-failed') {
          console.error('❌ NETWORK ERROR: Check internet connection');
        }
      }
      
      throw error;
    }
  }

  static async loadFlowchart(flowchartId: string = DEFAULT_FLOWCHART_ID): Promise<FlowchartData | null> {
    try {
      const flowchartRef = doc(db, COLLECTION_NAME, flowchartId);
      const docSnap = await getDoc(flowchartRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as FlowchartData;
        return data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error loading flowchart:', error);
      
      // Check for specific Firebase errors
      if (error instanceof Error) {
        const firestoreError = error as FirestoreError;
        
        if (firestoreError.code === 'permission-denied') {
          console.error('❌ PERMISSION DENIED: Check Firestore security rules for read access');
        }
      }
      
      throw error;
    }
  }

  static subscribeToFlowchart(
    callback: (data: FlowchartData | null) => void,
    flowchartId: string = DEFAULT_FLOWCHART_ID
  ): () => void {
    const flowchartRef = doc(db, COLLECTION_NAME, flowchartId);
    
    return onSnapshot(flowchartRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as FlowchartData;
        callback(data);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error subscribing to flowchart:', error);
      
      // Check for specific Firebase errors
      if (error instanceof Error) {
        const firestoreError = error as FirestoreError;
        console.error('Firebase subscription error code:', firestoreError.code);
      }
    });
  }
} 