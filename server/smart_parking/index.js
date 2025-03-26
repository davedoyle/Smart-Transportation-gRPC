const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the proto file
const PROTO_PATH = path.join(__dirname, '../../proto/smart_parking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {}); 
const smartParkingProto = grpc.loadPackageDefinition(packageDefinition).smartparking; // No keepCase needed (note to me, keep camelcase in proto and all is good with the world!!)

// List of allowed number plates (hardcoded for now)
const allowedPlates = ['12C3456', '191D7890', '211L4321'].map(p => p.trim().toUpperCase());// had to force uppercase as i wasnt getting inteded output!


// Implementation of the CheckPlate RPC
function CheckPlate(call, callback) {
    console.log('Full request object:', call.request); // See what's coming in
    let plateNumber = call.request.plateNumber.trim().toUpperCase(); // Normalize input
    console.log(`Received plate number to check: ${plateNumber}`);

    let status = allowedPlates.includes(plateNumber) ? 'Allowed' : 'Denied';

    callback(null, { status });
}

// Post merge of service
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

// Create and start the gRPC server including the services
const server = new grpc.Server();
server.addService(smartParkingProto.SmartParking.service, { 
        CheckPlate,
        StreamSpaces
 });

const PORT = 'localhost:50051';//changed to local host!!!!! <------Divyaa call, watch for the localhost local ip conflict issue

server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(`Server error: ${err.message}`);
        return;
    }
    console.log(`Smart Parking gRPC server running on ${PORT}`);
    server.start();
});
