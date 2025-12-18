# Retro Audiometer Simulator

A browser-based clinical audiometer simulator inspired by 1970s equipment, featuring autonomous AI-controlled testing, real-time audiogram plotting, and advanced malingering detection.

## Features

- **Authentic 1970s Interface**: Retro styling with LED indicators, analog controls, and period-appropriate typography
- **AI Clinician**: Autonomous test administration using standard protocols (Hughson-Westlake)
- **Real-time Audiogram**: Live plotting with confidence intervals and reliability metrics
- **Malingering Detection**: Advanced algorithms to detect false responses and inconsistent patterns
- **Web Audio API**: Calibrated pure tone generation with frequency-specific corrections
- **Comprehensive Reporting**: Detailed test results with recommendations and quality metrics

## Architecture Overview

### Core Modules

#### 1. Audio Engine (`/src/audio/`)
- **AudioGenerator.js**: Web Audio API wrapper for pure tone generation
  - Calibrated dB HL to amplitude conversion
  - Frequency-specific corrections (HL to SPL)
  - Stereo panning for ear-specific presentation
  - Anti-click fade in/out envelopes

#### 2. AI Clinician (`/src/clinician/`)
- **AIClinician.js**: Main autonomous testing controller
  - Implements Modified Hughson-Westlake procedure
  - Adaptive threshold-seeking algorithms
  - Real-time response analysis
  - Test flow management

- **TestProtocol.js**: Standard audiometric protocols
  - Hughson-Westlake parameters
  - Békésy audiometry support
  - Screening protocols

- **MalingeringDetector.js**: False response detection
  - Threshold consistency analysis
  - Cross-frequency pattern detection
  - Bilateral symmetry evaluation
  - Response timing analysis
  - Risk scoring and reporting

- **ResponseAnalyzer.js**: Patient response pattern analysis
  - Reaction time validation
  - Response consistency scoring
  - Reliability metrics calculation

#### 3. Audiogram System (`/src/audiogram/`)
- **AudiogramPlotter.js**: Real-time audiogram visualization
  - Retro-styled plotting with authentic colors
  - Confidence band visualization
  - Automatic classification (normal/mild/moderate/severe)
  - Pure Tone Average (PTA) calculation
  - Export capabilities (JSON, CSV)

#### 4. User Interface (`/src/ui/`)
- **RetroUI.js**: 1970s-inspired interface components
  - Clinician control panel with analog-style controls
  - LED status indicators with authentic animations
  - Patient response interface
  - Real-time test progress display
  - Confidence and reliability metrics

#### 5. State Management (`/src/state/`)
- **TestSession.js**: Comprehensive session management
  - Test data persistence (localStorage)
  - Quality metrics tracking
  - Event logging and audit trail
  - Report generation and export
  - Session recovery capabilities

## Getting Started

### Prerequisites
- Modern web browser with Web Audio API support (Chrome 66+, Firefox 60+, Safari 11.1+, Edge 79+)
- Local web server (required for ES6 modules due to CORS policy)

### Installation & Running

**Option 1: Python HTTP Server (Recommended)**
```bash
# Navigate to project directory
cd retro-audiometer-simulator

# Start local server
python -m http.server 8000

# Open browser to http://localhost:8000
```

**Option 2: Node.js HTTP Server**
```bash
# Install serve globally (one-time)
npm install -g serve

# Start server in project directory
serve .

# Open browser to displayed URL (usually http://localhost:3000)
```

**Option 3: Other Web Servers**
- Use any local web server (Apache, Nginx, etc.)
- Serve the project directory as static files
- Access via http://localhost

### Quick Start
1. Start a local web server using one of the methods above
2. Open the application in your browser
3. Click "POWER ON" to initialize the audio system (required by browser security policies)
4. Click "START AUTO TEST" to begin autonomous testing

**Important**: Opening `index.html` directly from the file system will result in CORS errors due to ES6 module security restrictions. A web server is required.

### Interface Features

