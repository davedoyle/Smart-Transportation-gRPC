const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the proto file
const PROTO_PATH = path.join(__dirname, '../../proto/smart_traffic.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const trafficProto = grpc.loadPackageDefinition(packageDef).smarttraffic;

// Store traffic reports
function StreamTraffic(call, callback) {
    let total = 0;
    let count = 0;
    const locationCounts = {};

    call.on('data', (report) => {
        const { location, congestionLevel } = report;

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
server.addService(trafficProto.TrafficMonitoring.service, {
    StreamTraffic: StreamTraffic
});

const PORT = 'localhost:50053';
server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`Traffic Monitoring Service running on ${PORT}`);
    server.start();
});