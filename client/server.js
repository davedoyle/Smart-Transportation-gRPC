/*all proto-merge activity was done after a lecture where certain requirements
 were cleared up and service discovery was identified as a standalone service
 */


const express = require('express');
const path = require('path');
const app = express();
const port = 8080;
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load both proto files
const PARKING_PROTO_PATH = path.join(__dirname, '../proto/smart_parking.proto');
//const SPACES_PROTO_PATH = path.join(__dirname, '../proto/smart_parking_spaces.proto'); //obsolete, services called now in one proto!

const parkingDefinition = protoLoader.loadSync(PARKING_PROTO_PATH, {});
//const spacesDefinition = protoLoader.loadSync(SPACES_PROTO_PATH, {}); //obsolete as per above

const smartParkingProto = grpc.loadPackageDefinition(parkingDefinition).smartparking;
//const smartParkingSpacesProto = grpc.loadPackageDefinition(spacesDefinition).SmartParkingSpaces; //obsolete as per above

//Create two gRPC clients (one for each service)
const parkingClient = new smartParkingProto.SmartParking(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

/* obsolete after merge.
const spacesClient = new smartParkingProto.ParkingSpaces(
    'localhost:50052',
    grpc.credentials.createInsecure()
);
*/

app.use(express.json());


app.use(express.static(path.join(__dirname, 'gui')));


app.post('/checkPlate', (req, res) => {
    const plateNumber = req.body.plateNumber; 

    parkingClient.CheckPlate({ plateNumber: plateNumber }, (err, response) => {
        if (err) {
            console.error('gRPC Error:', err.message);
            res.status(500).json({ status: 'Error', details: err.message });
        } else {
            res.json({ status: response.status });
        }
    });
});


app.get('/parkingSpaces', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const call = parkingClient.streamSpaces({}); // Note the protoname camelcase! 

    call.on('data', (response) => {
        res.write(`data: ${JSON.stringify(response)}\n\n`);
    });

    call.on('end', () => {
        res.end();
    });

    call.on('error', (err) => {
        console.log('Stream error caught:', err.message); 
        res.end(); // Gracefully close connection
    });

    req.on('close', () => {
        call.cancel(); // Client closed browser/tab
    });
});


app.listen(port, () => {
    console.log(`GUI Server running at http://localhost:${port}`);
});
