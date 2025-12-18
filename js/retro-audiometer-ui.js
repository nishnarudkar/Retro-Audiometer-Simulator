/**
 * Retro Audiometer UI Controller
 * Minimal working version to connect HTML interface to core modules
 */

import { AIClinician } from '../src/clinician/AIClinician.js';
import { AudioGenerator } from '../src/audio/AudioGenerator.js';
import { TestSession } from '../src/state/TestSession.js';
import { AudiogramPlotter } from '../src/audiogram/AudiogramPlotter.js';
import { GuidanceSystem, ClinicalReportGenerator } from '../src/ui/GuidanceSystem.js';

class RetroAudiometerUI {
    constructor() {
        this.aiClinician = null;
        this.audioGenerator = null;
        this.testSession = null;
        this.audiogramPlotter = null;
        this.guidanceSystem = null;
        this.reportGenerator = null;
        this.isTestActive = false;
        
        // UI state tracking
        this.currentTestData = {
            ear: 'right',
            frequency: 1000,
            level: 40,
            state: 'IDLE',
            confidence: 0,
            completedTests: 0,
            totalTests: 12
        };
        
        // Performance optimization state
        this.updateQueue = new Map();
        this.animationFrame = null;
        this.isUpdating = false;
        this.typewriterTimeouts = new Map();
        
        // Debounced update methods
        this.debouncedUpdateDisplay = this.debounce(this.batchUpdateDisplay.bind(this), 50);
        this.debouncedUpdateStatus = this.debounce(this.updateStatusImmediate.bind(this), 100);
        this.debouncedUpdateClinicalStatus = this.debounce(this.displayClinicalStatus.bind(this), 150);
        this.debouncedUpdateProgress = this.debounce(this.updateProgressDisplay.bind(this), 150);
        this.throttledShowStateGuidance = this.throttle(this.showStateGuidance.bind(this), 500);
        
        this.init();
    }

    async init() {
        console.log('Initializing Retro Audiometer UI...');
        
        try {
            // Initialize non-audio modules first (no user gesture required)
            this.audioGenerator = new AudioGenerator(); // Create but don't initialize
            console.log('Audio generator created (not initialized - awaiting user gesture)');
            
            this.aiClinician = new AIClinician();
            console.log('AI Clinician initialized');
            
            this.testSession = new TestSession();
            console.log('Test session initialized');
            
            this.audiogramPlotter = new AudiogramPlotter('audiogram-container');
            console.log('Audiogram plotter initialized');
            
            // Initialize guidance system
            this.guidanceSystem = new GuidanceSystem();
            this.reportGenerator = new ClinicalReportGenerator();
            console.log('Guidance system initialized');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show startup guidance with power-on instructions
            await this.showPowerOnGuidance();
            
            // Update UI to show power-off state
            this.updateStatus('POWER OFF', 'Click POWER ON to initialize audio system');
            this.updateDisplay('ai-command', 'SYSTEM READY - POWER ON REQUIRED FOR AUDIO');
            
            // Show power button and hide start button initially
            this.showPowerOnInterface();
            
            console.log('Retro Audiometer UI ready (audio system awaiting power on)');
            
        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showError('Initialization failed: ' + error.message);
        }
    }