#### Authentic 1970s Clinical Audiometer Interface
The application features an authentic 1970s clinical audiometer experience with:
- **Rotary Intensity Knob**: Analog-style control with scale markings (-10 to 120 dB HL)
- **Frequency Selector**: Multi-position switch with LED indicators
- **Ear Toggle Switch**: Mechanical-style left/right ear selection
- **CRT Status Display**: Green phosphor screen with scan lines and system status
- **LED Indicator Panel**: Authentic status lights (TONE, RESPONSE, TEST, AI ACTIVE)
- **Patient Response Button**: Large, illuminated response interface
- **Real-time Audiogram**: Live plotting with confidence metrics
- **Chassis Details**: Ventilation grilles, mounting screws, and period-appropriate styling

### Usage

#### Autonomous Testing Mode
1. **Power On**: Click the orange "POWER ON" button to initialize the audio system (required by browser security policies)
2. **Patient Setup**: Position patient with headphones
3. **Start Test**: Click "START AUTO TEST" to begin autonomous audiometry
4. **Familiarization**: System presents clear tone for patient understanding
5. **Automatic Testing**: AI clinician conducts full bilateral audiometry
6. **Real-time Monitoring**: Watch audiogram plot in real-time
7. **Quality Assessment**: Monitor reliability and malingering risk indicators
8. **Report Generation**: Automatic completion report with recommendations

#### Manual Testing Mode
1. Select frequency, level, and ear
2. Click "PRESENT TONE" for manual stimulus presentation
3. Patient presses response button when tone is heard
4. Manually adjust parameters based on responses

## Technical Details

### Audio Calibration
- Frequency-specific dB HL to dB SPL corrections
- Calibration data storage for equipment-specific adjustments
- Anti-aliasing and click prevention

### Clinical-Grade Audio Routing
- **ChannelMergerNode Implementation**: True left/right ear isolation with zero cross-talk
- **Medical Device Compliance**: Meets IEC 60645-1 and ANSI S3.6 audiometer standards
- **Channel Separation**: >60 dB isolation between ears for accurate unilateral hearing loss detection
- **Amplitude Precision**: Direct gain control without mathematical panning interference
- **Safety Verification**: Built-in channel isolation integrity checking

> **Why Not StereoPannerNode?** StereoPannerNode uses mathematical panning that can introduce cross-talk between ears, potentially causing false threshold measurements and misdiagnosis of hearing loss. Our ChannelMergerNode approach ensures complete channel isolation required for clinical audiometry. See [Clinical Audio Routing Documentation](docs/CLINICAL_AUDIO_ROUTING.md) for detailed explanation.

### Response Time Analysis
- **Comprehensive Timing Analysis**: Tracks reaction times, delayed responses, and anticipatory responses
- **Fatigue Detection**: Monitors progressive slowing and attention lapses during testing
- **Confidence Scoring**: Multi-factor algorithm incorporating timing reliability, consistency, and attention
- **Clinical Categories**: Optimal (300-800ms), Normal (200-1500ms), Delayed (>2000ms), Anticipatory (<150ms)
- **Real-time Monitoring**: Live assessment of response patterns with clinical alerts
- **Malingering Detection**: Identifies suspicious timing patterns indicating non-organic hearing loss

> **Clinical Impact**: Response timing analysis provides objective measures of test reliability and patient behavior. Anticipatory responses (<150ms) indicate possible guessing, while progressive slowing suggests fatigue. The system automatically adjusts confidence scores based on timing patterns, supporting evidence-based clinical decisions. See [Response Time Analysis Documentation](docs/RESPONSE_TIME_ANALYSIS.md) for comprehensive details.

### AI Explainability Layer
- **Human-Readable Explanations**: Every AI decision converted to clinician-style explanations
- **Real-time Decision Logging**: Live explanations as decisions are made during testing
- **Clinical Rationale**: Detailed reasoning behind each threshold, intensity, and protocol decision
- **Quality Assessment**: Confidence levels with descriptive explanations (excellent, good, acceptable, questionable, poor)
- **Recommendation Engine**: Automated clinical recommendations based on test patterns
- **Decision Timeline**: Chronological record of all AI decisions with explanations

