// spawn to run each service in a separate process
const { spawn } = require('child_process');
const path = require('path');

// function launches a Node.js script as a child process
function runService(label, scriptPath) {
    // create the full path to the service file
    const fullPath = path.join(__dirname, scriptPath);

    // use spawn
    const service = spawn('node', [fullPath]);

    // when the service prints output display it in the terminal
    service.stdout.on('data', (data) => {
        console.log(`[${label}] ${data}`);
    });

    // if the service has an error show it clearly
    service.stderr.on('data', (data) => {
        console.error(`[${label} ERROR] ${data}`);
    });

    // when the service stops or crashes, show the exit code
    service.on('close', (code) => {
        console.log(`[${label}] exited with code ${code}`);
    });
}

// Start the Service Discovery service first
runService('servicediscovery', 'service_discovery/index.js');

// Then delay the others a bit to give it time to start
setTimeout(() => {
    runService('SmartParking', 'smart_parking/index.js');
    runService('smarttraffic', 'traffic_monitoring/index.js');
}, 3000); // wait 3 seconds 




