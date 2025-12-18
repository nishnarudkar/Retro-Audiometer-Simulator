# User Guidance System - 1970s Clinical Audiometer

## Overview

The Retro Audiometer Simulator implements a comprehensive user guidance system that maintains authentic 1970s clinical device aesthetics while providing clear, progressive instruction throughout the audiometric testing process.

## Design Principles

### 1970s Clinical Aesthetic
- **CRT-Style Displays**: Green phosphor text with scan lines and authentic terminal styling
- **No Modern Tooltips**: All guidance integrated into the device interface
- **Typewriter Effects**: Character-by-character text display mimicking period terminals
- **LED Status Indicators**: Physical-style indicator lights for system status
- **Clinical Terminology**: Proper audiological language throughout

### Progressive Disclosure
- **Phase-Based Guidance**: Information revealed as needed for each test phase
- **Context-Sensitive Help**: Instructions adapt to current system state
- **Non-Intrusive**: Guidance integrated into existing interface elements
- **Autonomous Flow**: AI-driven progression with clear status communication

## UI Pattern Components

### 1. CRT Status Display
**Location**: Main control panel center
**Purpose**: Primary communication channel between AI clinician and user

```
┌─────────────────────────────────────────┐
│ > AUDIOMETER AI v1.0                    │
│                                         │
│ STATUS: READY                           │
│ MODE:   AUTONOMOUS                      │
│ FREQ:   1000 Hz                        │
│ LEVEL:  40 dB HL                       │
│ EAR:    RIGHT                          │
│ AI:     INITIALIZING...                 │
│                                         │
│ AI> SYSTEM READY FOR AUTONOMOUS TESTING │
│ PROGRESS: [████░░░░░░░░░░░░░░░░] 20%    │
└─────────────────────────────────────────┘
```

**Features**:
- Real-time parameter display
- AI decision explanations
- Progress tracking
- Typewriter text effects
- Scan line animations

### 2. Clinical Status Panel
**Location**: Patient interface section
**Purpose**: Detailed clinical information for educational users

```
┌─────────────────────────┐
│    CLINICAL STATUS      │
├─────────────────────────┤
│ CURRENT TEST STATUS:    │
│ EAR: RIGHT              │
│ FREQUENCY: 1000 HZ      │
│ INTENSITY: 40 DB HL     │
│ STATE: PRESENT_TONE     │
│ CONFIDENCE: GOOD        │
└─────────────────────────┘
```

### 3. LED Indicator System
**Location**: Throughout interface
**Purpose**: Visual status communication

```
TONE     RESPONSE    TEST     AI ACTIVE
 ●         ○         ●         ◉
YELLOW    BLUE      GREEN    RED(PULSE)
```

**States**:
- **TONE**: Illuminated during stimulus presentation
- **RESPONSE**: Flashes when patient responds
- **TEST**: Active during testing phases
- **AI ACTIVE**: Pulsing when AI is making decisions

### 4. Patient Response Interface
**Location**: Dedicated patient section
**Purpose**: Clear response instructions and feedback

```
┌─────────────────────────────────────────┐
│        PATIENT RESPONSE INTERFACE       │
│                                         │
│        ┌─────────────────────┐          │
│        │                     │          │
│        │    PRESS WHEN       │          │
│        │    YOU HEAR         │          │
│        │    THE TONE         │          │
│        │                     │          │
│        └─────────────────────┘          │
│                                         │
│ INSTRUCTIONS:                           │
│ • Put on the headphones                 │
│ • Press the button when you hear ANY    │
│   tone                                  │
│ • Even very quiet tones - press the     │
│   button                                │
│ • Do NOT press if you're not sure       │
│ • The AI will control everything else   │
└─────────────────────────────────────────┘
```

## Message Flow Examples

