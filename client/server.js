// Proto merge was based on post-lecture clarifications; service discovery now handled separately

const express = require('express');
const path = require('path');
const app = express();
const port = 8080;
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load merged proto (camelCase version — no keepCase needed)
const PARKING_PROTO_PATH = path.join(__dirname, '../proto/smart_parking.proto');

const parkingDefinition = protoLoader.loadSync(PARKING_PROTO_PATH, {}); // no keepCase
const smartParkingProto = grpc.loadPackageDefinition(parkingDefinition).smartparking;

// Create gRPC client
const parkingClient = new smartParkingProto.SmartParking(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'gui')));

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
        // response.availableSpaces and response.timestamp now in camelCase
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

app.listen(port, () => {
    console.log(`GUI Server running at http://localhost:${port}`);
});
