# Hughson-Westlake Finite State Machine

## Overview

The AI Clinician implements the Hughson-Westlake pure-tone audiometry method as a finite state machine (FSM). This document describes the states, transitions, and rules that govern the automated testing process.

## Clinical Protocol Rules

### Core Hughson-Westlake Parameters
- **Initial Level**: 40 dB HL
- **Step Up**: 10 dB (on no response)
- **Step Down**: 5 dB (on response)
- **Threshold Confirmation**: 2 out of 3 responses at the same level
- **Response Timeout**: 3 seconds
- **Safety Limits**: -10 to 120 dB HL

### Test Sequence
1. **Ear Order**: Right ear first, then left ear
2. **Frequency Order**: 1000, 2000, 4000, 500, 250, 8000 Hz (standard)
3. **Familiarization**: 1000 Hz at 60 dB HL (both ears)

## State Machine Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FINITE STATE MACHINE                      │
└─────────────────────────────────────────────────────────────┘

                         ┌──────────┐
                         │   IDLE   │
                         └────┬─────┘
                              │ beginProtocol()
                              ▼
                    ┌──────────────────┐
                    │ FAMILIARIZATION  │
                    └────┬─────────────┘
                         │ Patient ready
                         ▼
                    ┌──────────────┐
              ┌────▶│ PRESENT_TONE │◀────┐
              │     └──────┬───────┘     │
              │            │             │
              │            ▼             │
              │     ┌──────────────┐    │
              │     │ WAIT_RESPONSE│    │
              │     └──────┬───────┘    │
              │            │             │
              │            ▼             │
              │     ┌─────────────────┐ │
              │     │ PROCESS_RESPONSE│ │
              │     └──────┬──────────┘ │
              │            │             │
              │            ├─────────────┘
              │            │ Not confirmed
              │            │
              │            ▼ Threshold confirmed
              │     ┌──────────────────┐
              │     │ CONFIRM_THRESHOLD│
              │     └──────┬───────────┘
              │            │
              │            ▼
              │     ┌──────────────┐
              │     │NEXT_FREQUENCY│
              │     └──────┬───────┘
              │            │
              │            ├─────────────┐
              │            │ More freqs  │
              └────────────┘             │
                                         │ All freqs done
                                         ▼
                                  ┌──────────┐
                                  │ NEXT_EAR │
                                  └────┬─────┘
                                       │
                                       ├──────────┐
                                       │ More ears│
                                       └──────────┘
                                       │ All ears done
                                       ▼
                                ┌──────────────┐
                                │TEST_COMPLETE │
                                └──────────────┘
