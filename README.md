# NoSQL Flowchart Maker

A React-based application for creating and managing NoSQL database diagrams with real-time cloud synchronization via Firestore.

## Features

- **Interactive Flowchart Editor**: Create nodes and connections for NoSQL database designs
- **Multiple Database Types**: Support for Document, Graph, and Key-Value database types
- **Cloud Synchronization**: Automatic saving and loading from Firestore database
- **Real-time Updates**: Changes are automatically saved with debounced auto-save
- **Dark/Light Theme**: Toggle between dark and light modes
- **Export/Import**: Save diagrams locally as JSON files
- **Responsive Design**: Works on desktop and mobile devices

## Firebase/Firestore Integration

The application is connected to Firebase Firestore for persistent storage:

- **Auto-save**: Changes are automatically saved to Firestore after 1 second of inactivity
- **Real-time sync**: Data is loaded from Firestore when the app starts
- **Connection status**: Visual indicator shows connection status in the header
- **Manual controls**: Save and Load buttons for manual synchronization
- **Offline support**: App continues to work offline, syncing when connection is restored

### Firestore Configuration

The app uses the following Firebase project configuration:
- Project ID: `nosql-flowchart`
- Collection: `flowcharts`
- Document ID: `default` (single shared flowchart)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Usage

1. **Adding Nodes**: Drag node types from the sidebar to the canvas
2. **Connecting Nodes**: Click and drag from one node to another to create connections
3. **Editing Nodes**: Click on a node to select it and edit its properties in the sidebar
4. **Database Types**: Switch between Document, Graph, and Key-Value database types using the header buttons
5. **Cloud Sync**: Your changes are automatically saved to Firestore. Use the cloud buttons for manual sync
6. **Export/Import**: Use the Save/Load buttons to export diagrams as JSON or import existing diagrams

## Architecture

- **React 18** with TypeScript
- **React Flow** for the flowchart interface
- **Firebase v9** for cloud storage
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Vite** for build tooling

## Cloud Storage Structure

Data is stored in Firestore with the following structure:

```typescript
interface FlowchartData {
  id: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  dbType: DatabaseType;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `npm run lint`
5. Submit a pull request

## License

MIT License 