document.addEventListener('DOMContentLoaded', function() {
  // Load saved settings
  chrome.storage.sync.get([
    'trackingEnabled',
    'notificationsEnabled',
    'focusDuration'
  ], function(items) {
    document.getElementById('tracking-enabled').checked = items.trackingEnabled !== false;
    document.getElementById('notifications-enabled').checked = items.notificationsEnabled !== false;
    document.getElementById('focus-duration').value = items.focusDuration || 25;
  });

  // Save settings
  document.getElementById('save-settings').addEventListener('click', function() {
    const settings = {
      trackingEnabled: document.getElementById('tracking-enabled').checked,
      notificationsEnabled: document.getElementById('notifications-enabled').checked,
      focusDuration: parseInt(document.getElementById('focus-duration').value)
    };

    chrome.storage.sync.set(settings, function() {
      // Show success message
      const button = document.getElementById('save-settings');
      const originalText = button.textContent;
      button.textContent = 'Settings Saved!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  });
}); 