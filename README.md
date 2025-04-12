# Smart-Transportation-gRPC  
Distributed Systems Assignment — 2025  
Dave Doyle (X23295163)

---

## What is this?

This project was built for a Distributed Systems assignment and focuses on a **Smart Transportation System** using gRPC services.

It's intentionally simple, not over-engineered — just enough to meet requirements, show learning, and get things working securely with gRPC.

---

## Services in this project:

| Service            | Purpose                                                       | gRPC Style Used         |
|-------------------|----------------------------------------------------------------|--------------------------|
| Smart Parking      | Check number plates & stream parking availability updates     | Unary & Server Streaming |
| Traffic Monitoring | Accept multiple traffic reports and return summary stats      | Client Streaming         |
| Service Discovery  | Handle service registration & show what’s online              | Bi-Directional & Unary   |

---

## Key Features

- gRPC communication between all services
- TLS encryption (self-signed certs)
- Simple API key security for GUI requests
- Service Discovery for dynamic awareness
- Basic GUI for interacting with everything
- Logging and error handling for most actions

---

## Running this Project

### 1. Install dependencies:

```bash
npm install
```

---

### 2. Start the services:

Run them individually if you want, but easiest is:

```bash
cd server
node app.js
```

This will spin up:
- Service Discovery
- Smart Parking
- Traffic Monitoring

...with a small wait to let Discovery boot first.

---

### 3. Start the GUI:

```bash
cd client
node server.js
```

Then open in browser:  
`http://localhost:8080`

---

## Security Notes

- API Key is checked on most routes:  
`x-api-key: daveDistSys2025`

- SSE (Server-Sent Events) can't send headers — so `/parkingSpaces` skips API key checking.

> *If this was production I'd be looking into WebSockets or token-based approaches like JSON Web Tokens (JWT) for something cleaner.*

---

## gRPC Proto files

All proto definitions live here:  
```
/proto/
```

---

## Final Thought

This is a student assignment — This was a measured approach to attempt to keep within scope of a college level assignment.  
The focus was clean code, security where reasonable, and demonstrating gRPC functionality across multiple services.


---