```

## State Descriptions

### 1. IDLE
**Purpose**: Initial state before testing begins

**Entry Conditions**:
- System initialized
- No active test

**Actions**:
- Wait for `beginProtocol()` call

**Exit Conditions**:
- User starts test → FAMILIARIZATION

---

### 2. FAMILIARIZATION
**Purpose**: Introduce patient to test procedure

**Entry Conditions**:
- Test initiated by clinician

**Actions**:
1. Present 1000 Hz tone at 60 dB HL to both ears
2. Wait for patient response (4 seconds)
3. Initialize test parameters

**Exit Conditions**:
- Response received or timeout → PRESENT_TONE
- Initialize first frequency test

**Variables Set**:
```javascript
currentEarIndex = 0
currentFrequencyIndex = 0
currentLevel = 40 dB HL
responsesAtLevel = []
```

---

### 3. PRESENT_TONE
**Purpose**: Present pure tone stimulus to patient

**Entry Conditions**:
- Threshold not yet confirmed for current frequency
- Valid test parameters set

**Actions**:
1. Get current ear, frequency, and level
2. Log presentation details
3. Call `audioEngine.playTone(frequency, level, ear, 1000ms)`
4. Dispatch UI update event

**Exit Conditions**:
- Tone presentation complete → WAIT_RESPONSE

**Console Output**:
```
🔊 Presenting 1000 Hz at 40 dB HL (right ear)
```

---

### 4. WAIT_RESPONSE
**Purpose**: Wait for patient button press

**Entry Conditions**:
- Tone has been presented

**Actions**:
1. Start response timer (3000ms)
2. Listen for 'patient-response' event
3. Record response (true/false)
4. Store response data

**Exit Conditions**:
- Response received → PROCESS_RESPONSE (response = true)
- Timeout → PROCESS_RESPONSE (response = false)

**Data Recorded**:
```javascript
{
    level: currentLevel,
    response: true/false,
    timestamp: Date.now()
}
```

**Console Output**:
```
📝 Response at 40 dB HL: YES
📝 Response at 35 dB HL: NO
```

---

### 5. PROCESS_RESPONSE
**Purpose**: Apply Hughson-Westlake rules to adjust level

**Entry Conditions**:
- Response recorded (yes or no)

**Actions**:
1. Check last response
2. Apply level adjustment rules:
   - **If response = true**: `currentLevel -= 5 dB` (step down)
   - **If response = false**: `currentLevel += 10 dB` (step up)
3. Apply safety limits (-10 to 120 dB HL)
4. Check if threshold should be confirmed

**Exit Conditions**:
- Threshold confirmation criteria met → CONFIRM_THRESHOLD
- More responses needed → PRESENT_TONE

**Level Adjustment Logic**:
```javascript
if (lastResponse.response) {
    currentLevel -= STEP_DOWN;  // -5 dB
    console.log('⬇️ Response detected - decreasing');
} else {
    currentLevel += STEP_UP;    // +10 dB
    console.log('⬆️ No response - increasing');
}

// Apply limits
currentLevel = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, currentLevel));
```

**Console Output**:
```
⬇️ Response detected - decreasing to 35 dB HL
⬆️ No response - increasing to 45 dB HL
```

---

### 6. CONFIRM_THRESHOLD
**Purpose**: Verify threshold using 2 out of 3 rule

**Entry Conditions**:
- Sufficient responses collected
- Potential threshold identified

**Actions**:
1. Group responses by level
2. Apply 2 out of 3 confirmation rule:
   - Find levels with ≥3 responses
   - Check if ≥2 responses are positive
3. Select lowest confirmed level as threshold
4. Calculate confidence score
5. Store result

**Exit Conditions**:
- Threshold confirmed → NEXT_FREQUENCY
- Threshold not confirmed → PRESENT_TONE (continue testing)

**Confirmation Algorithm**:
```javascript
// Group responses by level
levelGroups = {
    40: { positive: 2, total: 3 },  // ✓ Confirmed (2/3)
    35: { positive: 1, total: 3 },  // ✗ Not confirmed (1/3)
    45: { positive: 3, total: 3 }   // ✓ Confirmed (3/3)
}

