// bringing in spawn so I can run each service in its own little Node.js process
const { spawn } = require('child_process');
const path = require('path');

/* tiny utility function to launch a service as its own process
this is really just so each part of the project (Parking / Traffic / Discovery) feels 
like its own separate running service like a real world distributed system */
function runService(label, scriptPath) {
    // create the full path to the service file
    const fullPath = path.join(__dirname, scriptPath);

    // use spawn
    const service = spawn('node', [fullPath]);

     // capture any normal output from the service and prefix it with its label
    service.stdout.on('data', (data) => {
        console.log(`[${label}] ${data}`);
    });

    // capture any errors from the service and make sure they stand out (maybe outside the correct scope of the project)
    service.stderr.on('data', (data) => {
        console.error(`[${label} ERROR] ${data}`);
    });

    // if the service ends for any reason, show the exit code
    service.on('close', (code) => {
        console.log(`[${label}] exited with code ${code}`);
    });
}

/* Start the Service Discovery service first because if that isnt running and 
it starts looking for the other services it will fallover as others try to register with it.*/
runService('servicediscovery', 'service_discovery/index.js');

/* then give it 3 seconds of breathing room so it has time to get going before
I try to boot Smart Parking and Traffic Monitoring — these depend on Discovery being up */
setTimeout(() => {
    runService('SmartParking', 'smart_parking/index.js');
    runService('smarttraffic', 'traffic_monitoring/index.js');
}, 3000); // wait 3 seconds 


/* Note: In a real-world production system I'd probably use something like PM2 here
instead of spawn — it's a process manager for Node.js that can automatically restart
crashed services, handle logs properly, and even let you run services as background daemons.

But for the scope of this project i wasnt going to that effort.
*/



