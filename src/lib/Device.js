'use strict';

// Utils
const { machineIdSync } = require('node-machine-id');
const os = require('os');
const ip = require('ip');
const { familySync } = require('detect-libc');

class Device {
    constructor() {
        this.id = machineIdSync(true).substr(0, 11);
        this.endianness = os.endianness();
        //this.type = 'desktop';
        this.os = {
            arch: os.arch(),
            platform: os.platform(),
            release: os.release(),
            libc: familySync() || 'n/a',
            hostname: os.hostname(),
            homedir: os.homedir(),
            /*
        os.homedir()
        The value of homedir returned by os.userInfo() is provided by the operating system.
        This differs from the result of os.homedir(), which queries several environment variables
        for the home directory before falling back to the operating system response.
        */
        };

        this.network = getActiveNetworkConnection(false);
        this.network.subnet = ip.subnet(this.network.address, this.network.netmask).networkAddress;
        this.user = os.userInfo(); // Probably better to handle this on our own ?
    }

    get ip() { return this.network.address; }
    get hostname() { return this.network.hostname; }
    get cidr() { return this.network.cidr; }
    get mac() { return this.network.mac; }
    get activeInterface() { return this.network; }
}

// Singleton
module.exports = new Device();

// Utils
function getActiveNetworkConnection(returnIPOnly = true) {
    let nets = require('os').networkInterfaces();
    // TODO: Fix me
    for (let i in nets) {
        var candidate = nets[i].filter(function (item) {
            return item.family === 'IPv4' && !item.internal;
        })[0];

        if (candidate) {
            return (returnIPOnly) ? candidate.address : candidate;
        }
    }

    return (returnIPOnly) ?
        '127.0.0.1' :
        {
            address: '127.0.0.1',
            netmask: '255.0.0.0',
            family: 'IPv4',
            mac: '00:00:00:00:00:00',
            internal: true,
            cidr: '127.0.0.1/8',
        };
}
