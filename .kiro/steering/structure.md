# Project Structure & Organization

## Directory Layout
```
retro-audiometer-simulator/
├── index.html                    # Main application entry point
├── debug.html                    # Audio system testing interface
├── src/                          # Core application modules
│   ├── main.js                   # Application initialization
│   ├── audio/                    # Audio generation & routing
│   ├── audiogram/                # Real-time plotting system
│   ├── clinician/                # AI testing logic & protocols
│   ├── state/                    # Session & data management
│   └── ui/                       # UI components & controls
├── js/                           # Interface controllers
├── styles/                       # CSS styling & themes
└── docs/                         # Technical documentation
```

## Module Organization

### Core Modules (`src/`)
- **Single Responsibility**: Each module handles one specific domain
- **ES6 Classes**: Modern JavaScript class-based architecture
- **Clean Imports**: Explicit dependency declarations at file top
- **No Circular Dependencies**: Careful module dependency management

### Key Architectural Patterns
- **Separation of Concerns**: Audio, UI, AI logic, and state are isolated
- **Event-Driven**: Custom events for component communication
- **Dependency Injection**: Components receive dependencies via constructor
- **Immutable State**: State changes through explicit methods only

## File Naming Conventions
- **PascalCase**: Class files (e.g., `AIClinician.js`, `AudioGenerator.js`)
- **camelCase**: Instance files and utilities
- **kebab-case**: CSS files and HTML files
- **UPPERCASE**: Constants and configuration files

## Code Organization Rules

### JavaScript Structure
```javascript
// File header with purpose description
/**
 * Module description and clinical context
 */

// Imports at top
import { Dependency } from './path/to/Dependency.js';

// Class definition with clear constructor
export class ModuleName {
    constructor() {
        // Initialize properties
        // Set up dependencies
        // Configure defaults
    }
    
    // Public methods first
    // Private methods last (prefixed with _)
}
```

### CSS Structure
- **CSS Custom Properties**: Use `:root` variables for theming
- **BEM-like Naming**: `.component-element--modifier` pattern
- **Logical Grouping**: Related styles grouped together
- **Mobile-First**: Responsive design approach

## Documentation Standards
- **Comprehensive README**: Project overview and usage instructions
- **Technical Docs**: Detailed implementation explanations in `docs/`
- **Inline Comments**: Clinical rationale and complex algorithm explanations
- **JSDoc Style**: Function and class documentation

## Clinical Code Patterns
- **Medical Terminology**: Use proper audiological terms in code
- **Safety First**: Audio level limits and validation
- **Standards Compliance**: Reference clinical standards in comments
- **Explainable AI**: All AI decisions must have human-readable explanations

## State Management
- **Centralized Session**: `TestSession.js` manages all test state
- **Event Logging**: Comprehensive audit trail of all actions
- **Data Persistence**: localStorage for session recovery
- **Quality Metrics**: Continuous reliability and confidence tracking

## UI Component Rules
- **Retro Styling**: Authentic 1970s clinical equipment appearance
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Responsive Design**: Works on various screen sizes
- **Clinical Workflow**: UI follows standard audiometric procedures