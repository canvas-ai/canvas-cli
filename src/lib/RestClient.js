const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ClientConnector {

    #sessionCookie = null;


    constructor() {


    }

    async getContext() {
        return {

        }
    }

    async login(username, password) {
        return this;
        const { protocol, host, port, baseUrl } = config.transports.rest;
        const url = `${protocol}://${host}:${port}${baseUrl}/login`;

        const clientContext = {
            os: deviceManager.getOS(),
            osVersion: deviceManager.getOSVersion(),
            deviceID: deviceManager.getDeviceID(),
            osUser: deviceManager.getOSUser(),
            nw: deviceManager.getNW(),
        };

        try {
            const response = await axios.post(url, {
                username,
                password,
                clientContext,
                requestTime: new Date().toISOString(),
            });

            if (response.data.sessionCookie) {
                saveSessionCookie(response.data.sessionCookie);
                console.log('Login successful');
            } else {
                console.error('Login failed: No session cookie received');
            }
        } catch (error) {
            console.error('Login failed:', error.response ? error.response.data : error.message);
        }
    }

    async logout() {
        const result = await makeRequest('POST', '/logout');
        if (result && result.success) {
            fs.unlinkSync(SESSION_COOKIE_PATH);
            console.log('Disconnected successfully');
        } else {
            console.log('Disconnect failed');
        }
    }

    async makeRequest(method, endpoint, data = null) {
        const { protocol, host, port, baseUrl, timeout } = config.transports.rest;
        const url = `${protocol}://${host}:${port}${baseUrl}${endpoint}`;

        const sessionCookie = getSessionCookie();
        if (!sessionCookie) {
            console.error('Not logged in. Please login first.');
            return;
        }

        try {
            const response = await axios({
                method,
                url,
                data,
                headers: {
                    'Cookie': sessionCookie,
                    'X-Request-Time': new Date().toISOString(),
                },
                timeout,
            });

            return response.data;
        } catch (error) {
            console.error('Request failed:', error.response ? error.response.data : error.message);
        }
    }

    async getSessionCookie() {
        try {
            const data = await fs.readFile(SESSION_COOKIE_PATH, 'utf8');

            if (!data) {
                console.warn('Session cookie file is empty');
                return null;
            }

            const parsedData = JSON.parse(data);

            if (typeof parsedData !== 'object' || parsedData === null) {
                console.error('Invalid session cookie format');
                return null;
            }

            // Check if the cookie has expired
            if (parsedData.expiresAt && new Date(parsedData.expiresAt) < new Date()) {
                console.warn('Session cookie has expired');
                return null;
            }

            return parsedData;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn('Session cookie file not found');
            } else if (error instanceof SyntaxError) {
                console.error('Error parsing session cookie JSON:', error.message);
            } else {
                console.error('Error reading session cookie:', error.message);
            }
            return null;
        }
    }

    async saveSessionCookie(sessionCookie = this.#sessionCookie) {
        // Ensure expiresAt is a valid date
        if (sessionCookie.expiresAt) {
            sessionCookie.expiresAt = new Date(sessionCookie.expiresAt).toISOString();
        }

        const cookieData = JSON.stringify(sessionCookie, null, 2);

        try {
            // Ensure the directory exists
            await fs.mkdir(path.dirname(SESSION_COOKIE_PATH), { recursive: true });

            // Write the file
            await fs.writeFile(SESSION_COOKIE_PATH, cookieData, 'utf8');
            console.log('Session cookie saved successfully');
        } catch (error) {
            console.error('Error saving session cookie:', error.message);
            throw error;
        }
    }

}

module.exports = ClientConnector;
