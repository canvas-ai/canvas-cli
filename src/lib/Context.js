const device = require('./Device');
module.exports = {
    device: {
        id: device.id,
        os: device.os.platform,
        ip: device.network.address,
        cidr: device.network.cidr,
        subnet: device.network.subnet,
    },
    user: {
        username: device.user.username,
        cwd: process.cwd(),
        localISOTime: new Date().toISOString(),
    },
    generateContextArray: () => {
        return [
            'client/app/canvas-cli',
            `client/id/${device.id}`,
            `client/os/${device.os}`,
            `client/os/arch/${device.arch}`,
            `client/os/user/${device.user.username}`,
            `client/network/subnet/${device.subnet}`,
        ]
    }
};