// Find lowest confirmed level
threshold = 40 dB HL  // Lowest level with 2+ positive responses
```

**Console Output**:
```
✅ Threshold confirmed: 40 dB HL
```

**Data Stored**:
```javascript
{
    threshold: 40,
    confidence: 0.85,
    responses: 12,
    malingeringRisk: 0.1
}
```

---

### 7. NEXT_FREQUENCY
**Purpose**: Advance to next frequency in test sequence

**Entry Conditions**:
- Threshold confirmed for current frequency

**Actions**:
1. Increment frequency index
2. Check if more frequencies remain
3. Reset level to initial (40 dB HL)
4. Clear response history

**Exit Conditions**:
- More frequencies → PRESENT_TONE
- All frequencies complete → NEXT_EAR

**Reset Variables**:
```javascript
currentFrequencyIndex++
currentLevel = INITIAL_LEVEL  // 40 dB HL
responsesAtLevel = []
```

---

### 8. NEXT_EAR
**Purpose**: Switch to testing opposite ear

**Entry Conditions**:
- All frequencies tested for current ear

**Actions**:
1. Increment ear index
2. Check if more ears remain
3. Reset frequency index to 0
4. Reset level to initial

**Exit Conditions**:
- More ears → PRESENT_TONE
- All ears complete → TEST_COMPLETE

**Console Output**:
```
👂 Switching to left ear
```

**Reset Variables**:
```javascript
currentEarIndex++
currentFrequencyIndex = 0
currentLevel = INITIAL_LEVEL
```

---

### 9. TEST_COMPLETE
**Purpose**: Finalize test and generate report

**Entry Conditions**:
- All ears and frequencies tested

**Actions**:
1. Calculate test summary
2. Generate malingering analysis
3. Calculate reliability scores
4. Create final report
5. Dispatch completion event
6. Set `isTestActive = false`

**Exit Conditions**:
- Report generated → IDLE

**Console Output**:
```
🎉 Hughson-Westlake test completed
📋 Test Results Summary:
right_1000: 40 dB HL (confidence: 85%)
right_2000: 35 dB HL (confidence: 90%)
...
```

**Report Structure**:
```javascript
{
    protocol: 'Hughson-Westlake',
    testResults: {
        'right_1000': { threshold: 40, confidence: 0.85, ... },
        'right_2000': { threshold: 35, confidence: 0.90, ... },
        ...
    },
    malingeringAnalysis: { ... },
    testDuration: 420000,  // ms
    reliability: 0.88,
    summary: { ... }
}
```

---

## Threshold Confirmation Algorithm

### 2 out of 3 Rule Implementation

```javascript
function shouldConfirmThreshold(responsesAtLevel) {
    // Group responses by level
    const levelGroups = {};
    
    responsesAtLevel.forEach(response => {
        if (!levelGroups[response.level]) {
            levelGroups[response.level] = [];
        }
        levelGroups[response.level].push(response);
    });
    
    // Check each level for 2/3 confirmation
    for (const level in levelGroups) {
        const responses = levelGroups[level];
        
        if (responses.length >= 3) {
            const positiveCount = responses.filter(r => r.response).length;
            
            if (positiveCount >= 2) {
                return true;  // 2 out of 3 rule satisfied
            }
        }
    }
    
    return false;
}

function calculateThreshold(responsesAtLevel) {
    const levelGroups = {};
    
    // Group and count responses
    responsesAtLevel.forEach(r => {
        if (!levelGroups[r.level]) {
            levelGroups[r.level] = { positive: 0, total: 0 };
        }
        levelGroups[r.level].total++;
        if (r.response) levelGroups[r.level].positive++;
    });
    
    // Find lowest level with 2+ positive responses out of 3+ total
    let lowestThreshold = null;
    
    for (const level in levelGroups) {
        const group = levelGroups[level];
        const levelNum = parseInt(level);
        
        if (group.total >= 3 && group.positive >= 2) {
            if (lowestThreshold === null || levelNum < lowestThreshold) {
                lowestThreshold = levelNum;
            }
        }
    }
    
    return lowestThreshold;
}
```

### Example Threshold Determination

**Scenario**: Testing 1000 Hz, right ear

| Presentation | Level (dB HL) | Response | Action |
|--------------|---------------|----------|--------|
| 1 | 40 | NO | Increase +10 |
| 2 | 50 | YES | Decrease -5 |
| 3 | 45 | YES | Decrease -5 |
| 4 | 40 | YES | Decrease -5 |
| 5 | 35 | NO | Increase +10 |
| 6 | 45 | YES | Decrease -5 |
| 7 | 40 | YES | Decrease -5 |
| 8 | 35 | NO | Increase +10 |
| 9 | 45 | YES | **Confirm** |

**Analysis**:
- Level 40: 1 NO, 2 YES (2/3) ✓
- Level 45: 3 YES (3/3) ✓
- Level 35: 2 NO (0/2) ✗

**Result**: Threshold = 40 dB HL (lowest confirmed level)

---

## Confidence Calculation

Confidence is calculated based on response consistency:

```javascript
function calculateConfidence(responsesAtLevel) {
    const levelGroups = {};
    
    // Group responses by level
    responsesAtLevel.forEach(r => {
        if (!levelGroups[r.level]) {
            levelGroups[r.level] = { positive: 0, total: 0 };
        }
        levelGroups[r.level].total++;
        if (r.response) levelGroups[r.level].positive++;
    });
    
    // Calculate consistency score
    let consistencyScore = 0;
    let totalGroups = 0;
    
    for (const level in levelGroups) {
        const group = levelGroups[level];
        
        if (group.total >= 2) {
            const consistency = group.positive / group.total;
            
            // All positive or all negative = high consistency
            if (consistency === 0 || consistency === 1) {
                consistencyScore += 1.0;
            } 
            // Mostly consistent
            else if (consistency >= 0.66 || consistency <= 0.33) {
                consistencyScore += 0.5;
            }
            
            totalGroups++;
        }
    }
    
    const confidence = totalGroups > 0 
        ? consistencyScore / totalGroups 
        : 0.5;
    
    return Math.min(0.95, Math.max(0.3, confidence));
}
```

**Confidence Levels**:
- **0.9-1.0**: Excellent consistency
- **0.7-0.9**: Good consistency
- **0.5-0.7**: Moderate consistency
- **0.3-0.5**: Poor consistency
- **<0.3**: Unreliable

---

## Safety Features

### Level Limits
```javascript
const MIN_LEVEL = -10;  // dB HL
const MAX_LEVEL = 120;  // dB HL

