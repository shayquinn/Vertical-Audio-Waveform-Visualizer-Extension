# Vertical Audio Waveform Visualizer Extension

A beautiful, interactive, real-time audio visualization browser extension that displays a customizable vertical frequency spectrum bar on the right side of any webpage playing audio or video.

![Extension Type](https://img.shields.io/badge/Type-Browser%20Extension-blue) ![Version](https://img.shields.io/badge/Version-2.0-green) ![Interactive](https://img.shields.io/badge/Interactive-Yes-brightgreen)

## ✨ Features

- 🎵 **Real-time Audio Visualization** - Displays live frequency bars that animate with your audio
- 🌈 **Rainbow Gradient Colors** - Beautiful color transitions from pink → purple → blue → cyan → green
- 🎨 **Interactive Color Control** - Drag vertically to rotate through the full color spectrum in real-time
- 📊 **Adjustable Bar Density** - Drag horizontally to increase/decrease the number of bars (10-80 bars)
- 💾 **Persistent Settings** - Your color and bar count preferences are saved between sessions
- 🔄 **Center-Mirrored Design** - Bars radiate outward from the center in both directions
- 🎭 **Dynamic Glow Effects** - Glow effects that change color along with the gradient
- 📍 **Peak Indicators** - White markers show peak audio levels that decay smoothly
- ↺ **Quick Reset** - Double-click or use reset button to restore default settings
- 🔇 **Auto-Detection** - Automatically detects and visualizes any audio/video on the page
- 🖱️ **Intuitive Controls** - Grab cursor shows the visualizer is interactive
- 📱 **Responsive** - Adapts to window resizing and high DPI displays
- ⚡ **Performance Optimized** - Pauses when tab is hidden to save resources
- 🔧 **Extension Popup** - Easy toggle and settings control via browser toolbar

## 📋 What It Does

The visualizer creates a 120px wide vertical bar on the right edge of your browser window that:
- Appears automatically when audio/video starts playing (and isn't muted)
- Shows real-time frequency analysis with a single center bar and mirrored frequency bars
- Displays a smooth gradient effect that flows from the center outward
- Responds to mouse interaction for customization:
  - **Drag Up/Down**: Rotate colors through the full spectrum
  - **Drag Left/Right**: Adjust number of bars (fewer/more)
- Shows peak indicators that track maximum audio levels
- Disappears when audio stops or is paused
- Works on major streaming sites: YouTube, Spotify, Netflix, SoundCloud, Twitch, and more

## 🚀 Installation

### From Source (Developer Mode)

#### For Chrome/Edge/Brave:

1. **Download the Extension**
   - Clone this repository or download it as a ZIP file
   - Extract the files to a folder on your computer

2. **Load the Extension**
   - Open your browser and navigate to:
     - Chrome: `chrome://extensions`
     - Edge: `edge://extensions`
     - Brave: `brave://extensions`
   - Enable **"Developer mode"** (toggle in top-right corner)
   - Click **"Load unpacked"**
   - Select the folder containing the extension files
   - The extension icon should appear in your toolbar!

#### For Firefox:

1. **Download the Extension**
   - Clone this repository or download it as a ZIP file
   - Extract the files to a folder on your computer

2. **Load the Extension (Temporarily)**
   - Open Firefox and navigate to: `about:debugging#/runtime/this-firefox`
   - Click **"Load Temporary Add-on..."**
   - Navigate to the extension folder and select the `manifest.json` file
   - The extension will remain active until you close Firefox

**Note:** For permanent installation in Firefox, the extension needs to be signed by Mozilla or installed from the Firefox Add-ons store.

### Verify Installation

1. Navigate to any page with audio/video (like YouTube)
2. Play a video (make sure it's not muted)
3. You should see the visualizer appear on the right side of the screen!
4. Click the extension icon in your toolbar to access settings and controls

## 🎮 Usage

### Basic Usage

1. Navigate to any webpage with audio or video content
2. Play the media (make sure it's not muted)
3. The visualizer automatically appears on the right side
4. When you pause or stop the audio, the visualizer disappears
5. Works across all tabs - each tab gets its own visualizer

### Extension Popup

Click the extension icon in your browser toolbar to access:
- **Enable/Disable Toggle** - Turn the visualizer on/off
- **Visual Settings** - Adjust appearance preferences
- **Quick Access Controls** - Manage the extension without visiting settings

### Interactive Controls

The visualizer is fully interactive! Hover over it and you'll see a "grab" cursor.

**🎨 Change Colors (Vertical Drag):**
- Click and drag **up** or **down** on the visualizer
- Watch the colors rotate through the full spectrum
- All gradient colors and glow effects change together
- Create your perfect color scheme!

**📊 Adjust Bar Density (Horizontal Drag):**
- Click and drag **left** to decrease bars (larger, fewer bars: 10 minimum)
- Click and drag **right** to increase bars (smaller, more bars: 80 maximum)
- Find the perfect balance between detail and smoothness
- Great for different types of music (fewer bars for bass-heavy, more for detailed treble)

**↺ Reset to Defaults:**
- **Double-click** anywhere on the visualizer to instantly reset colors and bar count
- Or click the **↺ reset button** in the top-right corner of the visualizer
- Resets hue rotation to 0° (original rainbow gradient)
- Resets bar count to 40 (default density)
- Quick way to start fresh without refreshing the page

**💡 Tips:**
- You can drag diagonally to change both color and density simultaneously
- Your color and bar count settings are automatically saved and restored between sessions
- Settings persist across page reloads and browser restarts
- Double-click anytime to reset to default colors and bar count
- The reset button (↺) in the top-right corner provides a click alternative to double-click

## 🎛️ Managing the Extension

### Enable/Disable the Extension

**From the Extension Popup:**
1. Click the extension icon in your browser toolbar
2. Toggle the enable/disable switch
3. The visualizer will immediately activate or deactivate

**From Browser Extension Settings:**
1. Go to your browser's extension management page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Firefox: `about:addons`
2. Find "Vertical Audio Waveform Visualizer"
3. Toggle the switch to enable/disable

### Disable for Specific Sites

**Using Browser Permissions:**
1. Right-click the extension icon
2. Select "This can read and change site data"
3. Choose "On click" or "On specific sites"
4. Manage site permissions as needed

### Uninstall the Extension

1. Go to your browser's extension management page
2. Find "Vertical Audio Waveform Visualizer"
3. Click **"Remove"** or the trash icon
4. Confirm deletion

**Note:** Uninstalling removes all traces of the extension including saved settings. You can always reinstall it later using the installation instructions above.

### Supported Sites

- ✅ YouTube (youtube.com, music.youtube.com)
- ✅ Spotify Web Player (open.spotify.com)
- ✅ SoundCloud (soundcloud.com)
- ✅ Twitch (twitch.tv)
- ✅ Vimeo (vimeo.com)
- ✅ Netflix (netflix.com)
- ✅ Hulu (play.hulu.com)
- ✅ Disney+ (disneyplus.com)
- ✅ Amazon Music (music.amazon.com)
- ✅ Deezer (deezer.com)
- ✅ Mixcloud (mixcloud.com)
- ✅ Bandcamp (bandcamp.com)

**Note:** The extension is configured to work on these major streaming platforms. To add support for additional sites, you can modify the `host_permissions` and `content_scripts` matches in `manifest.json`.

## ⚙️ Configuration

### Via Extension Files

You can customize the default visualizer settings by editing the configuration in `visualizer.js`:

```javascript
const CONFIG = {
    barWidth: 120,              // Width of the visualization bar (in pixels)
    backgroundColor: 'rgba(0, 0, 0, 0.7)',  // Background color
    borderColor: 'rgba(255, 255, 255, 0.3)',  // Border color
    smoothing: 0.8,             // Audio smoothing (0-1, higher = smoother)
    numBars: 40,                // Default number of frequency bars (adjustable via drag)
    barSpacing: 2,              // Space between bars
    barColor: '#00ff88',        // Base glow effect color (rotates with drag)
    animationSpeed: 0.15,       // Animation smoothing speed
    peakHold: true,             // Show peak indicators
    peakDecay: 0.97             // How fast peaks fall (0-1, higher = slower)
};
```

**Note:** While `numBars` sets the initial count, you can change it on-the-fly by dragging horizontally on the visualizer (range: 10-80 bars).

## 🔒 Permissions & Privacy

### Extension Permissions

This extension requires the following permissions:

- **`storage`** - To save your color, bar count, and width preferences
- **`host_permissions`** - Access to specific streaming sites (YouTube, Spotify, Netflix, etc.) to inject the visualizer
- **Content script injection** - Runs `visualizer.js` on supported streaming sites only

### Is This Extension Safe? ✅

**YES** - This extension is completely safe and privacy-focused:

- ✅ **No data collection** - Doesn't collect, store, or transmit any user data
- ✅ **No external requests** - Doesn't connect to any external servers
- ✅ **Targeted site support** - Works only on approved streaming platforms for better security
- ✅ **Minimal permissions** - Only accesses specific music/video streaming sites
- ✅ **No tracking** - Doesn't monitor your browsing or behavior

### What the Extension Does Access

1. **Audio Analysis Only** - Connects to Web Audio API to read frequency data in real-time
2. **DOM Access** - Adds a single visualization container to the page (no modifications to existing content)
3. **Media Elements** - Detects `<audio>` and `<video>` elements to visualize their audio
4. **Local Storage** - Saves your color and bar count preferences locally in your browser

### What the Extension CANNOT Do

- ❌ Cannot record your audio or video
- ❌ Cannot access your microphone or camera
- ❌ Cannot see what you're watching/listening to
- ❌ Cannot send data to external servers
- ❌ Cannot access passwords, cookies, or personal information
- ❌ Cannot modify page content or inject ads
- ❌ Cannot track your browsing history

### Performance Impact

- **CPU Usage**: Minimal (~1-2% CPU on modern hardware)
- **Memory**: Lightweight, uses canvas rendering for efficiency
- **Battery**: Automatically pauses when tab is hidden to save resources

## 🐛 Troubleshooting

**Visualizer doesn't appear:**
- Make sure you're on a supported streaming site (see Supported Sites section)
- Make sure the audio/video is not muted
- Check that the extension is enabled (click the extension icon)
- Open browser console (F12) and look for `[Visualizer]` messages
- Try refreshing the page
- Verify the extension has permissions for the current site

**Extension icon doesn't appear in toolbar:**
- Check your browser's extension management page to ensure it's installed
- Click the puzzle piece icon (Chrome/Edge) and pin the extension
- In Firefox, check the add-ons manager

**Dragging changes page scroll/selection instead:**
- This has been fixed - the visualizer prevents default browser behaviors
- If issues persist, try clicking and holding for a moment before dragging

**Colors or bars won't change when dragging:**
- Make sure you're dragging on the visualizer itself (right edge of screen)
- Look for the "grab" cursor to confirm you're hovering over the interactive area
- Try refreshing the page if the controls become unresponsive

**No audio data detected:**
- Some sites may have audio protection that prevents visualization
- Try a different website to confirm the extension works
- Check browser console for error messages

**Settings not saving:**
- Verify the extension has storage permissions
- Check if you're in private/incognito mode (some settings may not persist)
- Try resetting to defaults and reconfiguring

## 📝 Technical Details

- **Architecture**: Manifest V3 browser extension
- **Audio Analysis**: Uses Web Audio API's AnalyserNode with FFT size of 256
- **Rendering**: HTML5 Canvas with requestAnimationFrame for smooth 60fps animation
- **Color Manipulation**: Real-time HSL color rotation with hex conversion
- **Peak Tracking**: Decay algorithm for smooth peak indicator animations
- **Interaction**: Mouse event handlers with drag detection and prevention of default behaviors
- **Dynamic Scaling**: Bar count adjustment with automatic frequency bin mapping
- **Background Service**: Service worker handles extension lifecycle and communication
- **Content Script**: `visualizer.js` injected into pages to create the visualization
- **Compatibility**: Works with all modern browsers supporting Manifest V3 and Web Audio API
- **Performance**: Automatically pauses animation when tab is hidden, throttled resize events

## 📁 Project Structure

```
├── manifest.json              # Extension configuration and permissions
├── background.js              # Service worker for extension lifecycle
├── visualizer.js              # Main visualization logic (content script)
├── popup.html                 # Extension popup interface
├── popup.js                   # Popup interaction logic
├── favicon-16x16.png          # Extension icon (16x16)
├── favicon-32x32.png          # Extension icon (32x32)
├── android-chrome-192x192.png # Extension icon (192x192)
└── android-chrome-512x512.png # Extension icon (512x512)
```

## 🆚 Extension vs Userscript

This is the **browser extension version** of the Vertical Audio Waveform Visualizer. If you prefer a userscript version that runs in Greasemonkey/Tampermonkey, check out the [userscript version](https://github.com/shayquinn/Vertical-Audio-Waveform-Visualizer).

**Extension Advantages:**
- ✅ Easier installation (no userscript manager needed)
- ✅ Better browser integration
- ✅ Popup interface for settings
- ✅ More reliable across updates
- ✅ Official browser extension architecture

**Userscript Advantages:**
- ✅ Single file, easier to customize
- ✅ Works across multiple browsers with one install (via userscript manager)
- ✅ More transparent code execution

## 📄 License

This extension is provided as-is for personal use. Feel free to modify and share!

## 🔄 Version History

### v2.0 (Extension Release)
- 🎉 **Complete rewrite as browser extension** (Manifest V3)
- 🔧 **Extension popup interface** for easy control
- 🏗️ **Service worker architecture** for better performance
- 💾 **Enhanced settings persistence** via extension storage API
- 🎨 **Improved UI/UX** with native browser integration

### v1.4 (Userscript)
- 💾 Settings persistence for bar count and hue rotation
- ⚡ Performance optimizations
- 🔧 Improved localStorage handling

### v1.3 (Userscript)
- ✨ Interactive color and density controls
- 📍 Peak indicators
- ↺ Reset functionality

### v1.2 (Userscript)
- Center-mirrored visualization
- Tab switching fixes

### v1.1 (Userscript)
- Gradient bar visualization
- Increased bar width

### v1.0 (Userscript)
- Initial userscript release

---

**Enjoy your music with beautiful visualizations! 🎵✨**

If you encounter issues or have suggestions, please open an issue on this repository.