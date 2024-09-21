const device = require('./Device');

module.exports = {
    device: {
        id: device.id,
        arch: device.os.arch,
        os: device.os.platform,
        hostname: device.os.hostname,
        ip: device.network.address,
        cidr: device.network.cidr,
        subnet: device.network.subnet,
    },

    user: {
        username: device.user.username,
        cwd: process.cwd(),
        localISOTime: new Date().toISOString(),
    },
};