const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs'); // needed to load TLS cert + key

/* Load the proto file so I can work with it, this is vastly different to how i work day to day with 
asp.net, how i interpreted all this is, asp.net and c# backend know all about each other, where as here the proto's are essentially for the
frontend to know the backend exists and what to expect*/
const PROTO_PATH = path.join(__dirname, '../../proto/smart_traffic.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const trafficProto = grpc.loadPackageDefinition(packageDef).smarttraffic;

/* gRPC function that handles traffic reports coming in from the GUI
the idea here is dead simple — gather a bunch of congestion reports,
do some basic maths, and throw back an average plus the most reported location */
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
console.log("Loaded services:", Object.keys(trafficProto));  
server.addService(trafficProto.TrafficMonitor.service, {
    StreamTraffic: StreamTraffic
});

// Load up my self-signed TLS cert & key
// just to keep everything nice and secure (even if it's all local)
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

// Announcing service so discovery can acknowledge so it knows TrafficMonitoring exists and is online
const discoveryProtoPath = path.join(__dirname, '../../proto/service_discovery.proto');
const discoveryDef = protoLoader.loadSync(discoveryProtoPath, {});
const discoveryProto = grpc.loadPackageDefinition(discoveryDef).servicediscovery;

// reading the cert here so I can connect securely to Service Discovery
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


// talking to smart_parrking just to hit the requirement as i missed it late in the development, time out to give a chance to start before looking
setTimeout(() => {
discoveryClient.ListServices({}, (err, response) => {
    if (err) {
        console.error("Failed to discover services:", err.message);
        return;
    }

    const parkingService = response.services.find(s => s.serviceName === 'SmartParking');

    if (parkingService) {
        console.log(`Found SmartParking at ${parkingService.address}`);
        // If this was production i'd do some further calls and communicate better
    } else {
        console.warn("Couldn't spot SmartParking during discovery.");
    }
});
}, 3000); // wait 3 seconds




stream.on('end', () => {
    console.log("Service Discovery stream ended.");
});
