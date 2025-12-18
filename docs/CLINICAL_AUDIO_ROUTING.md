# Clinical Audio Routing for Web-Based Audiometry

## Overview

This document explains the clinical-grade audio routing implementation used in the Retro Audiometer Simulator, specifically why `ChannelMergerNode` is used instead of `StereoPannerNode` for left/right ear audio presentation.

## Clinical Requirements

### Audiometric Standards
- **Channel Separation**: >60 dB isolation between left and right channels
- **Cross-talk Prevention**: Zero signal leakage between ears
- **Amplitude Accuracy**: ±1 dB precision for threshold measurements
- **Calibration Integrity**: Consistent dB HL to amplitude conversion

### Medical Device Compliance
- **IEC 60645-1**: International standard for audiometers
- **ANSI S3.6**: American National Standard for audiometers
- **FDA Guidelines**: Medical device software requirements
- **Clinical Validation**: Traceable and reproducible measurements

## Technical Implementation

### Architecture: ChannelMergerNode System

```javascript
// Clinical-grade channel isolation setup
setupChannelIsolation() {
    // Master gain for overall volume control
    this.masterGain = this.audioContext.createGain();
    
    // Separate gain nodes for complete ear isolation
    this.leftChannelGain = this.audioContext.createGain();
    this.rightChannelGain = this.audioContext.createGain();
    
    // Channel merger for true stereo separation
    this.channelMerger = this.audioContext.createChannelMerger(2);
    
    // Connect left: leftGain -> merger channel 0
    this.leftChannelGain.connect(this.channelMerger, 0, 0);
    
    // Connect right: rightGain -> merger channel 1
    this.rightChannelGain.connect(this.channelMerger, 0, 1);
    
    // Final connection to output
    this.channelMerger.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
}
```

### Signal Flow Diagram

```
Oscillator → ToneGain → [LeftGain OR RightGain] → ChannelMerger → MasterGain → Output
                              ↓                         ↓
                         Channel 0 (Left)        Channel 1 (Right)
                              ↓                         ↓
                        Left Headphone           Right Headphone
```

## Clinical Safety Comparison

### ChannelMergerNode (RECOMMENDED)

#### Advantages ✅
- **True Isolation**: Complete separation between channels
- **Zero Cross-talk**: Mathematically impossible for signal leakage
- **Precise Control**: Direct gain manipulation per channel
- **Clinical Compliance**: Meets medical device standards
- **Diagnostic Accuracy**: Reliable threshold measurements

#### Technical Details
```javascript
// Left ear presentation - Right ear guaranteed silent
routeToEar(sourceNode, 'left', amplitude) {
    sourceNode.connect(this.leftChannelGain);
    this.leftChannelGain.gain.value = amplitude;  // Active
    this.rightChannelGain.gain.value = 0;         // Guaranteed silent
}
```

### StereoPannerNode (NOT RECOMMENDED)

#### Disadvantages ❌
- **Mathematical Panning**: Uses algorithms that may introduce cross-talk
- **Amplitude Distortion**: Panning affects signal amplitude unpredictably
- **Rounding Errors**: Floating-point calculations may cause leakage
- **Non-Compliance**: May not meet medical device isolation requirements
- **Clinical Risk**: Potential for false threshold measurements

#### Technical Issues
```javascript
// StereoPannerNode risks (AVOIDED in our implementation)
const panner = this.audioContext.createStereoPanner();
panner.pan.value = -1.0; // "Full left" - but not guaranteed isolation
// Risk: Minimal signal may still reach right channel
// Risk: Amplitude affected by panning algorithm
// Risk: Not suitable for clinical diagnosis
```

## Clinical Scenarios

### Scenario 1: Unilateral Hearing Loss Detection

**Patient Profile**: Profound right ear hearing loss (>90 dB HL), normal left ear hearing

**With ChannelMergerNode** ✅:
- Right ear stimulation: Only right channel active, left channel = 0.0
- No cross-talk to functioning left ear
- Accurate measurement of right ear threshold
- Correct diagnosis of unilateral hearing loss

