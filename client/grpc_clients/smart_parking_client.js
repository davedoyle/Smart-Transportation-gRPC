const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the proto file
const PROTO_PATH = path.join(__dirname, '../../proto/smart_parking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {}); // No keepCase needed (note to me, keep camelCase in proto and all is good with the world!!)
const smartParkingProto = grpc.loadPackageDefinition(packageDefinition).smartparking;

// Create a client instance that connects to the server
const client = new smartParkingProto.SmartParking(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

// Function to check a number plate (Client-side call)
function checkPlate(plateNumber) {
    console.log(`Sending plate number: ${plateNumber}`); // Optional debug log
    client.CheckPlate({ plateNumber: plateNumber }, (err, response) => {
        if (err) {
            console.error('Error calling CheckPlate:', err.message);
        } else {
            console.log(`Plate: ${plateNumber} => Status: ${response.status}`);
        }
    });
}

// Test calls (change these values to test different plates)
checkPlate('12C3456'); // Expected: Allowed
checkPlate('191D7890'); // Expected: Allowed
checkPlate('211L4321'); // Expected: Allowed
checkPlate('99X9999'); // Expected: Denied


