
const http = require('http');
const dns = require('dns');
const axios = require('axios');

// Force DNS resolution to use IPv4 first.
dns.setDefaultResultOrder('ipv4first');

const URBANTZ_API_URL = "https://api.urbantz.com/v2/";

async function fetchUrbantzData(apiKey, endpoint, params) {
  const url = `${URBANTZ_API_URL}${endpoint}`;
  
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    params: new URLSearchParams(params), // Axios handles params safely
    timeout: 30000, // 30 seconds timeout
  };

  try {
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
            return { error: 'Failed to fetch from Urbantz API: Request timed out after 30 seconds.' };
        }
        return { error: `API request failed with status ${error.response?.status}: ${JSON.stringify(error.response?.data)}` };
    }
    return { error: `Failed to fetch from Urbantz API: ${error.message}` };
  }
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const request = JSON.parse(body);

                if (request.method === 'mcp.getTools') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        result: {
                            tools: [
                                {
                                    "function": {
                                        "name": "urbantz:fetch_data",
                                        "description": "Fetches data from a specified Urbantz API endpoint using Axios.",
                                        "parameters": {
                                            "type": "object",
                                            "properties": {
                                                "apiKey": { "type": "string", "description": "The API key for Urbantz." },
                                                "endpoint": { "type": "string", "description": "The API endpoint to call (e.g., 'rounds', 'tasks')." },
                                                "params": { "type": "string", "description": "A URL-encoded string of parameters (e.g., 'date=2024-07-26')." }
                                            },
                                            "required": ["apiKey", "endpoint"]
                                        }
                                    }
                                }
                            ]
                        }
                    }));
                } else if (request.method === 'mcp.runTool') {
                    if (request.params.tool.name === 'urbantz:fetch_data') {
                        const { apiKey, endpoint, params } = request.params.tool.arguments;
                        const data = await fetchUrbantzData(apiKey, endpoint, params);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            result: {
                                "tool_result": {
                                    "tool_name": "urbantz:fetch_data",
                                    "stdout": JSON.stringify(data, null, 2)
                                }
                            }
                        }));
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Tool not found' }));
                    }
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid MCP method' }));
                }
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
    console.error(`Urbantz MCP Server listening on http://localhost:${PORT}`);
});