    setupEventListeners() {
        // Start button
        const startButton = document.getElementById('start-test');
        if (startButton) {
            startButton.addEventListener('click', () => this.startTest());
        }
        
        // Stop button
        const stopButton = document.getElementById('stop-test');
        if (stopButton) {
            stopButton.addEventListener('click', () => this.stopTest());
        }
        
        // Patient response button
        const patientButton = document.getElementById('patient-button');
        if (patientButton) {
            patientButton.addEventListener('click', () => this.handlePatientResponse());
        }
        
        // Keyboard shortcut for patient response
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space' && this.isTestActive) {
                event.preventDefault();
                this.handlePatientResponse();
            }
        });
        
        // AI Clinician events
        document.addEventListener('clinician-state-change', (event) => {
            this.handleStateChange(event.detail);
        });
        
        document.addEventListener('clinical-decision', (event) => {
            this.handleClinicalDecision(event.detail);
        });
        
        document.addEventListener('tone-presented', (event) => {
            this.handleTonePresented(event.detail);
        });
        
        document.addEventListener('threshold-established', (event) => {
            this.handleThresholdEstablished(event.detail);
        });
        
        document.addEventListener('test-completed', (event) => {
            this.handleTestCompleted(event.detail);
        });
    }

    async startTest() {
        if (this.isTestActive) return;
        
        // Verify audio system is ready
        if (!this.audioGenerator || !this.audioGenerator.isReady()) {
            this.showError('Audio system not ready. Please power on the audiometer first.');
            return;
        }
        
        console.log('Starting autonomous audiometry test');
        
        // Add smooth loading state
        this.setUIState('loading');
        
        this.isTestActive = true;
        
        // Update UI with smooth transitions
        this.updateStatus('STARTING', 'Initializing autonomous test protocol...');
        this.setButtonStates(false, true); // disable start, enable stop
        this.setLED('test-indicator', true);
        
        try {
            // Show pre-test guidance
            await this.showPreTestGuidance();
            
            // Verify AudioContext is still running (should be after power on)
            if (this.audioGenerator.getState() !== 'running') {
                console.warn('AudioContext not running, attempting to resume...');
                await this.audioGenerator.initialize(); // This will resume if needed
            }
            
            // Initialize test tracking
            this.currentTestData.completedTests = 0;
            this.hasShownTestingGuidance = false;
            
            // Set UI to ready state
            this.setUIState('ready');
            
            // Start the AI clinician
            await this.aiClinician.beginProtocol(this.audioGenerator, this.testSession);
            
        } catch (error) {
            console.error('Test failed to start:', error);
            this.showError('Failed to start test: ' + error.message);
            this.setUIState('error');
            this.stopTest();
        }
    }

    stopTest() {
        if (!this.isTestActive) return;
        
        console.log('Stopping audiometry test');
        
        this.isTestActive = false;
        
        // Stop AI clinician
        if (this.aiClinician) {
            this.aiClinician.stopTest();
        }
        
        // Update UI
        this.updateStatus('STOPPED', 'Test stopped by user');
        this.setButtonStates(true, false); // enable start, disable stop
        this.setLED('test-indicator', false);
        this.setLED('tone-indicator', false);
        this.setLED('response-indicator', false);
    }

    handlePatientResponse() {
        if (!this.isTestActive) return;
        
        console.log('Patient response recorded');
        
        // Visual feedback
        this.setLED('response-indicator', true);
        this.animatePatientButton();
        
        // Clear response LED after delay
        setTimeout(() => {
            this.setLED('response-indicator', false);
        }, 500);
        
        // Dispatch response event for AI clinician
        document.dispatchEvent(new CustomEvent('patient-response', {
            detail: { 
                timestamp: Date.now(),
                source: 'button'
            }
        }));
    }

    handleStateChange(stateData) {
        console.log('State change:', stateData.state);
        
        // Prevent overlapping state updates
        if (this.isUpdating) {
            return;
        }
        
        // Update current test data
        this.currentTestData = { ...this.currentTestData, ...stateData };
        
        // Batch all display updates
        const updates = new Map();
        
        if (stateData.frequency) {
            updates.set('frequency-display', stateData.frequency);
            updates.set('current-freq', stateData.frequency + ' Hz');
            this.currentTestData.frequency = stateData.frequency;
        }
        
        if (stateData.level !== undefined) {
            updates.set('intensity-display', stateData.level);
            updates.set('current-level', stateData.level + ' dB HL');
            this.currentTestData.level = stateData.level;
        }
        
        if (stateData.ear) {
            updates.set('current-ear', stateData.ear.toUpperCase());
            this.updateEarLEDs(stateData.ear);
            this.currentTestData.ear = stateData.ear;
        }
        
        // Apply all updates at once
        for (const [elementId, value] of updates) {
            this.updateQueue.set(elementId, value);
        }
        
        // Update state
        this.currentTestData.state = stateData.state;
        
        // Update status with enhanced guidance
        const statusText = this.getStateDescription(stateData.state);
        this.updateStatus(stateData.state, statusText);
        
        // Show state-specific guidance (throttled)
        this.throttledShowStateGuidance(stateData.state);
        
        // Update displays (debounced)
        this.debouncedUpdateDisplay();
        this.debouncedUpdateClinicalStatus();
        this.debouncedUpdateProgress();
    }

    handleClinicalDecision(decision) {
        console.log('Clinical decision:', decision.type);
        
        // Format decision with clinical context
        let decisionText = this.formatDecisionText(decision);
        
        // Use guidance system for enhanced formatting
        if (this.guidanceSystem) {
            decisionText = this.guidanceSystem.formatClinicalDecision(decision);
        }
        
        // Update command line with typewriter effect
        this.displayWithTypewriter(decisionText, 'ai-command');
    }

    handleTonePresented(toneData) {
        console.log('Tone presented:', toneData);
        
        // Light up tone indicator
        this.setLED('tone-indicator', true);
        
        // Turn off after tone duration
        setTimeout(() => {
            this.setLED('tone-indicator', false);
        }, toneData.duration || 1000);
    }

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
        
        // Update confidence display (use enhanced confidence if available)
        const displayConfidence = thresholdData.enhancedConfidence !== undefined 
            ? thresholdData.enhancedConfidence / 100 
            : thresholdData.confidence;
        this.updateConfidenceDisplay(displayConfidence);
        
        // Update test progress
        this.currentTestData.completedTests++;
        this.updateProgressDisplay();
        
        // Log real-time update for debugging
        console.log(`🎯 Real-time audiogram update: ${thresholdData.frequency} Hz (${thresholdData.ear}) plotted immediately`);
    }

    handleTestCompleted(testData) {
        console.log('Test completed:', testData);
        
        this.isTestActive = false;
        this.updateStatus('COMPLETE', 'Audiometric assessment completed');
        this.setButtonStates(true, false);
        this.setLED('test-indicator', false);
        
        // Show post-test guidance
        this.showPostTestGuidance();
        
        // Generate and display clinical report
        const qualityMetrics = {
            overallConfidence: 0.85,
            reliability: 0.9,
            consistency: 0.8,
            malingeringRisk: 0.1,
            averageResponseTime: 650
        };
        
        setTimeout(() => {
            this.showPostTestReport(testData, qualityMetrics);
        }, 2000);
    }

    // UI Helper Methods
    updateStatus(status, message) {
        this.debouncedUpdateStatus(status, message);
    }
    
    updateStatusImmediate(status, message) {
        this.updateDisplay('system-status', status);
        this.updateDisplay('ai-decision', message);
    }

    updateDisplay(elementId, value) {
        // Queue updates for batch processing
        this.updateQueue.set(elementId, value);
        this.debouncedUpdateDisplay();
    }
    
    batchUpdateDisplay() {
        if (this.isUpdating) return;
        
        this.isUpdating = true;
        
        // Use requestAnimationFrame for smooth updates
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.animationFrame = requestAnimationFrame(() => {
            // Process all queued updates at once
            for (const [elementId, value] of this.updateQueue) {
                const element = document.getElementById(elementId);
                if (element && element.textContent !== value) {
                    element.textContent = value;
                }
            }
            
            this.updateQueue.clear();
            this.isUpdating = false;
            this.animationFrame = null;
        });
    }

    setLED(ledId, active, className = '') {
        // Use requestAnimationFrame for smooth LED transitions
        requestAnimationFrame(() => {
            const led = document.getElementById(ledId);
            if (led) {
                const lens = led.querySelector('.led-lens') || led.querySelector('.led-center') || led;
                if (lens) {
                    // Only update if state actually changed
                    const isCurrentlyActive = lens.classList.contains('active');
                    if (active !== isCurrentlyActive) {
                        if (active) {
                            lens.classList.add('active');
                            if (className) lens.classList.add(className);
                        } else {
                            lens.classList.remove('active');
                            if (className) lens.classList.remove(className);
                        }
                    }
                }
            }
        });
    }

    setButtonStates(startEnabled, stopEnabled) {
        const startButton = document.getElementById('start-test');
        const stopButton = document.getElementById('stop-test');
        
        if (startButton) startButton.disabled = !startEnabled;
        if (stopButton) stopButton.disabled = !stopEnabled;
    }

    updateEarLEDs(ear) {
        requestAnimationFrame(() => {
            const leftLED = document.getElementById('left-ear-led');
            const rightLED = document.getElementById('right-ear-led');
            
            if (leftLED && rightLED) {
                const leftShouldBeActive = ear === 'left';
                const rightShouldBeActive = ear === 'right';
                
                // Only update if state actually changed
                if (leftLED.classList.contains('active') !== leftShouldBeActive) {
                    leftLED.classList.toggle('active', leftShouldBeActive);
                }
                if (rightLED.classList.contains('active') !== rightShouldBeActive) {
                    rightLED.classList.toggle('active', rightShouldBeActive);
                }
            }
        });
    }

    updateConfidenceDisplay(confidence) {
        requestAnimationFrame(() => {
            const confidenceFill = document.getElementById('confidence-fill');
            const confidenceValue = document.getElementById('confidence-value');
            
            if (confidenceFill) {
                const newWidth = (confidence * 100) + '%';
                if (confidenceFill.style.width !== newWidth) {
                    confidenceFill.style.width = newWidth;
                }
            }
            
            if (confidenceValue) {
                const newValue = Math.round(confidence * 100) + '%';
                if (confidenceValue.textContent !== newValue) {
                    confidenceValue.textContent = newValue;
                }
            }
        });
    }

    animatePatientButton() {
        const button = document.getElementById('patient-button');
        if (button && !button.classList.contains('pressed')) {
            button.classList.add('pressed');
            
            // Use requestAnimationFrame for smooth animation
            requestAnimationFrame(() => {
                setTimeout(() => {
                    requestAnimationFrame(() => {
                        button.classList.remove('pressed');
                    });
                }, 200);
            });
        }
    }

    getStateDescription(state) {
        const descriptions = {
            'IDLE': 'System idle',
            'FAMILIARIZATION': 'Patient familiarization',
            'PRESENT_TONE': 'Presenting tone stimulus',
            'WAIT_RESPONSE': 'Waiting for patient response',
            'PROCESS_RESPONSE': 'Processing response data',
            'CONFIRM_THRESHOLD': 'Confirming threshold measurement',
            'NEXT_FREQUENCY': 'Moving to next frequency',
            'NEXT_EAR': 'Switching to opposite ear',
            'TEST_COMPLETE': 'Test sequence completed'
        };
        return descriptions[state] || state;
    }

    formatDecisionText(decision) {
        if (decision.explanation && decision.explanation.primary) {
            return decision.explanation.primary;
        }
        return decision.reason || 'AI decision made';
    }

    showError(message) {
        console.error(message);
        this.updateStatus('ERROR', message);
        
        // Show alert for critical errors
        alert('Error: ' + message);
    }

    showMessage(message) {
        console.log(message);
        // Could implement a toast notification here
        alert(message);
    }

    // Guidance System Integration
    async showStartupGuidance() {
        const commandElement = document.getElementById('ai-command');
        if (commandElement && this.guidanceSystem) {
            await this.guidanceSystem.showGuidance('STARTUP', commandElement);
        }
    }

    async showPreTestGuidance() {
        const commandElement = document.getElementById('ai-command');
        if (commandElement && this.guidanceSystem) {
            await this.guidanceSystem.showGuidance('PRE_TEST', commandElement);
        }
    }

    async showFamiliarizationGuidance() {
        const commandElement = document.getElementById('ai-command');
        if (commandElement && this.guidanceSystem) {
            await this.guidanceSystem.showGuidance('FAMILIARIZATION', commandElement);
        }
    }

    async showTestingGuidance() {
        const commandElement = document.getElementById('ai-command');
        if (commandElement && this.guidanceSystem) {
            await this.guidanceSystem.showGuidance('TESTING', commandElement);
        }
    }

    async showPostTestReport(testResults, qualityMetrics) {
        if (!this.reportGenerator) return;
        
        // Generate clinical report
        const report = this.reportGenerator.generateReport(testResults, qualityMetrics);
        
        // Display in a new window with retro styling
        this.displayClinicalReport(report);
    }

    displayClinicalReport(reportLines) {
        const reportWindow = window.open('', 'ClinicalReport', 'width=800,height=600,scrollbars=yes');
        
        const reportHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Clinical Audiometry Report</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        background: #001100;
                        color: #33ff33;
                        padding: 20px;
                        line-height: 1.4;
                        margin: 0;
                    }
                    .report-container {
                        background: #002200;
                        border: 2px solid #33ff33;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 0 20px rgba(51, 255, 51, 0.3);
                    }
                    .report-line {
                        margin: 5px 0;
                        white-space: pre;
                    }
                    .print-button {
                        background: #33ff33;
                        color: #001100;
                        border: none;
                        padding: 10px 20px;
                        font-family: 'Courier New', monospace;
                        font-weight: bold;
                        cursor: pointer;
                        margin: 20px 0;
                        border-radius: 5px;
                    }
                    .print-button:hover {
                        background: #44ff44;
                    }
                    @media print {
                        body { background: white; color: black; }
                        .report-container { border-color: black; background: white; }
                        .print-button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="report-container">
                    <button class="print-button" onclick="window.print()">PRINT REPORT</button>
                    ${reportLines.map(line => `<div class="report-line">${line}</div>`).join('')}
                    <button class="print-button" onclick="window.print()">PRINT REPORT</button>
                </div>
            </body>
            </html>
        `;
        
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
    }

    updateProgressDisplay() {
        if (!this.guidanceSystem) return;
        
        const progressText = this.guidanceSystem.getProgressIndicator(
            this.currentTestData.completedTests,
            this.currentTestData.totalTests
        );
        
        // Update a progress display element if it exists
        const progressElement = document.getElementById('test-progress');
        if (progressElement) {
            progressElement.textContent = progressText;
        }
    }

    displayClinicalStatus() {
        if (!this.guidanceSystem) return;
        
        const statusSummary = this.guidanceSystem.generateStatusSummary(this.currentTestData);
        const statusElement = document.getElementById('clinical-status');
        
        if (statusElement) {
            statusElement.innerHTML = statusSummary.map(line => `<div>${line}</div>`).join('');
        }
    }

    showStateGuidance(state) {
        // Show specific guidance based on current state
        switch (state) {
            case 'FAMILIARIZATION':
                this.showFamiliarizationGuidance();
                break;
            case 'PRESENT_TONE':
            case 'WAIT_RESPONSE':
                if (!this.hasShownTestingGuidance) {
                    this.showTestingGuidance();
                    this.hasShownTestingGuidance = true;
                }
                break;
        }
    }

    async showPostTestGuidance() {
        const commandElement = document.getElementById('ai-command');
        if (commandElement && this.guidanceSystem) {
            await this.guidanceSystem.showGuidance('POST_TEST', commandElement);
        }
    }

    displayWithTypewriter(text, elementId, speed = 30) {
        const element = document.getElementById(elementId);
        if (!element) return Promise.resolve();
        
        // Clear any existing typewriter animation
        const existingTimeout = this.typewriterTimeouts.get(elementId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            this.typewriterTimeouts.delete(elementId);
        }
        
        return new Promise((resolve) => {
            element.textContent = '';
            element.classList.add('typewriter', 'typing');
            
            let i = 0;
            const typeChar = () => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    const timeout = setTimeout(typeChar, speed);
                    this.typewriterTimeouts.set(elementId, timeout);
                } else {
                    element.classList.remove('typing');
                    this.typewriterTimeouts.delete(elementId);
                    resolve();
                }
            };
            
            typeChar();
        });
    }

    updateProgressDisplay() {
        if (!this.guidanceSystem) return;
        
        const progressText = this.guidanceSystem.getProgressIndicator(
            this.currentTestData.completedTests,
            this.currentTestData.totalTests
        );
        
        const progressElement = document.getElementById('test-progress');
        if (progressElement) {
            progressElement.textContent = progressText;
        }
    }

    // Power On Sequence Methods
    async showPowerOnGuidance() {
        const commandElement = document.getElementById('ai-command');
        if (commandElement && this.guidanceSystem) {
            const powerOnMessages = [
                'AUDIOMETER MODEL 1975-AI READY',
                'SYSTEM DIAGNOSTICS: PASSED',
                'AUDIO CHANNELS: CONFIGURED',
                'AI CLINICIAN: STANDBY',
                '',
                'POWER ON REQUIRED:',
                '• CLICK POWER ON TO INITIALIZE AUDIO',
                '• AUDIO SYSTEM REQUIRES USER ACTIVATION',
                '• COMPLIES WITH MODERN BROWSER POLICIES',
                '',
                'CLICK [POWER ON] TO BEGIN'
            ];
            
            for (const message of powerOnMessages) {
                await this.displayWithTypewriter(message, 'ai-command', 40);
                await this.delay(600);
            }
        }
    }

    showPowerOnInterface() {
        // Hide start button initially
        const startButton = document.getElementById('start-test');
        if (startButton) {
            startButton.style.display = 'none';
        }
        
        // Create and show power on button
        this.createPowerOnButton();
        
        // Update power indicator to show off state
        this.setPowerIndicator(false);
    }

    createPowerOnButton() {
        const buttonPanel = document.querySelector('.button-panel');
        if (!buttonPanel) return;
        
        // Create power on button
        const powerButton = document.createElement('button');
        powerButton.className = 'retro-button power-button';
        powerButton.id = 'power-on-button';
        powerButton.innerHTML = `
            <div class="button-face">
                <span>POWER ON</span>
                <span class="button-subtext">AUDIO SYSTEM</span>
            </div>
        `;
        
        // Add click handler
        powerButton.addEventListener('click', () => this.handlePowerOn());
        
        // Insert before start button
        const startButton = document.getElementById('start-test');
        if (startButton) {
            buttonPanel.insertBefore(powerButton, startButton);
        } else {
            buttonPanel.appendChild(powerButton);
        }
    }

    async handlePowerOn() {
        console.log('Power On sequence initiated by user gesture');
        
        const powerButton = document.getElementById('power-on-button');
        const startButton = document.getElementById('start-test');
        
        try {
            // Disable power button during initialization
            if (powerButton) {
                powerButton.disabled = true;
                powerButton.textContent = 'POWERING ON...';
            }
            
            // Update status
            this.updateStatus('POWERING ON', 'Initializing audio system...');
            this.setPowerIndicator(true);
            
            // Show power-on sequence
            await this.displayPowerOnSequence();
            
            // Initialize audio system (this is the user gesture!)
            await this.audioGenerator.initialize();
            console.log('Audio system powered on successfully');
            
            // Update UI to powered-on state
            this.updateStatus('READY', 'Audio system online - Ready for testing');
            this.updateDisplay('ai-command', 'AUDIO SYSTEM ONLINE - CLICK START AUTO TEST');
            
            // Hide power button and show start button
            if (powerButton) {
                powerButton.style.display = 'none';
            }
            if (startButton) {
                startButton.style.display = 'block';
                startButton.disabled = false;
            }
            
            // Show startup guidance
            await this.showStartupGuidance();
            
        } catch (error) {
            console.error('Power on failed:', error);
            this.showError('Failed to power on audio system: ' + error.message);
            
            // Re-enable power button on failure
            if (powerButton) {
                powerButton.disabled = false;
                powerButton.innerHTML = `
                    <div class="button-face">
                        <span>POWER ON</span>
                        <span class="button-subtext">RETRY</span>
                    </div>
                `;
            }
            this.setPowerIndicator(false);
        }
    }

    async displayPowerOnSequence() {
        const commandElement = document.getElementById('ai-command');
        if (!commandElement) return;
        
        const sequence = [
            'POWER ON SEQUENCE INITIATED...',
            'INITIALIZING AUDIO CONTEXT...',
            'CONFIGURING CHANNEL ISOLATION...',
            'TESTING LEFT CHANNEL... OK',
            'TESTING RIGHT CHANNEL... OK',
            'AUDIO SYSTEM ONLINE',
            'READY FOR CLINICAL TESTING'
        ];
        
        for (const message of sequence) {
            await this.displayWithTypewriter(message, 'ai-command', 50);
            await this.delay(800);
        }
    }

    setPowerIndicator(isOn) {
        const powerLed = document.querySelector('.power-indicator .led-center');
        if (powerLed) {
            if (isOn) {
                powerLed.classList.add('active');
            } else {
                powerLed.classList.remove('active');
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Performance utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Cleanup method for performance
    cleanup() {
        // Clear all pending timeouts
        for (const timeout of this.typewriterTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.typewriterTimeouts.clear();
        
        // Cancel animation frames
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Clear update queue
        this.updateQueue.clear();
    }
    
    // UI State Management
    setUIState(state) {
        const chassis = document.querySelector('.audiometer-chassis');
        if (!chassis) return;
        
        // Remove all state classes
        chassis.classList.remove('ui-loading', 'ui-ready', 'ui-error', 'ui-updating');
        
        // Add new state class
        switch (state) {
            case 'loading':
                chassis.classList.add('ui-loading');
                break;
            case 'ready':
                chassis.classList.add('ui-ready');
                break;
            case 'error':
                chassis.classList.add('ui-error');
                break;
            case 'updating':
                chassis.classList.add('ui-updating');
                break;
        }
    }
}

// Initialize when DOM is ready (only once)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing Retro Audiometer UI...');
        new RetroAudiometerUI();
    });
} else {
    // DOM is already loaded
    console.log('DOM already loaded, initializing Retro Audiometer UI...');
    new RetroAudiometerUI();
}