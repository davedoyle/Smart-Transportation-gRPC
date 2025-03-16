const express = require('express');
const path = require('path');
const app = express();
const port = 8080;
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load proto and client
const PROTO_PATH = path.join(__dirname, '../proto/smart_parking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const smartParkingProto = grpc.loadPackageDefinition(packageDefinition).smartparking;

const client = new smartParkingProto.SmartParking(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

// First, parse JSON bodies
app.use(express.json());

// Serve static files (index.html)
app.use(express.static(path.join(__dirname, 'gui')));

// define the route AFTER middleware is ready
app.post('/checkPlate', (req, res) => {
    const plateNumber = req.body.plateNumber;  // Now this will work!

    client.CheckPlate({ plateNumber: plateNumber }, (err, response) => {
        if (err) {
            console.error('gRPC Error:', err.message);
            res.status(500).json({ status: 'Error', details: err.message });
        } else {
            res.json({ status: response.status });
        }
    });
});

app.listen(port, () => {
  console.log(`🌐 GUI Server running at http://localhost:${port}`);
});
