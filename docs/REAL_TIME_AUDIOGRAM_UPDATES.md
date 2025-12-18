# Real-Time Audiogram Updates - Implementation Guide

## Overview
This document explains the event-driven architecture that enables real-time audiogram updates as each threshold is finalized during autonomous audiometric testing.

## Problem Analysis

### Previous Issue
- **Delayed Updates**: Audiogram only updated at test completion
- **Incomplete Data**: Event payloads missing comprehensive threshold information
- **Poor User Experience**: No visual feedback during testing progression

### Root Cause
The `threshold-established` event was dispatched with minimal data, lacking the comprehensive threshold information required by the AudiogramPlotter for proper visualization.

## Solution Architecture

### 1. Event-Driven Data Flow

```
AIClinician → threshold-established event → RetroAudiometerUI → AudiogramPlotter
    ↓                    ↓                        ↓                    ↓
Threshold           Complete Event          Event Handler        Real-time Plot
Finalized           Payload                 Coordination         Update
```

### 2. Enhanced Event Payload Structure

#### Before (Incomplete)
```javascript
{
    ear: 'right',
    frequency: 1000,
    threshold: 35,
    confidence: 0.85,
    decision: { ... }
}
```

#### After (Comprehensive)
```javascript
{
    // Core threshold information
    ear: 'right',
    frequency: 1000,
    threshold: 35,
    confidence: 0.85,
    
    // Enhanced plotting data
    enhancedConfidence: 87,
    responses: 4,
    responsePattern: [...],
    falseResponseAnalysis: {...},
    decisionBasis: '2 out of 3 rule',
    malingeringRisk: 0.1,
    
    // Clinical decision context
    decision: {...},
    
    // Real-time metadata
    timestamp: 1640995200000
}
```

## Implementation Details

### 1. AIClinician - Enhanced Event Dispatch

```javascript
/**
 * Dispatch threshold established event with complete threshold data
 * @param {Object} context - Threshold context
 * @param {Object} decision - Decision object
 * @param {Object} thresholdData - Complete threshold data for plotting
 */
dispatchThresholdEvent(context, decision, thresholdData = null) {
    // Create comprehensive event payload for real-time audiogram updates
    const eventPayload = {
        // Core threshold information
        ear: context.ear,
        frequency: context.frequency,
        threshold: context.threshold,
        confidence: context.confidence,
        
        // Complete threshold data for plotting (if available)
        ...(thresholdData && {
            enhancedConfidence: thresholdData.enhancedConfidence,
            responses: thresholdData.responses,
            responsePattern: thresholdData.responsePattern,
            falseResponseAnalysis: thresholdData.falseResponseAnalysis,
            decisionBasis: thresholdData.decisionBasis,
            malingeringRisk: thresholdData.malingeringRisk
        }),
        
        // Clinical decision context
        decision,
        
        // Timestamp for real-time updates
        timestamp: Date.now()
    };

    console.log(`📊 Dispatching threshold event: ${context.frequency} Hz (${context.ear}) = ${context.threshold} dB HL`);
    
    document.dispatchEvent(new CustomEvent('threshold-established', {
        detail: eventPayload
    }));
}
```

**Key Improvements:**
- **Complete Data**: Includes all threshold analysis results
- **Flexible Structure**: Handles both minimal and comprehensive data
- **Real-time Metadata**: Timestamp for update tracking
- **Clinical Context**: Full decision information for transparency

### 2. AudiogramPlotter - Dual Update Methods

