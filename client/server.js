// Proto merge was based on post-lecture clarifications; service discovery now handled separately

const express = require('express');
const path = require('path');
const app = express();
const port = 8080;
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
//api key
const VALID_API_KEY = 'daveDistSys2025'; 

// Load merged proto (camelCase version — no keepCase needed)
const PARKING_PROTO_PATH = path.join(__dirname, '../proto/smart_parking.proto');
const TRAFFIC_PROTO_PATH = path.join(__dirname, '../proto/smart_traffic.proto');
const DISCOVERY_PROTO_PATH = path.join(__dirname, '../proto/service_discovery.proto');

const parkingDefinition = protoLoader.loadSync(PARKING_PROTO_PATH, {});
const trafficDefinition = protoLoader.loadSync(TRAFFIC_PROTO_PATH, {});
const discoveryDef = protoLoader.loadSync(DISCOVERY_PROTO_PATH, {});

const smartParkingProto = grpc.loadPackageDefinition(parkingDefinition).smartparking;
const smartTrafficProto = grpc.loadPackageDefinition(trafficDefinition).smarttraffic;
const discoveryProto = grpc.loadPackageDefinition(discoveryDef).servicediscovery;

// Create gRPC clients
const parkingClient = new smartParkingProto.SmartParking(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

const trafficClient = new smartTrafficProto.TrafficMonitor(
    'localhost:50053',
    grpc.credentials.createInsecure()
);

const discoveryClient = new discoveryProto.ServiceDiscovery(
    'localhost:50055',
    grpc.credentials.createInsecure()
);



app.use(express.json());
app.use(express.static(path.join(__dirname, 'gui')));

/*
 Server-Sent events can't send headers like x-api-key from the browser,
 so we let /parkingSpaces through without the API key check.
 In a real system I'd probably use WebSockets or some token-based method instead.
*/


app.use((req, res, next) => {
    if (req.path === '/parkingSpaces') {
        return next(); // Allow SSE to work without API key
    }

    const key = req.headers['x-api-key'];
    if (key !== 'daveDistSys2025') {
        console.warn('Rejected request – invalid or missing API key');
        return res.status(403).json({ message: 'Access denied. Invalid API key.' });
    }

    next();
});




// Route to check plate using gRPC
app.post('/checkPlate', (req, res) => {
    console.log("Incoming body from HTML:", req.body);

    const registrationPlate = req.body.registrationPlate;

    if (!registrationPlate) {
        console.warn("No registrationPlate received");
        return res.status(400).json({ approved: false, message: "No registration plate provided" });
    }

    console.log("Sending to gRPC:", { registrationPlate });

    parkingClient.CheckEntry({ registrationPlate }, (err, response) => {
        if (err) {
            console.error('gRPC Error:', err.message);
            return res.status(500).json({ approved: false, message: err.message });
        }

        console.log("gRPC responded:", response);
        res.json({ approved: response.approved, message: response.message });
    });
});

// Parking spaces streaming (Server-Sent Events for GUI)
app.get('/parkingSpaces', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const call = parkingClient.GetParkingAvailability({});

    call.on('data', (response) => {
        res.write(`data: ${JSON.stringify(response)}\n\n`);
    });

    call.on('end', () => res.end());

    call.on('error', (err) => {
        console.log('Stream error caught:', err.message);
        res.end();
    });

    req.on('close', () => {
        call.cancel(); // Stop stream if browser disconnects
    });
});

// route to handle traffic congestion reporting
app.post('/reportTraffic', (req, res) => {
    const updates = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: 'No traffic reports received' });
    }

    const call = trafficClient.StreamTraffic((err, summary) => {
        if (err) {
            console.error("gRPC error during StreamTraffic:", err.message);
            return res.status(500).json({ message: "gRPC error: " + err.message });
        }

        console.log("Server summary response:", summary);
        res.json(summary); // Send summary back to GUI
    });

    updates.forEach(update => {
        console.log("Sending traffic update to gRPC:", update);
        call.write(update);
    });

    call.end(); // All updates sent, end stream
});

// route to expose list of registered services
app.get('/discoveredServices', (req, res) => {
    discoveryClient.ListServices({}, (err, response) => {
        if (err) {
            console.error("gRPC error during ListServices:", err.message);
            return res.status(500).json({ message: "Discovery service error" });
        }

        res.json(response.services);
    });
});

app.listen(port, () => {
    console.log(`GUI Server running at http://localhost:${port}`);
});
