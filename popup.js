// Cross-browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', function () {
  const toggleCheckbox = document.getElementById('toggleEnabled');
  const statusText = document.getElementById('statusText');
  const resetBtn = document.getElementById('resetBtn');
  const hueSlider = document.getElementById('hueSlider');
  const hueValue = document.getElementById('hueValue');
  const barsSlider = document.getElementById('barsSlider');
  const barsValue = document.getElementById('barsValue');
  const widthSlider = document.getElementById('widthSlider');
  const widthValue = document.getElementById('widthValue');

  // Debounce timers for each slider
  let hueUpdateTimer = null;
  let barsUpdateTimer = null;
  let widthUpdateTimer = null;
  const DEBOUNCE_DELAY = 50; // ms

  // Load saved settings
  browserAPI.storage.sync.get([
    'visualizerEnabled',
    'hueRotation',
    'barCount',
    'barWidth'
  ], function (data) {
    const enabled = data.visualizerEnabled !== undefined ? data.visualizerEnabled : true;
    toggleCheckbox.checked = enabled;
    updateStatus(enabled);

    const hue = data.hueRotation || 0;
    const bars = data.barCount || 40;
    const width = data.barWidth || 120;

    hueSlider.value = hue;
    hueValue.textContent = hue + 'deg';

    barsSlider.value = bars;
    barsValue.textContent = bars;

    widthSlider.value = width;
    widthValue.textContent = width + 'px';
  });

  // Set initial state on install
  browserAPI.storage.sync.get(['visualizerEnabled'], function (data) {
    if (data.visualizerEnabled === undefined) {
      browserAPI.storage.sync.set({ visualizerEnabled: true });
      toggleCheckbox.checked = true;
      updateStatus(true);
    }
  });

  // Toggle visualizer
  toggleCheckbox.addEventListener('change', function () {
    const enabled = this.checked;
    browserAPI.storage.sync.set({ visualizerEnabled: enabled });
    updateStatus(enabled);

    // Send message to content script
    browserAPI.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]?.id) {
        browserAPI.tabs.sendMessage(tabs[0].id, {
          action: 'toggleVisualizer',
          enabled: enabled
        }).catch(() => { });
      }
    });
  });

  // Reset button
  resetBtn.addEventListener('click', function () {
    hueSlider.value = 0;
    barsSlider.value = 40;
    widthSlider.value = 120;

    updateSliders();

    browserAPI.storage.sync.set({
      hueRotation: 0,
      barCount: 40,
      barWidth: 120
    });

    // Send reset and immediate update
    browserAPI.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]?.id) {
        // Send reset
        browserAPI.tabs.sendMessage(tabs[0].id, {
          action: 'resetSettings'
        }).catch(() => { });

        // Send immediate update with all settings
        browserAPI.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          settings: {
            hueRotation: 0,
            barCount: 40,
            barWidth: 120
          }
        }).catch(() => { });
      }
    });
  });

  // REAL-TIME SLIDER UPDATES WITH DEBOUNCING
  
  // Hue slider
  hueSlider.addEventListener('input', function () {
    const value = parseInt(this.value);
    hueValue.textContent = value + 'deg';
    
    // Clear previous timer
    if (hueUpdateTimer) clearTimeout(hueUpdateTimer);
    
    // Update storage immediately for persistence
    browserAPI.storage.sync.set({ hueRotation: value });
    
    // Debounce visualizer update
    hueUpdateTimer = setTimeout(() => {
      sendSingleUpdate('hueRotation', value);
    }, DEBOUNCE_DELAY);
  });

  // Bars slider
  barsSlider.addEventListener('input', function () {
    const value = parseInt(this.value);
    barsValue.textContent = value;
    
    if (barsUpdateTimer) clearTimeout(barsUpdateTimer);
    
    browserAPI.storage.sync.set({ barCount: value });
    
    barsUpdateTimer = setTimeout(() => {
      sendSingleUpdate('barCount', value);
    }, DEBOUNCE_DELAY);
  });

  // Width slider
  widthSlider.addEventListener('input', function () {
    const value = parseInt(this.value);
    widthValue.textContent = value + 'px';
    
    if (widthUpdateTimer) clearTimeout(widthUpdateTimer);
    
    browserAPI.storage.sync.set({ barWidth: value });
    
    widthUpdateTimer = setTimeout(() => {
      sendSingleUpdate('barWidth', value);
    }, DEBOUNCE_DELAY);
  });

  // Optional: Final update on change (when user releases slider)
  hueSlider.addEventListener('change', function () {
    if (hueUpdateTimer) clearTimeout(hueUpdateTimer);
    const value = parseInt(this.value);
    sendSingleUpdate('hueRotation', value);
  });

  barsSlider.addEventListener('change', function () {
    if (barsUpdateTimer) clearTimeout(barsUpdateTimer);
    const value = parseInt(this.value);
    sendSingleUpdate('barCount', value);
  });

  widthSlider.addEventListener('change', function () {
    if (widthUpdateTimer) clearTimeout(widthUpdateTimer);
    const value = parseInt(this.value);
    sendSingleUpdate('barWidth', value);
  });

  // Helper functions
  function updateStatus(enabled) {
    statusText.textContent = enabled ? 'ON' : 'OFF';
    statusText.className = enabled ? 'status-text status-on' : 'status-text status-off';
  }

  function updateSliders() {
    hueValue.textContent = hueSlider.value + 'deg';
    barsValue.textContent = barsSlider.value;
    widthValue.textContent = widthSlider.value + 'px';
  }

  // Send single setting update (optimized for real-time)
  function sendSingleUpdate(setting, value) {
    browserAPI.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]?.id) {
        const settings = {};
        settings[setting] = value;
        
        browserAPI.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          settings: settings
        }).catch(() => { });
      }
    });
  }

  // Legacy function for updating multiple settings at once
  function sendSettingsUpdate(changedSetting) {
    browserAPI.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]?.id) {
        const settings = {};
        
        if (!changedSetting || changedSetting === 'hueRotation') {
          settings.hueRotation = parseInt(hueSlider.value);
        }
        if (!changedSetting || changedSetting === 'barCount') {
          settings.barCount = parseInt(barsSlider.value);
        }
        if (!changedSetting || changedSetting === 'barWidth') {
          settings.barWidth = parseInt(widthSlider.value);
        }
        
        browserAPI.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          settings: settings
        }).catch(() => { });
      }
    });
  }

  // Listen for updates from content script (drag adjustments)
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updatePopupSliders') {
      console.log('Popup: Received drag update:', message);

      // Update sliders without triggering more messages
      hueSlider.value = message.hueRotation || 0;
      hueValue.textContent = (message.hueRotation || 0) + 'deg';

      barsSlider.value = message.barCount || 40;
      barsValue.textContent = message.barCount || '40';

      widthSlider.value = message.barWidth || 120;
      widthValue.textContent = (message.barWidth || 120) + 'px';

      // Save to storage (but don't send message back)
      browserAPI.storage.sync.set({
        hueRotation: message.hueRotation || 0,
        barCount: message.barCount || 40,
        barWidth: message.barWidth || 120
      });
    }
  });
});