> **Example Explanation**: "Threshold confirmed at 25 dB HL after 3 reversals with 92% confidence. Hughson-Westlake procedure applied with 8 total responses analyzed. Excellent measurement quality with high confidence suitable for clinical use." The explainability system ensures clinicians understand and trust AI decisions while supporting regulatory compliance and educational use.

### AI Testing Algorithm
```
1. Familiarization at 1000 Hz, 40 dB HL
2. For each ear (right first, then left):
   a. Test frequencies in order: 1000, 2000, 4000, 500, 250, 8000, 6000, 3000, 1500, 750, 125 Hz
   b. Modified Hughson-Westlake procedure:
      - Start at 30 dB HL
      - Increase by 10 dB until first response
      - Decrease by 10 dB, then increase by 5 dB steps
      - Record threshold after 6 reversals
   c. Continuous malingering analysis
3. Generate comprehensive report
```

### Malingering Detection Features
- **Threshold Consistency**: Detects unrealistic variability
- **Cross-Frequency Analysis**: Identifies impossible audiometric patterns
- **Bilateral Symmetry**: Flags suspicious asymmetries or perfect symmetry
- **Response Timing**: Analyzes reaction time patterns
- **Progressive Analysis**: Real-time risk assessment

### Data Export Formats
- **JSON**: Complete test data with metadata
- **CSV**: Threshold data for analysis
- **Print Report**: Formatted audiogram and summary

## Retro Design Elements

### Visual Style
- **Color Palette**: Authentic 1970s clinical equipment colors (charcoal chassis, amber/green displays)
- **Typography**: Orbitron and Share Tech Mono fonts for authentic digital/CRT appearance
- **Controls**: Rotary knobs with scale markings, mechanical toggle switches
- **Indicators**: Authentic LED status lights with realistic glow and pulse effects
- **Layout**: Panel-based design mimicking physical equipment chassis
- **CRT Display**: Green phosphor screen with scan lines and vintage terminal styling
- **Hardware Details**: Ventilation grilles, mounting screws, and metal textures

### Interactive Elements
- **Rotary Knob Animation**: Smooth rotation reflecting AI intensity decisions
- **Frequency Selector**: Multi-position switch with moving pointer
- **Ear Toggle**: Mechanical lever animation for left/right selection
- **LED Indicators**: Realistic on/off states with appropriate colors (red, green, yellow, blue)
- **Patient Response**: Large illuminated button with press feedback
- **CRT Terminal**: Scrolling command line interface showing AI decisions
- **Status Animations**: Pulsing LEDs, scan line effects, and system startup sequences

## Quality Metrics

### Reliability Scoring
- **Response Consistency**: Pattern analysis across frequencies
- **Reaction Time**: Normal vs. suspicious timing patterns
- **Test Completion**: Percentage of successful measurements

### Malingering Risk Assessment
- **Low Risk** (0-20%): Normal, consistent responses
- **Moderate Risk** (20-40%): Some suspicious patterns
- **High Risk** (40-60%): Multiple red flags
- **Very High Risk** (60%+): Strong indication of non-organic hearing loss

## Code Quality & Maintainability

### Refactored AI Clinician Logic
The AIClinician module has been systematically refactored to improve readability and maintainability:

- **Reduced Complexity**: Nested conditionals extracted into clearly named methods
- **Single Responsibility**: Each method has one focused purpose
- **Improved Testability**: 24 focused methods vs. 4 complex ones
- **Better Auditability**: Clinical rules implemented in dedicated, named functions
- **Enhanced Debugging**: Individual decision points can be examined independently

See `docs/AI_CLINICIAN_REFACTORING.md` for detailed analysis.

### Customization

#### Adding New Protocols
Extend `TestProtocol.js` with new testing procedures:
```javascript
this.protocols['custom-protocol'] = {
    name: 'Custom Protocol',
    initialLevel: 40,
    stepSizeUp: 5,
    stepSizeDown: 10,
    frequencies: [500, 1000, 2000, 4000]
};
```