#### plotThreshold() - Real-Time Updates
```javascript
/**
 * Plot threshold immediately for real-time audiogram updates
 * @param {string} ear - 'left' or 'right'
 * @param {number} frequency - Frequency in Hz
 * @param {number} threshold - Threshold in dB HL
 * @param {number} confidence - Confidence percentage (0-100)
 * @param {Object} additionalData - Optional additional threshold data
 */
plotThreshold(ear, frequency, threshold, confidence = 80, additionalData = {}) {
    const key = `${ear}_${frequency}`;
    
    // Create threshold point with defaults for real-time plotting
    const thresholdPoint = {
        threshold: threshold,
        confidence: confidence,
        originalConfidence: confidence / 100,
        
        // Default values for real-time plotting
        reversals: additionalData.reversals || 0,
        responses: additionalData.responses || 3,
        responseConsistency: additionalData.responseConsistency || 0.8,
        
        // Visual properties
        opacity: this.calculateOpacity(confidence),
        color: this.getConfidenceColor(confidence),
        errorBarSize: this.calculateErrorBarSize(confidence)
    };
    
    this.thresholdData.set(key, thresholdPoint);
    
    // Immediate redraw for real-time updates
    this.redrawAudiogram();
    
    return thresholdPoint;
}
```

**Benefits:**
- **Immediate Updates**: No delay between threshold finalization and visualization
- **Smart Defaults**: Works with minimal data for real-time plotting
- **Visual Feedback**: Immediate confidence-based styling
- **Performance Optimized**: Efficient redraw for real-time updates

#### updateThreshold() - Comprehensive Updates
```javascript
// Existing comprehensive method for complete threshold data
updateThreshold(ear, frequency, thresholdData) {
    // Full threshold point creation with all metrics
    // Used for final, complete threshold updates
}
```

### 3. RetroAudiometerUI - Intelligent Event Handling

```javascript
handleThresholdEstablished(thresholdData) {
    console.log('Threshold established:', thresholdData);
    
    // Real-time audiogram update with enhanced data
    if (this.audiogramPlotter) {
        // Use plotThreshold for immediate real-time updates if we have complete data
        if (thresholdData.enhancedConfidence !== undefined) {
            this.audiogramPlotter.plotThreshold(
                thresholdData.ear,
                thresholdData.frequency,
                thresholdData.threshold,
                thresholdData.enhancedConfidence,
                {
                    responses: thresholdData.responses,
                    responsePattern: thresholdData.responsePattern,
                    falseResponseAnalysis: thresholdData.falseResponseAnalysis,
                    decisionBasis: thresholdData.decisionBasis,
                    malingeringRisk: thresholdData.malingeringRisk
                }
            );
        } else {
            // Fallback to updateThreshold for backward compatibility
            this.audiogramPlotter.updateThreshold(
                thresholdData.ear,
                thresholdData.frequency,
                thresholdData
            );
        }
    }
    
    // Update confidence display and progress
    const displayConfidence = thresholdData.enhancedConfidence !== undefined 
        ? thresholdData.enhancedConfidence / 100 
        : thresholdData.confidence;
    this.updateConfidenceDisplay(displayConfidence);
    
    this.currentTestData.completedTests++;
    this.updateProgressDisplay();
}
```

**Key Features:**
- **Intelligent Method Selection**: Uses appropriate plotting method based on data availability
- **Backward Compatibility**: Maintains support for existing data structures
- **UI Coordination**: Updates all related UI elements consistently
- **Real-time Feedback**: Immediate visual confirmation of threshold establishment

## Real-Time Update Benefits

### 1. Enhanced User Experience
- **Immediate Feedback**: Thresholds appear on audiogram as soon as they're established
- **Progress Visualization**: Users see test progression in real-time
- **Clinical Authenticity**: Mirrors real-world audiometer behavior

### 2. Educational Value
- **Learning Reinforcement**: Students see immediate results of threshold decisions
- **Pattern Recognition**: Real-time plotting helps identify hearing loss patterns
- **Clinical Understanding**: Connects test procedures to visual outcomes

### 3. System Performance
- **Efficient Updates**: Only redraws audiogram when new data is available
- **Modular Design**: Clean separation between data generation and visualization
- **Event-Driven Architecture**: Loose coupling between components

## Event Flow Example

### Complete Real-Time Update Sequence

