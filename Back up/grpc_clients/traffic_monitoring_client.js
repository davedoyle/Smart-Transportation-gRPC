const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the proto
const PROTO_PATH = path.join(__dirname, '../../proto/smart_traffic.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const trafficProto = grpc.loadPackageDefinition(packageDefinition).smarttraffic;

// Create gRPC client
const client = new trafficProto.TrafficMonitoring(
  'localhost:50053',
  grpc.credentials.createInsecure()
);

// Simulated congestion reports (local locations hardcoded for testing)
const reports = [
  { location: 'Togher', congestionLevel: 5 },
  { location: 'Wilton', congestionLevel: 5 },
  { location: 'Bishopstown', congestionLevel: 5 },
  { location: 'Togher', congestionLevel: 5 },
  { location: 'Ballyphehane', congestionLevel: 5 }
];

// Start the client streaming call
const call = client.StreamTraffic((err, summary) => {
  if (err) {
    console.error('Error receiving summary:', err.message);
  } else {
    console.log('\nSummary Received:');
    console.log(`  Avg Congestion: ${summary.averageCongestion.toFixed(2)}`);
    console.log(`  Total Reports: ${summary.totalReports}`);
    console.log(`  Most Reported Location: ${summary.mostReportedLocation}`);
  }
});

// Stream each report to the server
reports.forEach(report => {
  console.log(`Sending: ${report.location} - Level ${report.congestionLevel}`);
  call.write(report);
});

// Finish streaming
call.end();
