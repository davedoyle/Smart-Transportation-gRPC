const grpc = require('@grpc/grpc-js'); 
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs'); // needed now for reading certs

/* Load the proto file so I can work with it, this is vastly different to how i work day to day with 
asp.net, how i interpreted all this is, asp.net and c# backend know all about each other, where as here the proto's are essentially for the
frontend to know the backend exists and what to expect*/
const PROTO_PATH = path.join(__dirname, '../../proto/smart_parking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {}); // no keepCase needed
const smartParkingProto = grpc.loadPackageDefinition(packageDefinition).smartparking;

// Hardcoded list of allowed plates
const allowedPlates = ['12C3456', '191D7890', '211L4321'].map(p => p.trim().toUpperCase());

// gRPC function to handle when someone checks a plate
function CheckEntry(call, callback) {
    console.log("Full gRPC request body:", call.request);
    //minor leanring, gRPC is super strict around naming nomenclature, if its camelcase, stick to it if something else stick to it
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

// Start gRPC server with TLS 
const server = new grpc.Server();
console.log("Loaded services:", Object.keys(smartParkingProto));

server.addService(smartParkingProto.SmartParking.service, {
    CheckEntry,
    GetParkingAvailability
});

// Load TLS cert and key 
const certPath = path.join(__dirname, '../../certificates/cert.pem');
const keyPath = path.join(__dirname, '../../certificates/key.pem');

const creds = grpc.ServerCredentials.createSsl(
    null,
    [{
        cert_chain: fs.readFileSync(certPath),
        private_key: fs.readFileSync(keyPath)
    }],
    false // not asking clients for certs
);

const PORT = 'localhost:50051';
server.bindAsync(PORT, creds, (err, port) => {
    if (err) {
        console.error(`Server error: ${err.message}`);
        return;
    }
    console.log(`Smart Parking gRPC server running securely on ${PORT}`);
    server.start();
});

// Announcing service so discovery can acknowledge
const discoveryProtoPath = path.join(__dirname, '../../proto/service_discovery.proto');
const discoveryDef = protoLoader.loadSync(discoveryProtoPath, {});
const discoveryProto = grpc.loadPackageDefinition(discoveryDef).servicediscovery;

// reading the cert here so I can connect securely to Service Discovery
const caCert = fs.readFileSync(path.join(__dirname, '../../certificates/cert.pem'));

const discoveryClient = new discoveryProto.ServiceDiscovery(
    'localhost:50055',
    grpc.credentials.createSsl(caCert) // secure connection, trust self-signed cert
);

// Start the stream and send registration details
const stream = discoveryClient.RegisterService();

stream.write({
    serviceName: "SmartParking",
    serviceType: "parking",
    address: "localhost:50051",
    status: "online"
});

// talking to smart_traffic just to hit the requirement as i missed it late in the development
setTimeout(() => {
discoveryClient.ListServices({}, (err, response) => {
    if (err) {
        console.error("Failed to discover services:", err.message);
        return;
    }

    const trafficService = response.services.find(s => s.serviceName === 'TrafficMonitoring');

    if (trafficService) {
        console.log(`TrafficMonitoring is found at ${trafficService.address}`);
        // In a production system i'd have proper communication back and forth here.
    } else {
        console.warn("Didn't find TrafficMonitoring service during discovery.");
    }
});
}, 3000); // wait 3 seconds

stream.on('end', () => {
    console.log("Service Discovery stream ended.");
});
