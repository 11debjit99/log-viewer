require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const { CloudWatchLogsClient, FilterLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const client = new CloudWatchLogsClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const fetchLogs = async (logGroupName, startDate, endDate) => {
    const startTime = new Date(startDate).getTime();
    
    const endDateObject = new Date(endDate);
    endDateObject.setHours(23, 59, 59, 999);
    const endTime = endDateObject.getTime();

    console.log('Fetching logs with start time:', startTime, 'and end time:', endTime);

    let allLogs = [];
    let nextToken;
    let totalRequests = 0;

    do {
        const params = {
            logGroupName,
            startTime,
            endTime,
            nextToken,
            limit: 10000,
        };

        const command = new FilterLogEventsCommand(params);

        try {
            totalRequests++;
            const data = await client.send(command);

            if (data.events.length > 0) {
                const logs = data.events.map(event => {
                    const timestamp = event.timestamp;
                    const message = event.message;
                    const batchIdMatch = message.match(/[a-f0-9-]{36}/);
                    const batchId = batchIdMatch ? batchIdMatch[0] : null;
                    const logStream = event.logStreamName;
                    const status = logStream.includes('error') ? 'failure' : 'success';

                    const dateTimeMatch = message.match(/(\d{1,2}\/\d{1,2}\/\d{4},?\s*\d{1,2}\s*(?:AM|PM)?)/i);
                    const extractedDateTime = dateTimeMatch ? new Date(dateTimeMatch[0]) : new Date(timestamp);

                    return { logGroupName, timestamp, message, batchId, logStream, status, extractedDateTime };
                });

                allLogs = [...allLogs, ...logs];
            }

            nextToken = data.nextToken;

        } catch (err) {
            console.error('Error fetching logs from CloudWatch Logs:', err);
            throw err;
        }
    } while (nextToken);

    return allLogs;
};

app.get('/api/logs', async (req, res) => {
    try {
        const { logGroup, startDate, endDate } = req.query;

        if (!logGroup || !startDate || !endDate) {
            return res.status(400).json({ error: 'logGroup, startDate, and endDate are required' });
        }

        const logs = await fetchLogs(logGroup, startDate, endDate);
        res.json({ logs });

    } catch (err) {
        console.error('Error fetching logs:', err);
        res.status(500).json({ error: 'Error fetching logs', details: err.message });
    }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
