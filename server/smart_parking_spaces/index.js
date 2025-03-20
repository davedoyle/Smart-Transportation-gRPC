const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the proto file
const PROTO_PATH = path.join(__dirname, '../../proto/smart_parking_spaces.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const parkingProto = grpc.loadPackageDefinition(packageDefinition).SmartParkingSpaces; 

// Constants for simulation
const MAX_SPACES = 50;
let availableSpaces = MAX_SPACES;

// Function to simulate space updates realistically
function simulateSpaceChanges() {
    const hour = new Date().getHours();
    let change = Math.floor(Math.random() * 3) - 1; // Small realistic adjustments (-1, 0, +1)

    if (hour >= 6 && hour < 10) {
        // Morning: More cars arriving
        change = Math.floor(Math.random() * 5) - 4; // -4 to +1
    } else if (hour >= 16 && hour < 20) {
        // Evening: More cars leaving
        change = Math.floor(Math.random() * 5) - 1; // -1 to +3
    }

    availableSpaces = Math.max(0, Math.min(MAX_SPACES, availableSpaces + change));
}

// Implementation of StreamSpaces
function StreamSpaces(call) {
    console.log("Client connected for parking space updates...");

    const interval = setInterval(() => {
        simulateSpaceChanges();
        call.write({ availableSpaces });
        console.log(`Updated spaces: ${availableSpaces}`);
    }, 3000); // Send updates every 3 seconds

    call.on('end', () => {
        console.log("Client disconnected from parking space updates.");
        clearInterval(interval);
        call.end();
    });
}

// Start the gRPC server
const server = new grpc.Server();
server.addService(parkingProto.ParkingSpaces.service, { StreamSpaces });

const PORT = '0.0.0.0:50052';
server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(`Server error: ${err.message}`);
        return;
    }
    console.log(`🚗 Smart Parking Spaces gRPC server running on ${PORT}`);
    server.start();
});
