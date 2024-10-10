import ollama from 'ollama';


function getContextUrl() {
    return JSON.stringify({ url: 'universe://foo/bar/baz' });
}

function getDateTime(type) {
    const now = new Date();
    if (type === 'date') {
        return now.toISOString().slice(0, 10);
    } else if (type === 'time') {
        return now.toISOString().slice(11, 16);
    }
    return now.toISOString();
}

// Simulates an API call to get flight times
// In a real application, this would fetch data from a live database or API
function getFlightTimes(args) {
    // this is where you would validate the arguments you received
    const departure = args.departure;
    const arrival = args.arrival;

    const flights = {
        'NYC-LAX': { departure: '08:00 AM', arrival: '11:30 AM', duration: '5h 30m' },
        'LAX-NYC': { departure: '02:00 PM', arrival: '10:30 PM', duration: '5h 30m' },
        'LHR-JFK': { departure: '10:00 AM', arrival: '01:00 PM', duration: '8h 00m' },
        'JFK-LHR': { departure: '09:00 PM', arrival: '09:00 AM', duration: '7h 00m' },
        'CDG-DXB': { departure: '11:00 AM', arrival: '08:00 PM', duration: '6h 00m' },
        'DXB-CDG': { departure: '03:00 AM', arrival: '07:30 AM', duration: '7h 30m' }
    };

    const key = `${departure}-${arrival}`.toUpperCase();
    return JSON.stringify(flights[key] || { error: 'Flight not found' });
}

async function run(model) {
    // Initialize conversation with a user query
    let messages = [
        { role: 'system', content: `Be as concise as possible, never comment anything, if you call a function, just output its output data, never add anything to the output! never mention the funciton name. The current canvas context url is "universe://foo/bar/baz"` },
        { role: 'user', content: 'Whats the current canvas context url?' }];

    // First API call: Send the query and function description to the model
    const response = await ollama.chat({
        model: model,
        temperature: 0,
        messages: messages,
        tools: [
            {
                type: 'function',
                function: {
                    name: 'get_flight_times',
                    description: 'Get the flight times between two cities',
                    parameters: {
                        type: 'object',
                        properties: {
                            departure: {
                                type: 'string',
                                description: 'The departure city (airport code)',
                            },
                            arrival: {
                                type: 'string',
                                description: 'The arrival city (airport code)',
                            },
                        },
                        required: ['departure', 'arrival'],
                    },
                },
            }
        ],
    })

    // Add the model's response to the conversation history
    messages.push(response.message);

    // Check if the model decided to use the provided function
    if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
        console.log("The model didn't use the function. Its response was:");
        console.log(response.message.content);
        return;
    }

    // Process function calls made by the model
    if (response.message.tool_calls) {
        const availableFunctions = {
            get_flight_times: getFlightTimes,

        };

        console.log(response.message.tool_calls);
        for (const tool of response.message.tool_calls) {
            const functionToCall = availableFunctions[tool.function.name];
            const functionResponse = functionToCall(tool.function.arguments);
            // Add function response to the conversation
            messages.push({
                role: 'tool',
                content: functionResponse,
            });
        }
    }

    // Second API call: Get final response from the model
    const finalResponse = await ollama.chat({
        model: model,
        temperature: 0,
        messages: messages,
    });
    console.log(finalResponse.message.content);
}

run('llama3.1:latest').catch(error => console.error('An error occurred:', error));
