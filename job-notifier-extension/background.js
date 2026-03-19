// Poll backend every 5 seconds
const POLL_INTERVAL_MS = 5000;
const API_URL = 'https://real-job-trakcer.onrender.com/latest-job';

// Use chrome.alarms for Manifest V3 (setInterval is killed by Chrome!)
chrome.alarms.create('job-poll-alarm', { periodInMinutes: 0.1 }); // ~6 seconds in developer mode

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'job-poll-alarm') {
        console.log("Alarm fired! Checking for jobs...");
        checkForNewJobs();
    }
});

// Also check right away when the service worker starts


async function checkForNewJobs() {
    try {
        const response = await fetch(API_URL, { cache: 'no-store' });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const jobs = data.jobs || []; // array of job URLs

        if (data.success && jobs.length > 0) {

            const store = await chrome.storage.local.get('seenJobs');
            let seenJobs = store.seenJobs || [];

            console.log("Seen Jobs:", seenJobs);
            console.log("Incoming Jobs:", jobs);

            for (const jobUrl of jobs) {

                if (!seenJobs.includes(jobUrl)) {

                    console.log("New Job Found:", jobUrl);

                    const notificationId = jobUrl + "||" + Date.now();

                    chrome.notifications.create(notificationId, {
                        type: 'basic',
                        iconUrl: 'icon.png',
                        title: 'New Job Alert 🚀',
                        message: `New job:\n${jobUrl}`,
                        priority: 1,
                        requireInteraction: true
                    });

                    // mark as seen
                    seenJobs.push(jobUrl);
                }
            }

            // save updated list
            await chrome.storage.local.set({ seenJobs });

        }

    } catch (error) {
        console.error('Error fetching jobs:', error);
    }
}

// On Notification Click:
// Open the job URL in a new Chrome tab
chrome.notifications.onClicked.addListener((notificationId) => {
    // We embedded the URL directly into the ID before the "||" splitter!
    if (notificationId.includes('||')) {
        const urlToOpen = notificationId.split('||')[0];

        chrome.tabs.create({ url: urlToOpen });

        // Clear notification after interaction
        chrome.notifications.clear(notificationId);
    }
});
