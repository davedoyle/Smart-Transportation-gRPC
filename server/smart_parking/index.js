const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the proto file (camelCase version)
const PROTO_PATH = path.join(__dirname, '../../proto/smart_parking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {}); // no keepCase needed
const smartParkingProto = grpc.loadPackageDefinition(packageDefinition).smartparking;

// Hardcoded list of allowed plates (simulating approved vehicles)
const allowedPlates = ['12C3456', '191D7890', '211L4321'].map(p => p.trim().toUpperCase());

// Handles incoming CheckEntry requests
function CheckEntry(call, callback) {
    console.log("Full gRPC request body:", call.request);
    const plate = (call.request.registrationPlate || '').trim().toUpperCase(); // now camelCase
    console.log(`Received registration: ${plate}`);

    const approved = allowedPlates.includes(plate);
    const message = approved ? "Access granted" : "Access denied";

    callback(null, { approved, message });
}

// Simulated parking space updates based on time of day
const MAX_SPACES = 50;
let availableSpaces = MAX_SPACES;

function simulateSpaceChanges() {
    const hour = new Date().getHours();
    let change = Math.floor(Math.random() * 3) - 1;

    if (hour >= 6 && hour < 10) {
        change = Math.floor(Math.random() * 5) - 4;
    } else if (hour >= 16 && hour < 20) {
        change = Math.floor(Math.random() * 5) - 1;
    }

    availableSpaces = Math.max(0, Math.min(MAX_SPACES, availableSpaces + change));
}

// Handles streaming updates to available parking spaces
function GetParkingAvailability(call) {
    console.log("Client connected for availability updates...");

    const interval = setInterval(() => {
        simulateSpaceChanges();
        const timestamp = new Date().toISOString();
        call.write({ availableSpaces, timestamp }); // now camelCase
    }, 3000);

    call.on('end', () => {
        clearInterval(interval);
        call.end();
    });
}

// Start gRPC server
const server = new grpc.Server();
console.log("Loaded services:", Object.keys(smartParkingProto));

server.addService(smartParkingProto.SmartParking.service, {
    CheckEntry,
    GetParkingAvailability
});

const PORT = 'localhost:50051';
server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(`Server error: ${err.message}`);
        return;
    }
    console.log(`Smart Parking gRPC server running on ${PORT}`);
    server.start();
});
