# Firestore Setup Guide

## Testing Firebase Connection

1. Open your app at `http://localhost:5174/`
2. Open browser console (F12)
3. Click the yellow "Test Firebase" button in the sidebar
4. Check the console for detailed error messages

## Common Issues and Solutions

### 1. Firestore Security Rules

The most common issue is that Firestore rules are blocking writes. 

**To fix this:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `nosql-flowchart`
3. Go to **Firestore Database** → **Rules**
4. Replace the rules with this (for development):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents for development
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Note:** This allows all access - use only for development!

For production, use more restrictive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow access to flowcharts collection
    match /flowcharts/{flowchartId} {
      allow read, write: if true;
    }
  }
}
```

### 2. Check Firebase Project Configuration

Verify your Firebase configuration in `src/firebase/config.ts`:

- Project ID: `nosql-flowchart`
- Make sure the API key and other settings are correct

### 3. Network/CORS Issues

If you see network errors:

1. Check your internet connection
2. Verify the Firebase project is active
3. Check if there are any browser extensions blocking requests

### 4. Common Error Codes

- `permission-denied`: Firestore rules are blocking the operation
- `unauthenticated`: User needs to be signed in (not required for our setup)
- `network-request-failed`: Internet connection or CORS issue
- `not-found`: Document or collection doesn't exist (normal for first run)

## Testing Steps

1. **Test Firebase Connection**: Click "Test Firebase" button
2. **Check Console Logs**: Look for detailed error messages
3. **Try Manual Save**: Use the cloud save button in the header
4. **Create a Node**: Drag a collection from sidebar and watch console

## Expected Console Output (Success)

When working correctly, you should see:
```
Loading initial data from Firestore...
FirestoreService.loadFlowchart called with flowchartId: default
No flowchart document found in Firestore
Database context initialized
Adding new node: collection {x: 100, y: 100}
Nodes updated, new count: 1
Auto-save triggered {...}
Auto-saving to Firestore... {nodes: 1, edges: 0}
FirestoreService.saveFlowchart called with: {...}
Flowchart saved successfully to Firestore
```

## If Still Not Working

1. Check Firebase Console → Firestore → Data tab to see if documents are being created
2. Look for any error messages in the Firebase Console
3. Try refreshing the page and checking if data persists
4. Verify the project ID matches your Firebase project 