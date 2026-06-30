# Admin Dashboard Integration Guide

This guide details how to implement the **Session Monitoring** feature for the Admin Dashboard.

## 1. Overview
The Admin Dashboard can:
1.  Fetch a list of recent sessions via REST API.
2.  Receive real-time updates when new sessions are created via WebSocket.

## 2. API Integration (List Sessions)

### Endpoint
- **URL**: `/api/sessions`
- **Method**: `GET`
- **Response**: Array of `Session` objects (newest first).

### Example Response
```json
[
  {
    "id": "uuid-1",
    "createdAt": "2023-10-27T10:00:00Z",
    "status": "COMPLETED",
    "medias": [...]
  },
  {
    "id": "uuid-2",
    "createdAt": "2023-10-27T09:55:00Z",
    "status": "PENDING",
    "medias": [...]
  }
]
```

### Usage (Orval)
If you regenerate your Orval client, you will get a new hook:
```typescript
const { data: sessions } = useGetSessions(); // Returns Session[]
```

## 3. Real-time Monitoring (WebSocket)

The backend emits a `session_created` event universally to all connected clients.

### Event Details
- **Event Name**: `session_created`
- **Payload**: The full `Session` object of the newly created session.

### Integration
Add this to your Admin Socket listener (see `FRONTEND_GUIDE.md` for setup):

```typescript
// Inside your useEffect or Socket context
socket.on('session_created', (newSession) => {
    console.log('New session started:', newSession);
    
    // Update your local state
    setSessions((prev) => [newSession, ...prev]);
});
```

## 4. Implementation Workflow

1.  **Initial Load**: On page load, call `GET /api/sessions` to populate the table/list.
2.  **Subscribe**: Listen for `session_created`.
3.  **Update**: On event, prepend the `newSession` to your list.
4.  **Navigate**: Click on a session ID to view details (`GET /api/sessions/:id`).
