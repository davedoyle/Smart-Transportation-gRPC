const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs'); // needed for TLS cert loading

// Load the proto file for Service Discovery
const PROTO_PATH = path.join(__dirname, '../../proto/service_discovery.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const serviceDiscoveryProto = grpc.loadPackageDefinition(packageDef).servicediscovery;

// Just using a simple in-memory object to track services
const registeredServices = new Map();

// This handles the bi-directional stream where services register themselves
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

// function to list off the services
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

// Bring in our TLS certs for secure connection
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

/* the next piece of code wasnt needed but i added it to allow the service to appear in the gui, why would it register with itself! */
const discoveryProtoPath = path.join(__dirname, '../../proto/service_discovery.proto');
const discoveryDef = protoLoader.loadSync(discoveryProtoPath, {});
const discoveryProto = grpc.loadPackageDefinition(discoveryDef).servicediscovery;

//read the cert
const caCert = fs.readFileSync(path.join(__dirname, '../../certificates/cert.pem'));

const selfClient = new discoveryProto.ServiceDiscovery(
    'localhost:50055',
    grpc.credentials.createSsl(caCert) // TLS connection now, to match our server
);

const stream = selfClient.RegisterService();

stream.write({
    serviceName: "ServiceDiscovery",
    serviceType: "discovery",
    address: "localhost:50055",
    status: "online"
});

stream.on('end', () => {
    console.log("Self-registration stream ended.");
});
