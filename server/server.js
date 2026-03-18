const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Maintain latest job in memory
let latestJob = null;

// 1. POST /new-job
// Accept JSON: { "url": "job link" }
app.post('/new-job', (req, res) => {
    const { url } = req.body;
    
    // Validate request
    if (!url) {
        console.error('Failed to add job: URL is missing');
        return res.status(400).json({ success: false, error: 'URL is required' });
    }

    // Store the job data
    latestJob = { url, timestamp: new Date().toISOString() };
    console.log(`[${latestJob.timestamp}] New Job Received: ${url}`);
    
    // Return success response
    res.status(200).json({ success: true, message: 'Job added successfully' });
});

// 2. GET /latest-job
// Return latest stored job
app.get('/latest-job', (req, res) => {
    res.status(200).json({ success: true, job: latestJob });
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`🚀 Job Notifier Backend running at http://localhost:${PORT}`);
    console.log(`Waiting for jobs...`);
});
