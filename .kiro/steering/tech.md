# Technology Stack

## Core Technologies
- **Pure JavaScript ES6+**: No frameworks or external dependencies
- **Web Audio API**: Clinical-grade audio generation and routing
- **ES6 Modules**: Native browser module system for clean architecture
- **HTML5 + CSS3**: Modern web standards with custom CSS variables

## Browser Requirements
- **Chrome 66+** (recommended)
- **Firefox 60+**
- **Safari 11.1+** 
- **Edge 79+**
- **Web Audio API support required**

## Architecture Approach
- **No Build Process**: Direct ES6 module imports, runs in browser without compilation
- **No Package Manager**: Zero npm/yarn dependencies
- **Vanilla JavaScript**: Pure JS implementation for maximum compatibility
- **Modular Design**: Clean separation of concerns with ES6 classes

## Audio Technology
- **ChannelMergerNode**: Clinical-grade left/right ear isolation (not StereoPannerNode)
- **Calibrated Audio**: dB HL to dB SPL conversion with frequency-specific corrections
- **Anti-click Envelopes**: Fade in/out to prevent audio artifacts

## Development Commands
Since this is a pure browser application with no build process:

### Running the Application
```bash
# Simply open in browser - no server required
open index.html
# OR serve locally if needed
python -m http.server 8000
# OR
npx serve .
```

### Testing
- **Manual Testing**: Open `index.html` in target browsers
- **Audio Testing**: Use `debug.html` for audio system validation
- **No Automated Tests**: Currently relies on manual clinical validation

### File Structure
- **No bundling**: Direct file serving
- **No transpilation**: Modern browser ES6+ support assumed
- **No minification**: Development-friendly readable code

## Key Technical Decisions
- **ChannelMergerNode over StereoPannerNode**: Ensures true channel isolation for clinical accuracy
- **No External Dependencies**: Reduces complexity and ensures long-term compatibility
- **ES6 Classes**: Modern JavaScript patterns for clean OOP design
- **CSS Custom Properties**: Maintainable theming system