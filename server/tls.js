// one time file to generate certs for the project
const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

// Keeping it basic: CN = localhost, 1-year validity
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

const certsPath = path.join(__dirname, '../certificates');
if (!fs.existsSync(certsPath)) {
    fs.mkdirSync(certsPath);
}

fs.writeFileSync(path.join(certsPath, 'cert.pem'), pems.cert);
fs.writeFileSync(path.join(certsPath, 'key.pem'), pems.private);

console.log('TLS certificate and key created in /certificates');