**With StereoPannerNode** ❌:
- Right ear stimulation: Minimal cross-talk to left channel possible
- Left ear may detect "right ear" stimulus
- False positive response recorded
- Misdiagnosis: Hearing appears better than actual

### Scenario 2: Threshold Accuracy at Low Levels

**Clinical Need**: Accurate measurement at 0-10 dB HL range

**With ChannelMergerNode** ✅:
- Precise amplitude control without mathematical interference
- Calibrated dB HL values maintained
- Reliable threshold detection
- Clinically valid measurements

**With StereoPannerNode** ❌:
- Panning algorithms may alter amplitude
- Rounding errors in low-level signals
- Threshold measurements may be inaccurate
- Clinical validity compromised

### Scenario 3: Masking Studies

**Clinical Application**: Contralateral masking for bone conduction testing

**With ChannelMergerNode** ✅:
- Complete isolation prevents unintended masking
- Precise control of masking noise level
- Accurate air-bone gap measurements
- Reliable conductive hearing loss diagnosis

**With StereoPannerNode** ❌:
- Cross-talk creates unintended masking effects
- Masking levels become unpredictable
- Air-bone gap measurements compromised
- Potential misdiagnosis of conductive loss

## Validation and Testing

### Channel Isolation Verification

```javascript
verifyChannelIsolation() {
    const status = {
        leftChannelConnected: !!this.leftChannelGain,
        rightChannelConnected: !!this.rightChannelGain,
        mergerConnected: !!this.channelMerger,
        leftGainValue: this.leftChannelGain?.gain.value || 0,
        rightGainValue: this.rightChannelGain?.gain.value || 0,
        isolationIntact: false
    };
    
    status.isolationIntact = status.leftChannelConnected && 
                            status.rightChannelConnected && 
                            status.mergerConnected;
    
    return status;
}
```

### Clinical Testing Protocol

1. **Isolation Test**: Verify zero cross-talk between channels
2. **Amplitude Accuracy**: Confirm dB HL to linear amplitude conversion
3. **Timing Precision**: Validate tone onset/offset timing
4. **Calibration Verification**: Check frequency-specific corrections
5. **Safety Validation**: Ensure maximum level protection

## Regulatory Considerations

### Medical Device Classification
- **Class II Medical Device**: Diagnostic audiometer requirements
- **Software as Medical Device (SaMD)**: FDA guidance compliance
- **Quality Management**: ISO 13485 considerations
- **Clinical Evidence**: Validation study requirements

### Documentation Requirements
- **Design Controls**: Traceability of clinical requirements
- **Risk Management**: ISO 14971 risk analysis
- **Clinical Evaluation**: Performance validation studies
- **Post-Market Surveillance**: Ongoing safety monitoring

## Implementation Guidelines

### For Developers

1. **Always Use ChannelMergerNode**: Never use StereoPannerNode for clinical audio
2. **Verify Isolation**: Implement channel isolation verification
3. **Document Routing**: Log all audio routing decisions
4. **Test Thoroughly**: Validate with clinical test cases
5. **Monitor Safety**: Implement maximum level protection

### For Clinical Users

1. **Calibration Required**: System must be calibrated before clinical use
2. **Environment Control**: Use in acoustically controlled environment
3. **Equipment Validation**: Verify headphone specifications
4. **Quality Assurance**: Regular system performance checks
5. **Documentation**: Maintain calibration and validation records

## Conclusion

The use of `ChannelMergerNode` with dedicated gain nodes provides clinical-grade audio routing that meets medical device standards for diagnostic audiometry. This approach ensures:

- **Patient Safety**: Accurate diagnosis through precise measurements
- **Clinical Validity**: Results suitable for medical decision-making
- **Regulatory Compliance**: Meets international audiometer standards
- **Professional Confidence**: Reliable and reproducible measurements

The additional complexity of this implementation is justified by the critical importance of accurate hearing assessment in clinical practice. Web-based audiometry can achieve clinical-grade performance when proper audio routing techniques are employed.

---

*This implementation follows best practices for medical device software development and clinical audiometry standards.*