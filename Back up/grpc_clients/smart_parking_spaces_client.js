const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the proto file
const PROTO_PATH = path.join(__dirname, '../../proto/smart_parking_spaces.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const parkingProto = grpc.loadPackageDefinition(packageDefinition).smartparkingspaces;

// Create gRPC client
const client = new parkingProto.ParkingSpaces(
    'localhost:50052',
    grpc.credentials.createInsecure()
);

// Function to receive streaming updates
function listenForSpaces() {
    const call = client.StreamSpaces({}, (error) => {
        if (error) {
            console.error("Streaming error:", error);
        }
    });

    call.on('data', (response) => {
        console.log(`Available spaces: ${response.availableSpaces}`);
    });

    call.on('end', () => {
        console.log("Server stopped streaming.");
    });
}

// Start listening
listenForSpaces();