### Startup Sequence
```
[00:00] AUDIOMETER MODEL 1975-AI INITIALIZING...
[00:01] SYSTEM DIAGNOSTICS: PASSED
[00:02] AUDIO CHANNELS: LEFT/RIGHT ISOLATED
[00:03] AI CLINICIAN: ONLINE
[00:04] HUGHSON-WESTLAKE PROTOCOL: LOADED
[00:05] 
[00:06] PATIENT PREPARATION REQUIRED:
[00:07] 1. POSITION HEADPHONES CORRECTLY
[00:08] 2. ENSURE QUIET ENVIRONMENT
[00:09] 3. READ INSTRUCTIONS BELOW
[00:10] 
[00:11] PRESS [START AUTO TEST] WHEN READY
```

### Pre-Test Guidance
```
[00:15] INITIATING AUTONOMOUS AUDIOMETRY...
[00:16] PATIENT RESPONSE PROTOCOL:
[00:17] - PRESS BUTTON FOR ANY TONE HEARD
[00:18] - RESPOND TO EVEN VERY QUIET TONES
[00:19] - DO NOT GUESS - ONLY RESPOND IF CERTAIN
[00:20] - AI WILL CONTROL ALL PARAMETERS
[00:21] 
[00:22] FAMILIARIZATION TONE INCOMING...
[00:23] LISTEN CAREFULLY AND RESPOND
```

### Familiarization Phase
```
[00:25] PRESENTING FAMILIARIZATION TONE
[00:26] FREQUENCY: 1000 HZ
[00:27] LEVEL: 60 DB HL (CLEARLY AUDIBLE)
[00:28] PURPOSE: PATIENT INSTRUCTION
[00:29] 
[00:30] THIS IS WHAT A TONE SOUNDS LIKE
[00:31] PRESS RESPONSE BUTTON NOW
```

### Active Testing Phase
```
[00:35] BEGINNING THRESHOLD MEASUREMENT
[00:36] AI CLINICIAN NOW IN CONTROL
[00:37] LISTEN FOR TONES AT ALL LEVELS
[00:38] RESPOND IMMEDIATELY WHEN HEARD

[01:15] TONE TOO QUIET - INCREASING VOLUME (30 -> 40 DB HL)
[01:22] RESPONSE DETECTED - SEEKING THRESHOLD (40 -> 35 DB HL)
[01:28] THRESHOLD ESTABLISHED - HIGH CONFIDENCE AT 35 DB HL
```

### Frequency/Ear Transitions
```
[02:45] THRESHOLD MEASUREMENT COMPLETE
[02:46] CONFIDENCE LEVEL: EXCELLENT
[02:47] PROCEEDING TO NEXT FREQUENCY

[03:15] FREQUENCY CHANGE IN PROGRESS (1000 -> 2000 HZ)
[03:16] ADJUSTING TEST PARAMETERS
[03:17] CONTINUE LISTENING AND RESPONDING

[08:30] EAR ASSESSMENT COMPLETE
[08:31] SWITCHING TO OPPOSITE EAR
[08:32] BILATERAL TESTING REQUIRED
[08:33] CONTINUE NORMAL RESPONSES
```

### Test Completion
```
[15:45] AUDIOMETRIC ASSESSMENT COMPLETE
[15:46] GENERATING CLINICAL REPORT...
[15:47] THRESHOLD DATA VALIDATED
[15:48] CONFIDENCE METRICS CALCULATED
[15:49] 
[15:50] TEST RESULTS AVAILABLE BELOW
```

## AI Decision Explanations

### Clinical Decision Format
```
[HH:MM:SS] DECISION_TYPE (PARAMETERS)
```

### Decision Types and Examples

#### Intensity Adjustments
```
[01:15] TONE TOO QUIET - INCREASING VOLUME (30 -> 40 DB HL)
[01:22] RESPONSE DETECTED - SEEKING THRESHOLD (40 -> 35 DB HL)
[01:28] THRESHOLD ESTABLISHED - HIGH CONFIDENCE AT 35 DB HL
```

#### Protocol Decisions
```
[02:45] FREQUENCY CHANGE IN PROGRESS (1000 -> 2000 HZ)
[08:30] EAR COMPLETION - SWITCHING TO OPPOSITE EAR
[15:45] BILATERAL ASSESSMENT COMPLETE
```

