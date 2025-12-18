# Retro Audiometer Simulator - Project Structure

## Project Overview
A browser-based clinical audiometer simulator with autonomous AI-controlled testing, featuring authentic 1970s styling and advanced clinical algorithms.

## File Structure

```
retro-audiometer-simulator/
├── README.md                           # Main project documentation
├── PROJECT_STRUCTURE.md               # This file - project organization
├── index.html                          # Main application (1970s retro interface)
│
├── src/                                # Core application modules
│   ├── main.js                        # Application entry point
│   ├── audio/
│   │   └── AudioGenerator.js          # Web Audio API wrapper
│   ├── audiogram/
│   │   └── AudiogramPlotter.js        # Real-time audiogram plotting
│   ├── clinician/
│   │   ├── AIClinician.js             # Main AI testing controller
│   │   ├── ClinicalExplainer.js       # AI decision explanations
│   │   ├── FalseResponseDetector.js   # Catch trials & validation
│   │   ├── MalingeringDetector.js     # Non-organic hearing loss detection
│   │   ├── ResponseAnalyzer.js        # Response timing analysis
│   │   └── TestProtocol.js            # Hughson-Westlake protocol
│   ├── state/
│   │   └── TestSession.js             # Session management
│   └── ui/
│       └── RetroUI.js                 # UI components
│
├── js/                                 # Interface controllers
│   └── retro-audiometer-ui.js         # Retro interface controller
│
├── styles/                             # CSS styling
│   ├── audiometer.css                 # Modern interface styles
│   ├── retro-audiometer.css           # Retro interface styles
│   └── retro-theme.css                # Retro theme variables
│
└── docs/                               # Technical documentation
    ├── AI_CLINICIAN_REFACTORING.md    # Code refactoring analysis
    ├── AI_EXPLAINABILITY.md           # AI decision explanations
    ├── AUTONOMOUS_AUDIOMETRY.md       # Autonomous testing details
    ├── CLINICAL_AUDIO_ROUTING.md      # Audio routing implementation
    ├── ENHANCED_AUDIOGRAM.md          # Audiogram features
    ├── FALSE_RESPONSE_DETECTION.md    # Catch trial system
    ├── HUGHSON_WESTLAKE_FSM.md        # State machine documentation
    └── RESPONSE_TIME_ANALYSIS.md      # Timing analysis system
```

## Core Components

### Entry Point
- **index.html** - Main application with authentic 1970s interface

### Core Modules (`src/`)
- **AIClinician.js** - Autonomous test controller implementing Hughson-Westlake protocol
- **AudioGenerator.js** - Clinical-grade audio generation with proper ear isolation
- **AudiogramPlotter.js** - Real-time audiogram with confidence metrics
- **FalseResponseDetector.js** - Catch trials and response validation
- **TestSession.js** - Session management and data persistence

### Interface Controllers (`js/`)
- **retro-audiometer-ui.js** - Connects retro interface to core modules

### Documentation (`docs/`)
- Comprehensive technical documentation for each major feature
- Implementation details and clinical rationale
- Code quality and refactoring analysis



## Key Features

### Clinical Accuracy
- Implements standard Hughson-Westlake audiometric protocol
- Clinical-grade audio routing with proper ear isolation
- Comprehensive false response detection with catch trials
- Response timing analysis for test reliability assessment

### AI Autonomy
- Fully autonomous test administration
- Real-time decision making with clinical explanations
- Adaptive threshold seeking algorithms
- Malingering detection and risk assessment

### Authentic Interface
- 1970s clinical equipment styling
- Rotary controls, LED indicators, CRT-style displays
- Realistic hardware animations and feedback
- Period-appropriate colors and typography

### Modern Implementation
- Pure JavaScript ES6+ modules
- Web Audio API for precise audio control
- No external dependencies or frameworks
- Runs entirely in the browser

## Usage

### Quick Start
1. Open `index.html` in a modern web browser
2. Click "POWER ON" to initialize the audio system (browser security requirement)
3. Click "START AUTO TEST" to begin autonomous testing
4. Patient responds using the illuminated response button
5. AI clinician automatically manages the complete test sequence

### Development
- All modules are ES6 imports - no build process required
- Core functionality in `src/` can be used independently
- Documentation provides implementation details

## Browser Requirements
- Chrome 66+ (recommended)
- Firefox 60+
- Safari 11.1+
- Edge 79+
- Web Audio API support required