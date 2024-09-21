const axios = require('axios');
const debug = require('debug')('canvas:cli:rest');

class ClientConnector {
    #config = null;
    #token = null;

    constructor(options) {
        if (!options.connection) {
            throw new Error('Connection object is required');
        }

        this.#config = options.connection;
        this.isConnected = false;

        // Temporary fix
        this.#token = this.#config.auth.token;

    }

    async connect(clientContext) {
        const { protocol, host, port, baseUrl } = this.#config;
        const url = `${protocol}://${host}:${port}${baseUrl}/login`;

        try {
            const response = await axios.post(url, {
                clientContext,
                requestTime: new Date().toISOString(),
            });

            if (response.data.token) {
                this.#token = response.data.token;
            } else {
                console.error('Login failed: No token received');
                return false;
            }
        } catch (error) {
            console.error('Login failed:', error.response ? error.response.data : error.message);
            return false;
        }

        debug('Login successful');
        this.isConnected = true;
        return this;
    }

    disconnect() {
        if (!this.isConnected) {
            console.error('Not connected');
            return false;
        }

        this.#token = null;
        this.isConnected = false;
        console.log('Disconnected successfully');
        return true;
    }

    status() {
        return this.isConnected ? 'Connected' : 'Disconnected';
    }

    async makeRequest(method, endpoint, data = null) {
        const { protocol, host, port, baseUrl, timeout = 3600 } = this.#config;
        const url = `${protocol}://${host}:${port}${baseUrl}${endpoint}`;

        if (!this.#token) {
            console.error('Not logged in. Please login first.');
            return;
        }

        try {
            const response = await axios({
                method,
                url,
                data,
                headers: {
                    'Authorization': `Bearer ${this.#token}`,
                    'X-Request-Time': new Date().toISOString(),
                },
                timeout,
            });

            return response.data;
        } catch (error) {
            console.error('Request failed:', error.response ? error.response.data : error.message);
        }
    }
}

module.exports = ClientConnector;
