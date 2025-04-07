const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs'); // needed to load TLS cert + key

// Load the proto file
const PROTO_PATH = path.join(__dirname, '../../proto/smart_traffic.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const trafficProto = grpc.loadPackageDefinition(packageDef).smarttraffic;

// Store traffic reports
function StreamTraffic(call, callback) {
    let total = 0;
    let count = 0;
    const locationCounts = {};

    call.on('data', (update) => {
        const { location, congestionLevel } = update;

        console.log(`Received report from ${location}: level ${congestionLevel}`);

        total += congestionLevel;
        count++;

        locationCounts[location] = (locationCounts[location] || 0) + 1;
    });

    call.on('end', () => {
        const average = count > 0 ? total / count : 0;

        // Find most reported location
        let mostReportedLocation = 'N/A';
        let max = 0;
        for (const [loc, freq] of Object.entries(locationCounts)) {
            if (freq > max) {
                max = freq;
                mostReportedLocation = loc;
            }
        }

        callback(null, {
            averageCongestion: average,
            totalReports: count,
            mostReportedLocation: mostReportedLocation
        });
    });
}

// gRPC server setup
const server = new grpc.Server();
server.addService(trafficProto.TrafficMonitor.service, {
    StreamTraffic: StreamTraffic
});

// Load our self-signed TLS cert + key
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

const PORT = 'localhost:50053';
server.bindAsync(PORT, creds, () => {
    console.log(`Traffic Monitoring Service running securely on ${PORT}`);
    server.start();
});

/* Announcing service so discovery can acknowledge */
const discoveryProtoPath = path.join(__dirname, '../../proto/service_discovery.proto');
const discoveryDef = protoLoader.loadSync(discoveryProtoPath, {});
const discoveryProto = grpc.loadPackageDefinition(discoveryDef).servicediscovery;

// read cert
const caCert = fs.readFileSync(path.join(__dirname, '../../certificates/cert.pem'));

const discoveryClient = new discoveryProto.ServiceDiscovery(
    'localhost:50055',
    grpc.credentials.createSsl(caCert)
);

const stream = discoveryClient.RegisterService();

stream.write({
    serviceName: "TrafficMonitoring",
    serviceType: "traffic",
    address: "localhost:50053",
    status: "online"
});

stream.on('end', () => {
    console.log("Service Discovery stream ended.");
});