#### Quality Control
```
[03:22] RESPONSE VALIDATION - QUALITY CHECK
[04:15] ANTICIPATORY RESPONSE DETECTED - POSSIBLE GUESSING
[05:30] HIGH FATIGUE DETECTED - TEST RELIABILITY COMPROMISED
```

## Post-Test Clinical Summary

### Report Window Design
```
═══════════════════════════════════════════════
          AUDIOMETRIC ASSESSMENT REPORT
               MODEL 1975-AI SYSTEM
═══════════════════════════════════════════════
DATE: 12/19/2024                    TIME: 14:30:15
PROTOCOL: HUGHSON-WESTLAKE AUTONOMOUS
CLINICIAN: AI SYSTEM v1.0
═══════════════════════════════════════════════

TEST SUMMARY
───────────────────────────────────────────────
TESTS COMPLETED: 12/12
OVERALL CONFIDENCE: 85%
TEST RELIABILITY: EXCELLENT
RESPONSE CONSISTENCY: 80%
VALIDITY: NORMAL RESPONSE PATTERNS

HEARING THRESHOLDS
───────────────────────────────────────────────
FREQUENCY    LEFT EAR    RIGHT EAR    DIFFERENCE
250          25          20           5 dB
500          30          25           5 dB
1000         35          30           5 dB
2000         40          35           5 dB
4000         45          40           5 dB
8000         50          45           5 dB

CLINICAL ANALYSIS
───────────────────────────────────────────────
LEFT EAR PTA (500, 1K, 2K Hz): 35 dB HL
RIGHT EAR PTA (500, 1K, 2K Hz): 30 dB HL

HEARING LOSS CLASSIFICATION:
LEFT EAR: MILD LOSS
RIGHT EAR: MILD LOSS

QUALITY INDICATORS:
RESPONSE TIME: NORMAL
TEST COOPERATION: EXCELLENT

RECOMMENDATIONS
───────────────────────────────────────────────
• MILD HEARING LOSS DETECTED
• CONSIDER HEARING AID EVALUATION
• ANNUAL HEARING MONITORING

NOTE: RESULTS REQUIRE CLINICAL INTERPRETATION
```

## Implementation Architecture

### Core Classes
- **GuidanceSystem**: Manages message templates and display logic
- **ClinicalReportGenerator**: Creates formatted clinical reports
- **RetroAudiometerUI**: Integrates guidance with existing interface

### Event Integration
```javascript
// State changes trigger guidance updates
document.addEventListener('clinician-state-change', (event) => {
    this.handleStateChange(event.detail);
    this.showStateGuidance(event.detail.state);
});

// Clinical decisions get formatted explanations
document.addEventListener('clinical-decision', (event) => {
    const explanation = this.guidanceSystem.formatClinicalDecision(event.detail);
    this.displayWithTypewriter(explanation, 'ai-command');
});
```

### CSS Integration
```css
/* CRT-style typewriter effect */
.typewriter {
    overflow: hidden;
    border-right: 2px solid var(--crt-green);
    white-space: nowrap;
    animation: typing 2s steps(40, end), blink-caret 0.75s step-end infinite;
}

/* Progress bar styling */
.progress-bar {
    color: var(--crt-green);
    font-family: monospace;
    letter-spacing: 1px;
}
```

## Benefits

### Educational Value
- **Clinical Context**: Every decision explained in professional terms
- **Protocol Understanding**: Clear demonstration of Hughson-Westlake procedure
- **Quality Awareness**: Real-time reliability and confidence feedback

### User Experience
- **Authentic Feel**: Maintains 1970s clinical device atmosphere
- **Clear Guidance**: No confusion about what to do or when
- **Progressive Learning**: Information revealed as needed

### Clinical Accuracy
- **Standards Compliance**: All guidance reflects proper clinical procedures
- **Professional Language**: Uses correct audiological terminology
- **Quality Metrics**: Comprehensive assessment of test reliability

This guidance system transforms the retro audiometer from a simple simulator into a comprehensive educational tool that teaches proper clinical audiometry while maintaining authentic vintage aesthetics.