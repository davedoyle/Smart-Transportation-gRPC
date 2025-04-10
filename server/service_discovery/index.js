const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs'); // needed for TLS cert loading

/* Load the proto file so I can work with it — same deal as everywhere else,
this basically tells the frontend world what this service looks like and what to expect. */
const PROTO_PATH = path.join(__dirname, '../../proto/service_discovery.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const serviceDiscoveryProto = grpc.loadPackageDefinition(packageDef).servicediscovery;

// Using a plain old in-memory Map to track any services that register themselves.
// In real life this would probably be a database or registry or something more robust.
const registeredServices = new Map();

// This is the heart of Service Discovery —
// any other service talks to this and says:
// "Hey, here who I am and where I live"
function RegisterService(call) {
    console.log('A service has connected to register...');

    call.on('data', (serviceInfo) => {
        const { serviceName, serviceType, address, status } = serviceInfo;

        console.log(`Received: ${serviceName} (${serviceType}) @ ${address} - Status: ${status}`);

        // Store or update the info in memory
        registeredServices.set(serviceName, { serviceType, address, status });

        // Reply back to the service
        const response = {
            message: `Hello ${serviceName}, you're now registered.`,
            timestamp: new Date().toISOString()
        };

        call.write(response);
    });

    // Handle when the service finishes the stream
    call.on('end', () => {
        console.log('Service stream ended.');
        call.end();
    });

    call.on('error', (err) => {
        console.error('Stream error:', err.message);
    });
}

// function to list everyone who's registered with Service Discovery
function ListServices(call, callback) {
    const services = [];

    registeredServices.forEach((value, key) => {
        services.push({
            serviceName: key,
            serviceType: value.serviceType,
            address: value.address,
            status: value.status
        });
    });

    callback(null, { services });
}

// Set up the gRPC server and bind the service
const server = new grpc.Server();
server.addService(serviceDiscoveryProto.ServiceDiscovery.service, {
    RegisterService: RegisterService,
    ListServices
});

// Load my self-signed certs — just like all my other services
// keeping the gRPC connection secure even if this is all running locally.
const certPath = path.join(__dirname, '../../certificates/cert.pem');
const keyPath = path.join(__dirname, '../../certificates/key.pem');

const creds = grpc.ServerCredentials.createSsl(
    null,
    [{
        cert_chain: fs.readFileSync(certPath),
        private_key: fs.readFileSync(keyPath)
    }],
    false
);

const PORT = 'localhost:50055';
server.bindAsync(PORT, creds, () => {
    console.log(`Service Discovery is running securely on ${PORT}`);
    server.start();
});

/* This bit technically isn't needed — a Service Discovery system 
registering itself is wrong — but I added it so the GUI 
could see this service too when listing registered services, felt it was part of the requirements */
const discoveryProtoPath = path.join(__dirname, '../../proto/service_discovery.proto');
const discoveryDef = protoLoader.loadSync(discoveryProtoPath, {});
const discoveryProto = grpc.loadPackageDefinition(discoveryDef).servicediscovery;


const caCert = fs.readFileSync(path.join(__dirname, '../../certificates/cert.pem'));

const selfClient = new discoveryProto.ServiceDiscovery(
    'localhost:50055',
    grpc.credentials.createSsl(caCert) // TLS connection now, to match our server
);

const stream = selfClient.RegisterService();

// Tell my own service "I'm online"...
stream.write({
    serviceName: "ServiceDiscovery",
    serviceType: "discovery",
    address: "localhost:50055",
    status: "online"
});

stream.on('end', () => {
    console.log("Self-registration stream ended.");
});
