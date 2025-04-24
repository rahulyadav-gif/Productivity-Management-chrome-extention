// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Productivity Manager extension installed');
});

// Track tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      console.log('Tab changed:', tab.url);
      // Here you can add your productivity tracking logic
    }
  });
});

// Track navigation
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) { // Only track main frame
    console.log('Navigation completed:', details.url);
    // Here you can add your productivity tracking logic
  }
});

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
  // Here you can add your alarm handling logic
}); 