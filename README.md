# Smart-Transportation-gRPC
This project is for academic purposes as part of a Distributed Systems assignment (2025).


# Smart Transportation System using gRPC

PLEASE FIND THE "INSTALL INSTRUCTIONS" FURTHER DOWN!!

## Overview

This project is a **Smart Transportation System** built using **gRPC-based microservices** as part of a Distributed Systems assignment.

### Core Services:
- **Smart Parking Service**: Manage parking availability and entry barriers.
- **Traffic Monitoring Service**: Handle congestion reports and provide summaries.
- **Bus Station Service**: Track buses and provide ETA and fare updates.

### gRPC Communication:
- **Simple RPC**: Car entry barrier check.
- **Server Streaming**: Parking spot availability updates.
- **Client Streaming**: Traffic congestion reporting.
- **Bi-Directional Streaming**: Bus ETA and fare updates.

### Other Features:
- **Discovery Service** for dynamic service discovery.
- **Self-signed TLS** for secure communication (to be implemented).
- **Web-based GUI** for user interaction.
- Error handling and security measures.

---

## Initial Setup

This is a work in progress, and components will be added in phases:
1. Set up basic services.
2. Implement gRPC communications.
3. Develop GUI for user interaction.
4. Add TLS encryption.
5. Final testing and documentation.

---

## Contributors
- **Dave Doyle** (X23295163)

---

## Note
This project is for academic purposes as part of a Distributed Systems assignment (2025).


# How to Set Up and Run the Project

## 1. Install Dependencies

To keep this repository clean and manageable, the `node_modules/` folder is intentionally excluded (as per standard practice).  
All necessary packages (like `grpc`, `express`, etc.) are listed in `package.json`.

To install all required packages, simply run the following command in the project root:

```bash
npm install
```

This will automatically download and set up everything needed for both the client and server.

## 2. Running the gRPC Services

Each service (Smart Parking, Traffic Monitor, Bus Station, and Discovery Service) can be started individually.  
From the project root, navigate to each service folder and run it:

```bash
# Example: Run Smart Parking Service
cd server/smart_parking
node index.js

# Example: Run Traffic Monitor Service
cd ../traffic_monitor
node index.js
```

Repeat similarly for other services.

## 3. Running the Client (GUI)

The client folder contains the front-end interface to interact with the gRPC services.  
You can open `index.html` directly in a browser or use a local web server to serve it.

## 4. Note on Security (TLS/Certificates)

If applicable, self-signed certificates for encrypted gRPC connections will be placed in the `/certificates/` folder.  
Instructions for running services with TLS will be added as the project progresses as I must figure out how to accomplish this.

## Important

- All gRPC definitions are located in the `/proto/` folder.
- Please ensure you run `npm install` before attempting to run any service.
- No need to download or install `node_modules` manually — they will be automatically installed via `npm install`.