currentLevel = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, currentLevel));
```

### Maximum Responses
```javascript
if (responsesAtLevel.length > 15) {
    console.log('⚠️ Maximum responses reached - forcing threshold calculation');
    setState('CONFIRM_THRESHOLD');
}
```

### Test Interruption
```javascript
stopTest() {
    isTestActive = false;
    setState('IDLE');
    // Save partial results
}
```

---

## Event System

### Events Dispatched

1. **clinician-state-change**
   ```javascript
   { state, ear, frequency, level }
   ```

2. **tone-presented**
   ```javascript
   { frequency, level, ear, duration }
   ```

3. **test-completed**
   ```javascript
   { protocol, testResults, malingeringAnalysis, ... }
   ```

4. **test-stopped**
   ```javascript
   { reason, partialResults }
   ```

### Events Listened

1. **patient-response**
   - Triggered by patient button press
   - Handled in WAIT_RESPONSE state

---

## Usage Example

```javascript
import { AIClinician } from './clinician/AIClinician.js';
import { AudioGenerator } from './audio/AudioGenerator.js';
import { TestSession } from './state/TestSession.js';

// Initialize components
const audioEngine = new AudioGenerator();
await audioEngine.initialize();

const clinician = new AIClinician();
const session = new TestSession();

// Start test
await clinician.beginProtocol(audioEngine, session);

// Patient presses button when hearing tone
document.getElementById('patient-button').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('patient-response', {
        detail: { timestamp: Date.now() }
    }));
});

// Listen for completion
document.addEventListener('test-completed', (event) => {
    console.log('Test complete!', event.detail);
});
```

---

## Clinical Validation

This implementation follows:
- **ANSI S3.21-2004**: Methods for Manual Pure-Tone Threshold Audiometry
- **ISO 8253-1:2010**: Acoustics — Audiometric test methods
- **ASHA Guidelines**: American Speech-Language-Hearing Association standards

---

## References

1. Hughson, W., & Westlake, H. (1944). Manual for program outline for rehabilitation of aural casualties both military and civilian. *Transactions of the American Academy of Ophthalmology and Otolaryngology*, 48(Suppl), 1-15.

2. Carhart, R., & Jerger, J. (1959). Preferred method for clinical determination of pure-tone thresholds. *Journal of Speech and Hearing Disorders*, 24, 330-345.

3. ANSI S3.21-2004: Methods for Manual Pure-Tone Threshold Audiometry

4. ISO 8253-1:2010: Acoustics — Audiometric test methods — Part 1: Pure-tone air and bone conduction audiometry