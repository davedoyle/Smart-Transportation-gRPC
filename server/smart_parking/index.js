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
// Create and start the gRPC server
const server = new grpc.Server();
server.addService(smartParkingProto.SmartParking.service, { CheckPlate });

const PORT = 'localhost:50051';//changed to local host!!!!! <------Divyaa call, watch for the localhost local ip conflict issue

server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(`Server error: ${err.message}`);
        return;
    }
    console.log(`Smart Parking gRPC server running on ${PORT}`);
    server.start();
});
