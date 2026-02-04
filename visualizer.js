// Content script for Vertical Audio Waveform Visualizer Extension
// This script runs on all web pages and creates the audio visualization

(function () {
    'use strict';

    // Cross-browser API compatibility
    const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

    console.log('[Visualizer] Content script loaded');

    // Configuration defaults
    const DEFAULT_CONFIG = {
        barWidth: 120,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        smoothing: 0.8,
        numBars: 40,
        barSpacing: 2,
        barColor: '#00ff88',
        animationSpeed: 0.15,
        peakHold: true,
        peakDecay: 0.97,
        dragHueSensitivity: 0.5,
        dragBarSensitivity: 3,
        showDragInfo: true
    };

    // Current settings (will be loaded from chrome.storage)
    let CONFIG = { ...DEFAULT_CONFIG };
    let visualizerEnabled = true;
    let hueRotation = 0;
    let dynamicNumBars = DEFAULT_CONFIG.numBars;

    // Create visualization container
    const visualizerContainer = document.createElement('div');
    visualizerContainer.id = 'audioWaveformBar';
    Object.assign(visualizerContainer.style, {
        position: 'fixed',
        top: '0',
        right: '0',
        width: `${CONFIG.barWidth}px`,
        height: '100vh',
        zIndex: '10000',
        pointerEvents: 'auto',
        cursor: 'grab',
        backgroundColor: CONFIG.backgroundColor,
        borderLeft: `1px solid ${CONFIG.borderColor}`,
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 0',
        boxSizing: 'border-box',
        userSelect: 'none',
        touchAction: 'none'
    });



    // Track mouse position for bar hover effect (throttled)
    let mouseThrottleId = null;
    visualizerContainer.addEventListener('mousemove', (e) => {
        if (mouseThrottleId) return;
        mouseThrottleId = requestAnimationFrame(() => {
            const rect = visualizerContainer.getBoundingClientRect();
            hoverY = e.clientY - rect.top;
            mouseThrottleId = null;
        });
    });

    visualizerContainer.addEventListener('mouseleave', () => {
        hoverY = null;
    });

    visualizerContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            const rect = visualizerContainer.getBoundingClientRect();
            hoverY = e.touches[0].clientY - rect.top;
        }
    }, { passive: true });

    visualizerContainer.addEventListener('touchend', () => {
        hoverY = null;
    });

    // Create canvas for visualization
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    Object.assign(canvas.style, {
        width: '100%',
        height: '100%',
        display: 'block'
    });
    visualizerContainer.appendChild(canvas);

    // Audio context and analyzer
    let audioContext = null;
    let analyzer = null;
    let source = null;
    let dataArray = null;
    let animationFrameId = null;
    let isVisualizing = false;
    let activeMediaElement = null;

    // Peak tracking
    let peaks = new Array(CONFIG.numBars / 2).fill(0);

    // Mouse/touch hover tracking for bar brightness
    let hoverY = null;
    let hoveredBarIndex = null;  // <-- ADD THIS LINE
    let hoverBrightness = {};

    // Drag handling for interactive adjustments
    let isDragging = false;
    let dragStartY = 0;
    let dragStartX = 0;
    const MIN_BARS = 10;
    const MAX_BARS = 80;
    let settingsChanged = false;
    let dragIndicator = null;

    // Cache rotated colors for performance
    let cachedColors = {
        '#ff0080': null,
        '#8000ff': null,
        '#0080ff': null,
        '#00ff80': null,
        barColor: null
    };
    let lastHueRotation = null;



    // Load settings from browser storage
    function loadSettings() {
        browserAPI.storage.sync.get([
            'visualizerEnabled',
            'hueRotation',
            'barCount',
            'barWidth'
        ], function (data) {
            visualizerEnabled = data.visualizerEnabled !== false;
            hueRotation = data.hueRotation || 0;
            dynamicNumBars = data.barCount || DEFAULT_CONFIG.numBars;
            CONFIG.barWidth = data.barWidth || DEFAULT_CONFIG.barWidth;

            // Update container width
            visualizerContainer.style.width = `${CONFIG.barWidth}px`;

            console.log('[Visualizer] Settings loaded:', {
                enabled: visualizerEnabled,
                hue: hueRotation,
                bars: dynamicNumBars,
                width: CONFIG.barWidth
            });
        });
    }

    // Listen for settings updates from popup/background
    browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('[Visualizer] Message received:', message);

        switch (message.action) {
            case 'toggleVisualizer':
            case 'visualizerToggled':
                visualizerEnabled = message.enabled;
                if (!visualizerEnabled) {
                    visualizerContainer.style.display = 'none';
                    stopVisualization();
                } else {
                    // Check if media is playing
                    const anyPlaying = Array.from(document.querySelectorAll('audio, video'))
                        .some(media => !media.paused && !media.muted);
                    if (anyPlaying && activeMediaElement) {
                        visualizerContainer.style.display = 'flex';
                        startVisualization();
                    }
                }
                break;

            case 'updateSettings':
            case 'settingsUpdated':
                console.log('[Visualizer] updateSettings received:', message);

                if (message.settings) {
                    // Only update what was sent
                    if (message.settings.hueRotation !== undefined) {
                        hueRotation = message.settings.hueRotation;
                        console.log('[Visualizer] Hue updated to:', hueRotation);
                    }
                    if (message.settings.barCount !== undefined) {
                        dynamicNumBars = message.settings.barCount;
                        console.log('[Visualizer] Bars updated to:', dynamicNumBars);
                    }
                    if (message.settings.barWidth !== undefined) {
                        CONFIG.barWidth = message.settings.barWidth;
                        visualizerContainer.style.width = `${CONFIG.barWidth}px`;
                        console.log('[Visualizer] Width updated to:', CONFIG.barWidth);
                    }
                }
                break;

            case 'resetSettings':
                hueRotation = 0;
                dynamicNumBars = DEFAULT_CONFIG.numBars;
                CONFIG.barWidth = DEFAULT_CONFIG.barWidth;
                visualizerContainer.style.width = `${CONFIG.barWidth}px`;
                console.log('[Visualizer] Settings reset to defaults');
                break;
        }
    });

    // Resize canvas to match container
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        const newWidth = rect.width * dpr;
        const newHeight = rect.height * dpr;

        if (canvas.width !== newWidth || canvas.height !== newHeight) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.scale(dpr, dpr);
        }
    }

    // Initialize audio context and analyzer
    function initAudioContext() {
        if (audioContext) return;

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyzer = audioContext.createAnalyser();
            analyzer.fftSize = 256;
            analyzer.smoothingTimeConstant = CONFIG.smoothing;

            const bufferLength = analyzer.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            console.log('[Visualizer] Audio context initialized');
        } catch (error) {
            console.error('[Visualizer] Error initializing audio context:', error);
        }
    }

    // Connect audio element to analyzer
    function connectAudioElement(audioElement) {
        if (!visualizerEnabled) return;
        if (!audioContext) initAudioContext();
        if (!audioContext) return;

        try {
            if (source && audioElement.dataset.visualizerConnected === 'true') {
                console.log('[Visualizer] Already connected, starting visualization');
                startVisualization();
                return;
            }

            if (source) {
                try {
                    source.disconnect();
                } catch (e) {
                    console.log('[Visualizer] Could not disconnect previous source');
                }
            }

            source = audioContext.createMediaElementSource(audioElement);
            source.connect(analyzer);
            analyzer.connect(audioContext.destination);
            audioElement.dataset.visualizerConnected = 'true';
            console.log('[Visualizer] Audio connected successfully');

            startVisualization();
        } catch (error) {
            console.error('[Visualizer] Error connecting audio:', error);
            startVisualization();
        }
    }

    // Find all audio/video elements
    function findMediaElements() {
        const mediaElements = [];

        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(el => {
            if (!el.dataset.waveformConnected) {
                el.dataset.waveformConnected = 'true';
                mediaElements.push(el);
            }
        });

        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(el => {
            if (!el.dataset.waveformConnected) {
                el.dataset.waveformConnected = 'true';
                mediaElements.push(el);
            }
        });

        return mediaElements;
    }

    // Monitor for media playback
    function monitorMediaPlayback() {
        const mediaElements = findMediaElements();

        mediaElements.forEach(media => {
            media.removeEventListener('play', handlePlay);
            media.removeEventListener('pause', handlePause);
            media.removeEventListener('ended', handlePause);

            media.addEventListener('play', handlePlay);
            media.addEventListener('pause', handlePause);
            media.addEventListener('ended', handlePause);
        });
    }

    function handlePlay(event) {
        if (!visualizerEnabled) return;

        const media = event.target;
        console.log('[Visualizer] Media playing:', media.tagName, 'Muted:', media.muted);

        if (activeMediaElement && activeMediaElement !== media) {
            if (source) {
                try {
                    source.disconnect();
                } catch (e) { }
            }
            if (activeMediaElement.dataset) {
                activeMediaElement.dataset.visualizerConnected = 'false';
            }
        }

        activeMediaElement = media;

        if (!media.muted) {
            visualizerContainer.style.display = 'flex';
            connectAudioElement(media);
        }
    }

    function handlePause() {
        const anyPlaying = Array.from(document.querySelectorAll('audio, video'))
            .some(media => !media.paused && !media.muted);

        if (!anyPlaying) {
            stopVisualization();
            visualizerContainer.style.display = 'none';
            cleanupVisualizer();
        }
    }

    // Cleanup function
    function cleanupVisualizer() {
        console.log('[Visualizer] Cleaning up resources');
        stopVisualization();

        if (source) {
            try {
                source.disconnect();
            } catch (e) { }
            source = null;
        }

        if (analyzer) {
            try {
                analyzer.disconnect();
            } catch (e) { }
            analyzer = null;
        }

        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(() => { });
            audioContext = null;
        }

        dataArray = null;
        isVisualizing = false;
        activeMediaElement = null;
    }

    // Start visualization
    function startVisualization() {
        if (isVisualizing || !visualizerEnabled) return;
        isVisualizing = true;
        console.log('[Visualizer] Starting visualization');

        setTimeout(() => {
            resizeCanvas();
            draw();
        }, 10);
    }

    // Stop visualization
    function stopVisualization() {
        isVisualizing = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    // Helper function to rotate hue
    function rotateHue(hexColor, degrees) {
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        h = (h * 360 + degrees) % 360;
        if (h < 0) h += 360;
        h = h / 360;

        let r2, g2, b2;
        if (s === 0) {
            r2 = g2 = b2 = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r2 = hue2rgb(p, q, h + 1 / 3);
            g2 = hue2rgb(p, q, h);
            b2 = hue2rgb(p, q, h - 1 / 3);
        }

        const toHex = (x) => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return '#' + toHex(r2) + toHex(g2) + toHex(b2);
    }

    // Get rotated color with caching
    function getRotatedColor(hexColor) {
        if (hueRotation === lastHueRotation && cachedColors[hexColor]) {
            return cachedColors[hexColor];
        }

        if (hueRotation !== lastHueRotation) {
            Object.keys(cachedColors).forEach(key => {
                cachedColors[key] = null;
            });
            lastHueRotation = hueRotation;
        }

        cachedColors[hexColor] = rotateHue(hexColor, hueRotation);
        return cachedColors[hexColor];
    }

    // Helper to get brightness multiplier for a bar with smooth transition
    function getBarBrightness(barIndex) {
        const isHovered = (hoveredBarIndex === barIndex); // Only the exact bar being hovered
        const targetBrightness = isHovered ? 1.0 : 0.0; // 1.0 = pure white, 0.0 = original color

        if (!hoverBrightness[barIndex]) {
            hoverBrightness[barIndex] = 0.0;
        }

        // Smooth transition - very fast to white, very slow fade back
        if (isHovered) {
            hoverBrightness[barIndex] += (targetBrightness - hoverBrightness[barIndex]) * 0.6; // Instant to white
        } else {
            hoverBrightness[barIndex] += (targetBrightness - hoverBrightness[barIndex]) * 0.04; // Very slow fade back
        }

        return hoverBrightness[barIndex];
    }

    // Helper to blend color toward white based on brightness value
    function brightenColor(color, whiteness) {
        if (whiteness === 0.0) return color;

        // Parse color and blend toward white
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);

            // Lerp toward white (255, 255, 255)
            const newR = Math.floor(r + (255 - r) * whiteness);
            const newG = Math.floor(g + (255 - g) * whiteness);
            const newB = Math.floor(b + (255 - b) * whiteness);

            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        }
        return color;
    }

    // Cached gradients for performance
    let cachedGradients = {
        top: null,
        bottom: null,
        lastHue: null,
        lastCanvasHeight: null
    };

    // Create or retrieve cached gradients
    function getGradients(canvasHeight, centerY) {
        if (cachedGradients.top && 
            cachedGradients.lastHue === hueRotation && 
            cachedGradients.lastCanvasHeight === canvasHeight) {
            return {
                top: cachedGradients.top,
                bottom: cachedGradients.bottom
            };
        }

        // Create new gradients
        const gradientTop = ctx.createLinearGradient(0, 0, 0, centerY);
        gradientTop.addColorStop(0, getRotatedColor('#ff0080'));
        gradientTop.addColorStop(0.33, getRotatedColor('#8000ff'));
        gradientTop.addColorStop(0.66, getRotatedColor('#0080ff'));
        gradientTop.addColorStop(1, getRotatedColor('#00ff80'));

        const gradientBottom = ctx.createLinearGradient(0, centerY, 0, canvasHeight);
        gradientBottom.addColorStop(0, getRotatedColor('#00ff80'));
        gradientBottom.addColorStop(0.33, getRotatedColor('#0080ff'));
        gradientBottom.addColorStop(0.66, getRotatedColor('#8000ff'));
        gradientBottom.addColorStop(1, getRotatedColor('#ff0080'));

        // Cache them
        cachedGradients = {
            top: gradientTop,
            bottom: gradientBottom,
            lastHue: hueRotation,
            lastCanvasHeight: canvasHeight
        };

        return { top: gradientTop, bottom: gradientBottom };
    }

    // Draw gradient bars visualization
    function drawGradientBars() {
        if (!analyzer || !dataArray) return;

        analyzer.getByteFrequencyData(dataArray);

        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        const centerY = canvasHeight / 2;

        ctx.fillStyle = CONFIG.backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const halfBars = Math.floor(dynamicNumBars / 2);
        const barHeight = centerY / halfBars;
        const maxBarWidth = canvasWidth - 10;

        if (peaks.length !== halfBars) {
            const oldPeaks = peaks;
            peaks = new Array(halfBars).fill(0);
            for (let i = 0; i < Math.min(oldPeaks.length, halfBars); i++) {
                peaks[i] = oldPeaks[i];
            }
        }

        // Get cached gradients
        const gradients = getGradients(canvasHeight, centerY);
        const gradientTop = gradients.top;
        const gradientBottom = gradients.bottom;

        // Update which bar is being hovered based on mouse Y position
        if (hoverY !== null) {
            // Calculate which bar the mouse is over
            if (Math.abs(hoverY - centerY) < barHeight / 2) {
                // Mouse is over center bar
                hoveredBarIndex = 0;
            } else if (hoverY < centerY) {
                // Mouse is in top half
                const distanceFromCenter = centerY - hoverY;
                const barIndexFromTop = Math.floor(distanceFromCenter / barHeight);
                hoveredBarIndex = barIndexFromTop * 2 - 1; // Top bars use odd indices
            } else {
                // Mouse is in bottom half
                const distanceFromCenter = hoverY - centerY;
                const barIndexFromBottom = Math.floor(distanceFromCenter / barHeight);
                hoveredBarIndex = barIndexFromBottom * 2; // Bottom bars use even indices
            }
        } else {
            hoveredBarIndex = null;
        }

        // Draw center bar
        const centerValue = dataArray[0] / 255;
        const centerBarWidth = centerValue * maxBarWidth;

        if (centerValue > peaks[0]) {
            peaks[0] = centerValue;
        } else if (CONFIG.peakHold) {
            peaks[0] *= CONFIG.peakDecay;
        }

        const centerBarY = centerY - barHeight / 2 + CONFIG.barSpacing;
        const centerBrightness = getBarBrightness(0);
        const centerColor = brightenColor(getRotatedColor('#00ff80'), centerBrightness);

        ctx.fillStyle = centerColor;
        ctx.fillRect(5, centerBarY, centerBarWidth, barHeight - CONFIG.barSpacing * 2);

        if (centerBarWidth > 20 || centerBrightness > 0.3) {
            ctx.shadowBlur = centerBrightness > 0.3 ? 20 : 10;
            ctx.shadowColor = centerBrightness > 0.5 ? '#ffffff' : centerColor;
            ctx.fillRect(5, centerBarY, centerBarWidth, barHeight - CONFIG.barSpacing * 2);
            ctx.shadowBlur = 0;
        }

        if (peaks[0] > 0.1) {
            const peakWidth = peaks[0] * maxBarWidth;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(5 + peakWidth - 1, centerBarY, 2, barHeight - CONFIG.barSpacing * 2);
        }

        // Draw mirrored bars
        for (let i = 1; i < halfBars; i++) {
            const dataIndex = Math.floor(i * dataArray.length / halfBars);
            const value = dataArray[dataIndex] / 255;
            const barWidth = value * maxBarWidth;

            if (value > peaks[i]) {
                peaks[i] = value;
            } else if (CONFIG.peakHold) {
                peaks[i] *= CONFIG.peakDecay;
            }

            const yTop = centerY - (i + 0.5) * barHeight + CONFIG.barSpacing;
            const yBottom = centerY + (i - 0.5) * barHeight + CONFIG.barSpacing;

            // Get brightness for each bar based on hover position
            const topBrightness = getBarBrightness(i * 2 - 1);
            const bottomBrightness = getBarBrightness(i * 2);

            // Top half - use cached gradient or create on-demand if brightness needed
            if (topBrightness > 0.01) {
                const topGradient = ctx.createLinearGradient(0, 0, 0, centerY);
                topGradient.addColorStop(0, brightenColor(getRotatedColor('#ff0080'), topBrightness));
                topGradient.addColorStop(0.33, brightenColor(getRotatedColor('#8000ff'), topBrightness));
                topGradient.addColorStop(0.66, brightenColor(getRotatedColor('#0080ff'), topBrightness));
                topGradient.addColorStop(1, brightenColor(getRotatedColor('#00ff80'), topBrightness));
                ctx.fillStyle = topGradient;
            } else {
                ctx.fillStyle = gradientTop;
            }
            ctx.fillRect(5, yTop, barWidth, barHeight - CONFIG.barSpacing * 2);

            if (barWidth > 20 || topBrightness > 0.3) {
                ctx.shadowBlur = topBrightness > 0.3 ? 25 : 10;
                ctx.shadowColor = topBrightness > 0.5 ? '#ffffff' : brightenColor(getRotatedColor(CONFIG.barColor), topBrightness);
                ctx.fillRect(5, yTop, barWidth, barHeight - CONFIG.barSpacing * 2);
                ctx.shadowBlur = 0;
            }

            // Bottom half - use cached gradient or create on-demand if brightness needed
            if (bottomBrightness > 0.01) {
                const bottomGradient = ctx.createLinearGradient(0, centerY, 0, canvasHeight);
                bottomGradient.addColorStop(0, brightenColor(getRotatedColor('#00ff80'), bottomBrightness));
                bottomGradient.addColorStop(0.33, brightenColor(getRotatedColor('#0080ff'), bottomBrightness));
                bottomGradient.addColorStop(0.66, brightenColor(getRotatedColor('#8000ff'), bottomBrightness));
                bottomGradient.addColorStop(1, brightenColor(getRotatedColor('#ff0080'), bottomBrightness));
                ctx.fillStyle = bottomGradient;
            } else {
                ctx.fillStyle = gradientBottom;
            }
            ctx.fillRect(5, yBottom, barWidth, barHeight - CONFIG.barSpacing * 2);

            if (barWidth > 20 || bottomBrightness > 0.3) {
                ctx.shadowBlur = bottomBrightness > 0.3 ? 25 : 10;
                ctx.shadowColor = bottomBrightness > 0.5 ? '#ffffff' : brightenColor(getRotatedColor(CONFIG.barColor), bottomBrightness);
                ctx.fillRect(5, yBottom, barWidth, barHeight - CONFIG.barSpacing * 2);
                ctx.shadowBlur = 0;
            }

            if (peaks[i] > 0.1) {
                const peakWidth = peaks[i] * maxBarWidth;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(5 + peakWidth - 1, yTop, 2, barHeight - CONFIG.barSpacing * 2);
                ctx.fillRect(5 + peakWidth - 1, yBottom, 2, barHeight - CONFIG.barSpacing * 2);
            }
        }
    }

    // Main draw function
    function draw() {
        if (!isVisualizing) return;

        // FIXED: Stop animation when tab is hidden to save CPU
        if (document.hidden) {
            return; // Don't request another frame
        }

        drawGradientBars();
        animationFrameId = requestAnimationFrame(draw);
    }

    // Create drag indicator for visual feedback
    function createDragIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'dragIndicator';
        Object.assign(indicator.style, {
            position: 'fixed',
            top: '50%',
            right: `${CONFIG.barWidth + 10}px`,
            transform: 'translateY(-50%)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            display: 'none',
            zIndex: '10001',
            whiteSpace: 'nowrap'
        });
        document.body.appendChild(indicator);
        return indicator;
    }

    // Add reset button to visualizer
    function addResetButton() {
        const resetBtn = document.createElement('div');
        resetBtn.textContent = 'R';
        resetBtn.title = 'Reset to defaults (or double-click bar)';
        resetBtn.className = 'viz-button';
        Object.assign(resetBtn.style, {
            position: 'absolute',
            top: '10px',
            right: '10px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            opacity: '0',
            zIndex: '1',
            transition: 'opacity 0.3s ease',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '3px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
        });
        visualizerContainer.appendChild(resetBtn);

        resetBtn.addEventListener('click', (e) => {
            hueRotation = 0;
            dynamicNumBars = DEFAULT_CONFIG.numBars;
            CONFIG.barWidth = DEFAULT_CONFIG.barWidth;
            visualizerContainer.style.width = `${CONFIG.barWidth}px`;

            // Save to storage
            browserAPI.storage.sync.set({
                hueRotation: 0,
                barCount: DEFAULT_CONFIG.numBars,
                barWidth: DEFAULT_CONFIG.barWidth
            });

            console.log('[Visualizer] Reset to defaults');
            e.stopPropagation();
        });
    }

    // Add power toggle button to visualizer
    function addPowerButton() {
        const powerBtn = document.createElement('div');
        powerBtn.textContent = 'X';
        powerBtn.title = 'Turn off visualizer';
        powerBtn.className = 'viz-button';
        Object.assign(powerBtn.style, {
            position: 'absolute',
            top: '10px',
            right: '35px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            opacity: '0',
            zIndex: '1',
            transition: 'opacity 0.3s ease',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '3px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
        });
        visualizerContainer.appendChild(powerBtn);

        powerBtn.addEventListener('click', (e) => {
            visualizerEnabled = false;
            browserAPI.storage.sync.set({ visualizerEnabled: false });
            visualizerContainer.style.display = 'none';
            stopVisualization();
            console.log('[Visualizer] Turned off via button');
            e.stopPropagation();
        });
    }

    // Show/hide buttons on container hover
    function setupButtonVisibility() {
        visualizerContainer.addEventListener('mouseenter', () => {
            const buttons = visualizerContainer.querySelectorAll('.viz-button');
            buttons.forEach(btn => {
                btn.style.opacity = '0.5';
            });
        });
        visualizerContainer.addEventListener('mouseleave', () => {
            const buttons = visualizerContainer.querySelectorAll('.viz-button');
            buttons.forEach(btn => {
                btn.style.opacity = '0';
            });
        });

        // Individual button hover
        const observer = new MutationObserver(() => {
            const buttons = visualizerContainer.querySelectorAll('.viz-button');
            buttons.forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.opacity = '1';
                });
                btn.addEventListener('mouseleave', () => {
                    const containerHovered = visualizerContainer.matches(':hover');
                    btn.style.opacity = containerHovered ? '0.5' : '0';
                });
            });
        });
        observer.observe(visualizerContainer, { childList: true });
    }

    // Save settings helper
    function saveSettings() {
        browserAPI.storage.sync.set({
            hueRotation: hueRotation,
            barCount: dynamicNumBars,
            barWidth: CONFIG.barWidth
        });
        settingsChanged = false;
    }

    // Initialize
    function init() {
        console.log('[Visualizer] Initializing extension...');

        // Load settings first
        loadSettings();

        document.body.appendChild(visualizerContainer);

        // Create drag indicator and reset button
        dragIndicator = createDragIndicator();
        addPowerButton();
        addResetButton();
        setupButtonVisibility();

        monitorMediaPlayback();

        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;

            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO' ||
                                node.querySelector('audio, video')) {
                                shouldCheck = true;
                            }
                        }
                    });
                }
            });

            if (shouldCheck) {
                monitorMediaPlayback();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Throttle resize events
        let resizeTimeout;
        let resizeThrottleId = null;
        window.addEventListener('resize', () => {
            if (resizeThrottleId) return;
            resizeThrottleId = requestAnimationFrame(() => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(resizeCanvas, 100);
                resizeThrottleId = null;
            });
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
            } else {
                if (isVisualizing && !animationFrameId) {
                    draw();
                }
            }
        });

        window.addEventListener('beforeunload', cleanupVisualizer);

        // Add drag handlers for interactive adjustments
        visualizerContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragStartY = e.clientY;
            dragStartX = e.clientX;
            visualizerContainer.style.cursor = 'grabbing';
            e.preventDefault();
        });

        // Touch support for mobile
        visualizerContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            isDragging = true;
            dragStartY = e.touches[0].clientY;
            dragStartX = e.touches[0].clientX;
            visualizerContainer.style.cursor = 'grabbing';
            e.preventDefault();
        }, { passive: false });

        // Double-click to reset
        visualizerContainer.addEventListener('dblclick', (e) => {
            hueRotation = 0;
            dynamicNumBars = DEFAULT_CONFIG.numBars;
            CONFIG.barWidth = DEFAULT_CONFIG.barWidth;
            visualizerContainer.style.width = `${CONFIG.barWidth}px`;
            saveSettings();
            console.log('[Visualizer] Reset to defaults via double-click');
            e.stopPropagation();
        });

        // Mouse move for dragging (throttled)
        let dragThrottleId = null;
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            if (dragThrottleId) return;
            
            dragThrottleId = requestAnimationFrame(() => {
                const deltaY = dragStartY - e.clientY;
                const deltaX = e.clientX - dragStartX;

                // Vertical drag: rotate hue
                if (Math.abs(deltaY) > 0) {
                    hueRotation = (hueRotation + deltaY * 0.5) % 360;
                    if (hueRotation < 0) hueRotation += 360;
                    settingsChanged = true;
                    dragStartY = e.clientY;
                }

                // Horizontal drag: adjust bar count
                if (Math.abs(deltaX) > 2) {
                    const barChange = Math.sign(deltaX);
                    const newBarCount = Math.max(MIN_BARS, Math.min(MAX_BARS, dynamicNumBars + barChange));

                    if (newBarCount !== dynamicNumBars) {
                        dynamicNumBars = newBarCount;
                        settingsChanged = true;
                    }
                    dragStartX = e.clientX;
                }

                // Show drag info
                if (dragIndicator) {
                    dragIndicator.textContent = `Hue: ${Math.round(hueRotation)}° | Bars: ${dynamicNumBars}`;
                    dragIndicator.style.display = 'block';
                    dragIndicator.style.right = `${CONFIG.barWidth + 10}px`;
                }

                e.preventDefault();
                dragThrottleId = null;
            });
        });

        // Touch move handler
        window.addEventListener('touchmove', (e) => {
            if (!isDragging || e.touches.length !== 1) return;

            const touch = e.touches[0];
            const deltaY = dragStartY - touch.clientY;
            const deltaX = touch.clientX - dragStartX;

            if (Math.abs(deltaY) > 0) {
                hueRotation = (hueRotation + deltaY * 0.5) % 360;
                if (hueRotation < 0) hueRotation += 360;
                settingsChanged = true;
                dragStartY = touch.clientY;
            }

            if (Math.abs(deltaX) > 2) {
                const barChange = Math.sign(deltaX);
                const newBarCount = Math.max(MIN_BARS, Math.min(MAX_BARS, dynamicNumBars + barChange));

                if (newBarCount !== dynamicNumBars) {
                    dynamicNumBars = newBarCount;
                    settingsChanged = true;
                }
                dragStartX = touch.clientX;
            }

            if (dragIndicator) {
                dragIndicator.textContent = `Hue: ${Math.round(hueRotation)}° | Bars: ${dynamicNumBars}`;
                dragIndicator.style.display = 'block';
                dragIndicator.style.right = `${CONFIG.barWidth + 10}px`;
            }

            e.preventDefault();
        }, { passive: false });

        // Mouse up - save settings
        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                visualizerContainer.style.cursor = 'grab';
                if (dragIndicator) dragIndicator.style.display = 'none';
                if (settingsChanged) saveSettings();
            }
        });

        // Mouse leave window
        window.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                visualizerContainer.style.cursor = 'grab';
                if (dragIndicator) dragIndicator.style.display = 'none';
                if (settingsChanged) saveSettings();
            }
        });

        // Touch end
        window.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                visualizerContainer.style.cursor = 'grab';
                if (dragIndicator) dragIndicator.style.display = 'none';
                if (settingsChanged) saveSettings();
            }
        });

        console.log('[Visualizer] Extension initialized with interactive controls');
    }

    // Start when page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
