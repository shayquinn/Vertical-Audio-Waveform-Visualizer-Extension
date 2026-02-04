// Audio waveform visualizer for web pages
let canvas, ctx;
let audioContext;
let analyser;
let audioSource;
let javascriptNode;
let frequencyData;
let animationId;

// Settings cache to avoid repeated storage access
let settingsCache = {
  visualizerEnabled: true,
  hueRotation: 0,
  barCount: 40,
  barWidth: 120
};

// Cached values for calculations
let cachedBarWidth, cachedBarSpacing, cachedMaxBarHeight;

// Throttle for performance
let lastRenderTime = 0;
const renderInterval = 1000 / 30; // ~30fps

// Initialize the visualizer
async function initVisualizer() {
  try {
    // Get settings from storage
    const storedSettings = await browser.storage.sync.get([
      'visualizerEnabled',
      'hueRotation',
      'barCount',
      'barWidth'
    ]);
    
    // Merge with defaults
    settingsCache = {
      visualizerEnabled: storedSettings.visualizerEnabled ?? true,
      hueRotation: storedSettings.hueRotation ?? 0,
      barCount: storedSettings.barCount ?? 40,
      barWidth: storedSettings.barWidth ?? 120
    };
    
    if (!settingsCache.visualizerEnabled) return;
    
    // Create canvas element
    canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '10px';
    canvas.style.right = '10px';
    canvas.style.zIndex = '10000';
    canvas.style.pointerEvents = 'auto';
    canvas.width = 200;
    canvas.height = 100;
    document.body.appendChild(canvas);
    
    ctx = canvas.getContext('2d');
    
    // Initialize cached dimensions
    updateCachedDimensions();
    
    // Start audio analysis
    setupAudioAnalysis();
    
    // Listen for setting changes
    chrome.runtime.onMessage.addListener(handleMessage);
  } catch (error) {
    console.error('Error initializing visualizer:', error);
  }
}

// Update cached dimensions based on settings
function updateCachedDimensions() {
  const totalWidth = settingsCache.barWidth;
  cachedBarWidth = Math.max(2, totalWidth / settingsCache.barCount * 0.8);
  cachedBarSpacing = Math.max(1, totalWidth / settingsCache.barCount * 0.2);
  cachedMaxBarHeight = canvas.height * 0.8;
}

// Set up audio analysis
async function setupAudioAnalysis() {
  try {
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create analyzer node
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    
    // Create audio source from media elements
    const mediaElements = document.querySelectorAll('audio, video');
    if (mediaElements.length > 0) {
      const mediaElement = mediaElements[0];
      audioSource = audioContext.createMediaElementSource(mediaElement);
      audioSource.connect(analyser);
      analyser.connect(audioContext.destination);
      
      // Create script processor for frequency data
      javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);
      
      // Initialize frequency data array
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      
      // Start rendering
      renderLoop();
    }
  } catch (error) {
    console.error('Error setting up audio analysis:', error);
  }
}

// Main rendering loop using requestAnimationFrame
function renderLoop(timestamp) {
  if (!settingsCache.visualizerEnabled || !ctx) {
    cancelAnimationFrame(animationId);
    return;
  }
  
  // Throttle rendering
  if (timestamp - lastRenderTime >= renderInterval) {
    drawWaveform();
    lastRenderTime = timestamp;
  }
  
  animationId = requestAnimationFrame(renderLoop);
}

// Draw the waveform
function drawWaveform() {
  if (!ctx || !frequencyData) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Get current frequency data
  analyser.getByteFrequencyData(frequencyData);
  
  // Calculate bar positions
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // Draw bars
  for (let i = 0; i < settingsCache.barCount; i++) {
    const value = frequencyData[i % frequencyData.length];
    const barHeight = (value / 255) * cachedMaxBarHeight;
    
    // Calculate x position
    let x;
    if (i < settingsCache.barCount / 2) {
      // Left side
      x = centerX - (settingsCache.barCount / 2 - i) * (cachedBarWidth + cachedBarSpacing);
    } else {
      // Right side
      x = centerX + (i - settingsCache.barCount / 2) * (cachedBarWidth + cachedBarSpacing);
    }
    
    // Calculate color with hue rotation
    const hue = (settingsCache.hueRotation + (i / settingsCache.barCount) * 360) % 360;
    ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
    
    // Draw bar vertically centered
    ctx.fillRect(x, centerY - barHeight / 2, cachedBarWidth, barHeight);
  }
}

// Handle messages from background or popup
function handleMessage(message, sender, sendResponse) {
  switch (message.action) {
    case 'settingsUpdated':
      Object.assign(settingsCache, message.settings);
      updateCachedDimensions();
      break;
      
    case 'visualizerToggled':
      settingsCache.visualizerEnabled = message.enabled;
      if (message.enabled) {
        if (!canvas) initVisualizer();
      } else {
        if (canvas) {
          canvas.remove();
          canvas = null;
          ctx = null;
        }
      }
      break;
      
    case 'toggleVisualizer':
      settingsCache.visualizerEnabled = message.enabled;
      if (message.enabled) {
        if (!canvas) initVisualizer();
      } else {
        if (canvas) {
          canvas.remove();
          canvas = null;
          ctx = null;
        }
      }
      break;
  }
}

// Check for audio elements periodically
function checkForAudio() {
  if (settingsCache.visualizerEnabled) {
    const mediaElements = document.querySelectorAll('audio, video[autoplay], video[src]');
    if (mediaElements.length > 0) {
      // If we have an existing audio context, disconnect old source
      if (audioSource) {
        audioSource.disconnect();
      }
      
      // Connect to first available media element
      const mediaElement = Array.from(mediaElements).find(el => !el.paused) || mediaElements[0];
      audioSource = audioContext.createMediaElementSource(mediaElement);
      audioSource.connect(analyser);
    }
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisualizer);
} else {
  initVisualizer();
}

// Periodically check for new audio elements
setInterval(checkForAudio, 1000);