// Proto merge was based on post-lecture clarifications; service discovery now handled separately

const express = require('express');
const path = require('path');
const app = express();
const port = 8080;
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
//API Key — pretty basic here but does the job for a project
const VALID_API_KEY = 'daveDistSys2025'; 

//TLS fun
//TLS setup — everything in this project is secure gRPC now, so naturally the GUI talking to services should be secured too
const fs = require('fs');
const caCert = fs.readFileSync('../certificates/cert.pem');

// Load all the proto files so the GUI knows how to talk to each service
const PARKING_PROTO_PATH = path.join(__dirname, '../proto/smart_parking.proto');
const TRAFFIC_PROTO_PATH = path.join(__dirname, '../proto/smart_traffic.proto');
const DISCOVERY_PROTO_PATH = path.join(__dirname, '../proto/service_discovery.proto');

const parkingDefinition = protoLoader.loadSync(PARKING_PROTO_PATH, {});
const trafficDefinition = protoLoader.loadSync(TRAFFIC_PROTO_PATH, {});
const discoveryDef = protoLoader.loadSync(DISCOVERY_PROTO_PATH, {});


const smartParkingProto = grpc.loadPackageDefinition(parkingDefinition).smartparking;
const smartTrafficProto = grpc.loadPackageDefinition(trafficDefinition).smarttraffic;
const discoveryProto = grpc.loadPackageDefinition(discoveryDef).servicediscovery;

// gRPC clients created here - each knows where its service lives and how to talk securely over TLS
const parkingClient = new smartParkingProto.SmartParking(
    'localhost:50051',
    grpc.credentials.createSsl(caCert)
);

const trafficClient = new smartTrafficProto.TrafficMonitor(
    'localhost:50053',
    grpc.credentials.createSsl(caCert)
);

const discoveryClient = new discoveryProto.ServiceDiscovery(
    'localhost:50055',
    grpc.credentials.createSsl(caCert)
);



app.use(express.json());
app.use(express.static(path.join(__dirname, 'gui')));

/*
SSE Note:
Server-Sent Events (SSE) don't send headers like x-api-key from the browser.
Normally, in stuff I’ve built (like bots for Telegram or remote control scripts for Plex using their API tokens)
the API key/token would travel in a header or as part of the request - easy.

Here though, because SSE doesn't work that way, I have to let the /parkingSpaces endpoint through without checking the API key.
If this was production - I'd probably go with WebSockets, or a JSON registry or token based like JWT .
*/


//api key check omissions
app.use((req, res, next) => {
    if (req.path === '/parkingSpaces') {
        return next(); // Allow SSE to work without API key
    }
    if (req.path === '/favicon.ico') {
        return res.status(204).end(); // No Content, skips the API check
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

// Get list of all known services (for GUI display)
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
