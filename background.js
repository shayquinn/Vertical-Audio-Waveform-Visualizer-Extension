// Background script for the extension

// Cross-browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Listen for installation
browserAPI.runtime.onInstalled.addListener(() => {
  console.log('Audio Waveform Visualizer extension installed');
  
  // Set default settings
  browserAPI.storage.sync.get([
    'visualizerEnabled',
    'hueRotation',
    'barCount',
    'barWidth'
  ], (data) => {
    const defaults = {
      visualizerEnabled: true,
      hueRotation: 0,
      barCount: 40,
      barWidth: 120
    };
    
    // Set any missing defaults
    const updates = {};
    for (const key in defaults) {
      if (data[key] === undefined) {
        updates[key] = defaults[key];
      }
    }
    
    if (Object.keys(updates).length > 0) {
      browserAPI.storage.sync.set(updates);
    }
  });
});

// Listen for messages from popup or content scripts
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  // Handle different message types
  switch (message.action) {
    case 'getSettings':
      browserAPI.storage.sync.get([
        'visualizerEnabled',
        'hueRotation',
        'barCount',
        'barWidth'
      ], (data) => {
        sendResponse(data);
      });
      return true; // Keep message channel open for async response
      
    case 'updateSettings':
      browserAPI.storage.sync.set(message.settings);
      // Broadcast to all tabs
      browserAPI.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'settingsUpdated',
              settings: message.settings
            }).catch(() => {
              // Tab might not have content script loaded
            });
          }
        });
      });
      break;
      
    case 'toggleVisualizer':
      browserAPI.storage.sync.set({ visualizerEnabled: message.enabled });
      // Broadcast to all tabs
      browserAPI.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'visualizerToggled',
              enabled: message.enabled
            }).catch(() => {
              // Tab might not have content script loaded
            });
          }
        });
      });
      break;
  }
});

// Handle tab updates to inject content script if needed
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    // Content script is automatically injected via manifest
    console.log('Tab updated:', tab.url);
  }
});