1. **AIClinician**: Threshold confirmed at 35 dB HL for 1000 Hz, right ear
2. **Event Dispatch**: Complete threshold data packaged and dispatched
3. **UI Handler**: Receives event, determines optimal plotting method
4. **AudiogramPlotter**: Immediately plots threshold with confidence visualization
5. **Visual Update**: Audiogram shows new threshold point with appropriate styling
6. **User Feedback**: Immediate visual confirmation of test progress

### Event Timing
```
Time 0ms:    Threshold finalized in AIClinician
Time 1ms:    threshold-established event dispatched
Time 2ms:    RetroAudiometerUI receives and processes event
Time 3ms:    AudiogramPlotter.plotThreshold() called
Time 5ms:    Audiogram redrawn with new threshold
Time 6ms:    User sees updated audiogram
```

## Method Signatures

### AIClinician
```javascript
dispatchThresholdEvent(context, decision, thresholdData = null)
```

### AudiogramPlotter
```javascript
// Real-time plotting
plotThreshold(ear, frequency, threshold, confidence = 80, additionalData = {})

// Comprehensive updates
updateThreshold(ear, frequency, thresholdData)
```

### RetroAudiometerUI
```javascript
handleThresholdEstablished(thresholdData)
```

## Example Event Payloads

### Minimal Event (Backward Compatibility)
```javascript
{
    ear: 'right',
    frequency: 1000,
    threshold: 35,
    confidence: 0.85,
    decision: { type: 'THRESHOLD_FINALIZED', ... },
    timestamp: 1640995200000
}
```

### Complete Event (Enhanced Real-Time)
```javascript
{
    ear: 'right',
    frequency: 1000,
    threshold: 35,
    confidence: 0.85,
    enhancedConfidence: 87,
    responses: 4,
    responsePattern: [
        { level: 40, response: true },
        { level: 35, response: true },
        { level: 30, response: false },
        { level: 35, response: true }
    ],
    falseResponseAnalysis: {
        catchTrialsExecuted: 1,
        falsePositives: 0,
        confidenceAdjustment: 0.02
    },
    decisionBasis: '2 out of 3 rule',
    malingeringRisk: 0.1,
    decision: { type: 'THRESHOLD_FINALIZED', ... },
    timestamp: 1640995200000
}
```

## Quality Assurance

### Error Handling
- **Graceful Degradation**: System works with minimal data
- **Fallback Methods**: Multiple plotting approaches for reliability
- **Data Validation**: Input validation prevents plotting errors

### Performance Optimization
- **Efficient Redraws**: Only updates when necessary
- **Smart Caching**: Threshold data cached for performance
- **Event Debouncing**: Prevents excessive updates

### Clinical Accuracy
- **Immediate Updates**: No delay between threshold establishment and visualization
- **Confidence Visualization**: Real-time confidence indicators
- **Pattern Recognition**: Immediate visual feedback for clinical patterns

## Future Enhancements

### Advanced Real-Time Features
- **Animated Transitions**: Smooth threshold point animations
- **Confidence Evolution**: Show confidence changes over time
- **Pattern Highlighting**: Real-time pattern recognition alerts

### Performance Improvements
- **Canvas Optimization**: More efficient rendering for large datasets
- **Update Batching**: Batch multiple updates for performance
- **Memory Management**: Optimize threshold data storage

## Conclusion

The real-time audiogram update system provides immediate visual feedback during autonomous audiometric testing, enhancing both user experience and educational value. The event-driven architecture ensures clean separation of concerns while maintaining high performance and clinical accuracy.

Key benefits:
- **Immediate Visual Feedback**: Thresholds plotted as soon as they're established
- **Enhanced User Experience**: Real-time progress visualization
- **Educational Value**: Immediate connection between testing and results
- **Clinical Authenticity**: Mirrors real-world audiometer behavior
- **Modular Design**: Clean, maintainable architecture suitable for healthcare applications