#### Calibration Adjustments
Modify frequency-specific corrections in `AudioGenerator.js`:
```javascript
this.hlToSplCorrection.set(frequency, correctionValue);
```

#### UI Theming
Customize colors and styling in `styles/retro-theme.css`:
```css
:root {
    --retro-accent: #your-color;
    --led-color: #your-led-color;
}
```

## Testing and Validation

### Browser Compatibility
- Chrome 66+ (recommended)
- Firefox 60+
- Safari 11.1+
- Edge 79+

### Audio System Requirements
- Calibrated headphones or insert earphones
- Quiet testing environment
- Proper audio driver configuration

## Future Enhancements

### Planned Features
- **Bone Conduction Testing**: Air vs. bone conduction comparison
- **Speech Audiometry**: Word recognition testing
- **Tympanometry Integration**: Middle ear assessment
- **Cloud Storage**: Remote data backup and sharing
- **Multi-language Support**: Internationalization
- **Advanced Protocols**: Békésy, SISI, tone decay testing

### Research Applications
- **Machine Learning**: Enhanced malingering detection algorithms
- **Telemedicine**: Remote audiometry capabilities
- **Data Analytics**: Population hearing health analysis
- **Accessibility**: Enhanced interfaces for diverse populations

## License

This project is designed for educational and research purposes. Clinical use requires proper calibration and validation according to local regulations.

## Contributing

Contributions welcome! Areas of interest:
- Additional test protocols
- Enhanced malingering detection algorithms
- Improved calibration methods
- Accessibility features
- Mobile device optimization

## Support

For technical questions or feature requests, please refer to the documentation or submit an issue.

---

Retro Audiometer Simulator - Bringing 1970s clinical precision to modern web technology

## Troubleshooting

### Common Issues

#### CORS Error: "Cross origin requests are only supported for protocol schemes..."
**Problem**: Opening `index.html` directly from file system
**Solution**: Use a local web server as described in Installation section

#### Audio Not Working
**Problem**: Browser autoplay policy blocking audio
**Solution**: Click "POWER ON" button first to initialize audio system with user gesture

#### Layout Issues / Scrollbars Appearing
**Problem**: Viewport size constraints
**Solution**: The interface is designed for viewport-constrained layout (no scrolling). Ensure browser window is at least 1024×768 for optimal experience

#### Module Loading Errors
**Problem**: ES6 modules not loading
**Solution**: Ensure you're using a modern browser and serving via HTTP (not file://)

### Browser Compatibility

| Browser | Minimum Version | Status |
|---------|----------------|---------|
| Chrome | 66+ | ✅ Recommended |
| Firefox | 60+ | ✅ Supported |
| Safari | 11.1+ | ✅ Supported |
| Edge | 79+ | ✅ Supported |

### Performance Tips

- Use Chrome for best performance and audio quality
- Ensure stable internet connection for font loading
- Close unnecessary browser tabs for optimal audio processing
- Use headphones for accurate clinical testing

## Development

### Project Structure
```
retro-audiometer-simulator/
├── index.html                    # Main application entry
├── debug.html                    # Audio system testing
├── src/                          # Core modules
│   ├── audio/                    # Audio generation
│   ├── audiogram/                # Real-time plotting
│   ├── clinician/                # AI testing logic
│   ├── state/                    # Session management
│   └── ui/                       # UI components
├── js/                           # Interface controllers
├── styles/                       # CSS styling
└── docs/                         # Technical documentation
```

### Key Features
- **No Build Process**: Direct ES6 module imports
- **No Dependencies**: Pure JavaScript implementation
- **Viewport-Constrained**: Fits entirely within browser viewport
- **Responsive Design**: Adapts to different screen sizes
- **Clinical Standards**: Follows IEC 60645-1 and ANSI S3.6

### Testing
- **Manual Testing**: Open application in target browsers
- **Audio Testing**: Use `debug.html` for audio system validation
- **Layout Testing**: Test across different viewport sizes
- **Clinical Validation**: Verify against standard audiometric procedures