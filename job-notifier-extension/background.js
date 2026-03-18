// Poll backend every 5 seconds
const POLL_INTERVAL_MS = 5000;
const API_URL = 'http://localhost:3000/latest-job';

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
        // Call GET /latest-job AND force bypass browser cache!
        const response = await fetch(API_URL, { cache: 'no-store' });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Grab URL safely, whether it's under data.job.url or data.url directly
        const newJobUrl = data.job ? data.job.url : data.url;
        console.log("Polled API. Checked URL:", newJobUrl, "Data:", data);

        // Check if we received a valid job URL
        if (data.success && newJobUrl) {

            // Get the last stored URL from local storage to avoid duplicate notifications
            const store = await chrome.storage.local.get('lastJobUrl');
            console.log("Stored URL:", store);
            const lastJobUrl = store?.lastJobUrl;
            console.log("Last Job URL:", lastJobUrl);
            console.log("New Job URL:", newJobUrl);

            // If new job URL is different from last stored:
            if (newJobUrl !== lastJobUrl && newJobUrl) {
                console.log(`New job found! Notifying user: ${newJobUrl}`);

                // Generate a unique ID so Windows/Chrome NEVER suppress it as a duplicate!
                const notificationId = newJobUrl + "||" + Date.now();
                try {
                    chrome.notifications.create(notificationId, {
                        type: 'basic',
                        iconUrl: 'icon.png',
                        title: 'New Job Alert 🚀',
                        message: `New matching job found:\n${newJobUrl}`,
                        priority: 1,
                        requireInteraction: true // Keeps the popup alive until you click/close it
                    }, (createdId) => {
                        if (chrome.runtime.lastError) {
                            console.error("Critical Notification Error:", chrome.runtime.lastError.message);
                        } else {
                            console.log("Notification POPPED cleanly! ID:", createdId);
                        }
                    });
                    await chrome.storage.local.set({ lastJobUrl: newJobUrl });
                }
                catch (error) {
                    console.error("Error showing notification:", error);
                }
                // Show Chrome notification


            }
            // Store last URL safely so it doesn't notify again immediately next poll.

        }
    } catch (error) {
        console.error('Error fetching latest job:', error);
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
