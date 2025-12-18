/**
 * Retro UI Module - 1970s Clinical Audiometer Interface
 * Manages the visual interface with authentic retro styling
 */
export class RetroUI {
    constructor() {
        this.isTestActive = false;
        this.currentStatus = 'ready';
        this.elements = {};
        
        this.init();
    }

    init() {
        this.createControlPanel();
        this.createDisplaySection();
        this.createPatientInterface();
        this.setupEventListeners();
    }

    createControlPanel() {
        const controlSection = document.getElementById('control-section');
        
        controlSection.innerHTML = `
            <div class="control-panel retro-panel">
                <h3>AI CLINICIAN STATUS</h3>
                
                <div class="ai-status-display">
                    <div class="status-row">
                        <label>CURRENT ACTION:</label>
                        <span id="ai-action" class="digital-display">Ready</span>
                    </div>
                    <div class="status-row">
                        <label>CLINICAL REASON:</label>
                        <span id="ai-reason" class="digital-display">Awaiting start command</span>
                    </div>
                    <div class="status-row">
                        <label>PROTOCOL RULE:</label>
                        <span id="ai-rule" class="digital-display">Hughson-Westlake Method</span>
                    </div>
                </div>
                
                <div class="autonomous-controls">
                    <div class="control-group">
                        <button id="start-test" class="retro-button start-button">START AUTONOMOUS TEST</button>
                        <button id="stop-test" class="retro-button stop-button">EMERGENCY STOP</button>
                    </div>
                </div>
                
                <div class="ai-decisions">
                    <h4>RECENT AI DECISIONS</h4>
                    <div id="decision-log" class="decision-display">
                        <div class="decision-entry">
                            <span class="decision-time">--:--</span>
                            <span class="decision-text">AI Clinician ready for autonomous testing</span>
                        </div>
                    </div>
                </div>
                
                <div class="status-indicators">
                    <div class="indicator-group">
                        <div class="led-indicator" id="power-led"></div>
                        <label>POWER</label>
                    </div>
                    <div class="indicator-group">
                        <div class="led-indicator" id="ai-active-led"></div>
                        <label>AI ACTIVE</label>
                    </div>
                    <div class="indicator-group">
                        <div class="led-indicator" id="tone-led"></div>
                        <label>TONE ON</label>
                    </div>
                    <div class="indicator-group">
                        <div class="led-indicator" id="response-led"></div>
                        <label>RESPONSE</label>
                    </div>
                </div>
            </div>
        `;
        
        // Store element references
        this.elements.startButton = document.getElementById('start-test');
        this.elements.stopButton = document.getElementById('stop-test');
        this.elements.aiAction = document.getElementById('ai-action');
        this.elements.aiReason = document.getElementById('ai-reason');
        this.elements.aiRule = document.getElementById('ai-rule');
        this.elements.decisionLog = document.getElementById('decision-log');
    }

    createDisplaySection() {
        const displaySection = document.getElementById('display-section');
        
        displaySection.innerHTML = `
            <div class="display-panel retro-panel">
                <div class="display-row">
                    <div class="audiogram-container">
                        <div id="audiogram-display"></div>
                    </div>
                    
                    <div class="test-info">
                        <h4>TEST INFORMATION</h4>
                        <div class="info-display">
                            <div class="info-row">
                                <span>Current Frequency:</span>
                                <span id="current-freq" class="digital-display">1000 Hz</span>
                            </div>
                            <div class="info-row">
                                <span>Current Level:</span>
                                <span id="current-level" class="digital-display">-- dB HL</span>
                            </div>
                            <div class="info-row">
                                <span>Current Ear:</span>
                                <span id="current-ear" class="digital-display">--</span>
                            </div>
                            <div class="info-row">
                                <span>Test Progress:</span>
                                <span id="test-progress" class="digital-display">Ready</span>
                            </div>
                        </div>
                        
                        <div class="confidence-display">
                            <h5>RELIABILITY METRICS</h5>
                            <div class="metric-row">
                                <span>Response Consistency:</span>
                                <div class="confidence-bar">
                                    <div id="consistency-bar" class="confidence-fill"></div>
                                </div>
                                <span id="consistency-value">--</span>
                            </div>
                            <div class="metric-row">
                                <span>Malingering Risk:</span>
                                <div class="risk-bar">
                                    <div id="risk-bar" class="risk-fill"></div>
                                </div>
                                <span id="risk-value">Low</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createPatientInterface() {
        const patientSection = document.getElementById('patient-interface');
        
        patientSection.innerHTML = `
            <div class="patient-panel retro-panel">
                <h3>PATIENT RESPONSE INTERFACE</h3>
                <div class="response-area">
                    <div class="response-instruction">
                        <h4>🎧 LISTEN CAREFULLY</h4>
                        <p>The AI Clinician will automatically present tones to test your hearing.</p>
                    </div>
                    
                    <button id="patient-button" class="patient-response-button">
                        <div class="button-light"></div>
                        <span>I HEARD THE TONE</span>
                    </button>
                    
                    <div class="simple-instructions">
                        <div class="instruction-box">
                            <h5>SIMPLE INSTRUCTIONS:</h5>
                            <div class="instruction-item">
                                <span class="instruction-icon">👂</span>
                                <span>Listen for tones in your headphones</span>
                            </div>
                            <div class="instruction-item">
                                <span class="instruction-icon">👆</span>
                                <span>Press the button ONLY when you hear a tone</span>
                            </div>
                            <div class="instruction-item">
                                <span class="instruction-icon">🤖</span>
                                <span>The AI will decide everything else automatically</span>
                            </div>
                            <div class="instruction-item">
                                <span class="instruction-icon">⏱️</span>
                                <span>You have 3 seconds to respond after each tone</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="patient-status">
                        <div class="status-item">
                            <label>Current Test:</label>
                            <span id="patient-current-test" class="status-value">Ready to begin</span>
                        </div>
                        <div class="status-item">
                            <label>AI Decision:</label>
                            <span id="patient-ai-status" class="status-value">Waiting to start</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.elements.patientButton = document.getElementById('patient-button');
        this.elements.patientCurrentTest = document.getElementById('patient-current-test');
        this.elements.patientAiStatus = document.getElementById('patient-ai-status');
    }

    setupEventListeners() {
        // Start autonomous test button
        this.elements.startButton.addEventListener('click', () => {
            this.startAutonomousTest();
        });

        // Emergency stop button
        this.elements.stopButton.addEventListener('click', () => {
            this.emergencyStop();
        });

        // Patient response button (only response allowed)
        this.elements.patientButton.addEventListener('click', () => {
            this.recordPatientResponse();
        });

        // Listen for AI clinician events
        document.addEventListener('clinician-state-change', (event) => {
            this.updateAIStatus(event.detail);
        });

        document.addEventListener('clinical-decision', (event) => {
            this.logAIDecision(event.detail);
        });

        document.addEventListener('tone-presented', (event) => {
            this.updateToneStatus(event.detail);
        });

        document.addEventListener('threshold-established', (event) => {
            this.handleThresholdEstablished(event.detail);
        });

        document.addEventListener('catch-trial-completed', (event) => {
            this.handleCatchTrial(event.detail);
        });

        document.addEventListener('test-completed', (event) => {
            this.handleTestCompletion(event.detail);
        });

        document.addEventListener('test-stopped', (event) => {
            this.handleTestStopped(event.detail);
        });
    }

    startAutonomousTest() {
        this.isTestActive = true;
        this.updateAIStatus({
            state: 'STARTING',
            action: 'Initializing autonomous test',
            reason: 'User initiated autonomous audiometry'
        });
        
        this.setLEDStatus('ai-active-led', true);
        this.setLEDStatus('power-led', true);
        
        // Disable start button, enable emergency stop
        this.elements.startButton.disabled = true;
        this.elements.stopButton.disabled = false;
        
        // Update patient interface
        this.elements.patientCurrentTest.textContent = 'Starting autonomous test...';
        this.elements.patientAiStatus.textContent = 'AI taking control';
        
        // Log the start decision
        this.logAIDecision({
            type: 'TEST_INITIATED',
            reason: 'User requested autonomous audiometric assessment',
            timestamp: new Date().toISOString()
        });
        
        // Dispatch start event
        document.dispatchEvent(new CustomEvent('start-test'));
    }

    emergencyStop() {
        this.isTestActive = false;
        
        this.updateAIStatus({
            state: 'STOPPED',
            action: 'Emergency stop activated',
            reason: 'User intervention - test halted'
        });
        
        this.setLEDStatus('ai-active-led', false);
        this.setLEDStatus('tone-led', false);
        
        // Re-enable start button
        this.elements.startButton.disabled = false;
        this.elements.stopButton.disabled = true;
        
        // Update patient interface
        this.elements.patientCurrentTest.textContent = 'Test stopped';
        this.elements.patientAiStatus.textContent = 'AI stopped by user';
        
        // Log the stop decision
        this.logAIDecision({
            type: 'EMERGENCY_STOP',
            reason: 'User activated emergency stop',
            timestamp: new Date().toISOString()
        });
        
        // Dispatch stop event
        document.dispatchEvent(new CustomEvent('stop-test'));
    }

    updateAIStatus(statusData) {
        // Update AI status display
        if (this.elements.aiAction) {
            this.elements.aiAction.textContent = statusData.action || statusData.state || 'Unknown';
        }
        
        if (this.elements.aiReason) {
            this.elements.aiReason.textContent = statusData.reason || 'Autonomous operation';
        }
        
        if (this.elements.aiRule && statusData.rule) {
            this.elements.aiRule.textContent = statusData.rule;
        }
        
        // Update patient interface
        if (statusData.ear && statusData.frequency && statusData.level) {
            this.elements.patientCurrentTest.textContent = 
                `${statusData.frequency} Hz, ${statusData.level} dB HL (${statusData.ear} ear)`;
        }
        
        // Update patient AI status
        const patientFriendlyStatus = this.getPatientFriendlyStatus(statusData.state);
        if (this.elements.patientAiStatus) {
            this.elements.patientAiStatus.textContent = patientFriendlyStatus;
        }
    }

    getPatientFriendlyStatus(state) {
        switch (state) {
            case 'FAMILIARIZATION':
                return 'Getting ready - listen for practice tone';
            case 'PRESENT_TONE':
                return 'Tone coming - be ready to respond';
            case 'WAIT_RESPONSE':
                return 'Listening for your response...';
            case 'PROCESS_RESPONSE':
                return 'AI analyzing your response';
            case 'CONFIRM_THRESHOLD':
                return 'AI confirming hearing level';
            case 'NEXT_FREQUENCY':
                return 'Moving to next frequency';
            case 'NEXT_EAR':
                return 'Switching to other ear';
            case 'TEST_COMPLETE':
                return 'Test completed successfully';
            default:
                return 'AI working...';
        }
    }

    logAIDecision(decision) {
        const timestamp = new Date().toLocaleTimeString();
        const decisionText = this.formatDecisionText(decision);
        
        // Add to decision log
        const logEntry = document.createElement('div');
        logEntry.className = 'decision-entry';
        logEntry.innerHTML = `
            <span class="decision-time">${timestamp}</span>
            <span class="decision-text">${decisionText}</span>
        `;
        
        // Add to top of log
        this.elements.decisionLog.insertBefore(logEntry, this.elements.decisionLog.firstChild);
        
        // Keep only last 5 decisions visible
        while (this.elements.decisionLog.children.length > 5) {
            this.elements.decisionLog.removeChild(this.elements.decisionLog.lastChild);
        }
    }

    formatDecisionText(decision) {
        switch (decision.type) {
            case 'INTENSITY_INCREASE':
                return `↑ Increased to ${decision.to} dB HL (no response)`;
            case 'INTENSITY_DECREASE':
                return `↓ Decreased to ${decision.to} dB HL (response detected)`;
            case 'FREQUENCY_CHANGE':
                return `🎵 Changed frequency: ${decision.from} → ${decision.to} Hz`;
            case 'EAR_SWITCH':
                return `👂 Switched ear: ${decision.from} → ${decision.to}`;
            case 'THRESHOLD_FINALIZED':
                return `✓ Threshold: ${decision.threshold} dB HL (${decision.confidence}% confidence)`;
            case 'CATCH_TRIAL_EXECUTED':
                return `🎯 Catch trial: ${decision.catchType} (${decision.response ? 'Failed' : 'Passed'})`;
            case 'CATCH_TRIAL_RESULT':
                return `🎯 ${decision.catchType}: ${decision.response ? 'FAILED' : 'PASSED'}`;
            case 'TEST_COMPLETION':
                return `🎉 Test complete: ${decision.totalTests} measurements`;
            default:
                return decision.reason || 'AI decision made';
        }
    }

    handleThresholdEstablished(data) {
        // Visual feedback for threshold establishment with confidence
        const confidence = data.enhancedConfidence || Math.round(data.confidence * 100);
        this.showNotification(`Threshold: ${data.threshold} dB HL (${confidence}% confidence)`, 'success');
        
        // Update audiogram in real-time
        document.dispatchEvent(new CustomEvent('update-audiogram', {
            detail: data
        }));
    }

    handleCatchTrial(catchData) {
        // Visual feedback for catch trials
        const result = catchData.response ? 'FAILED' : 'PASSED';
        const resultType = catchData.response ? 'error' : 'success';
        
        this.showNotification(`Catch Trial ${result}: ${catchData.type}`, resultType);
        
        // Log catch trial in decision log
        this.logAIDecision({
            type: 'CATCH_TRIAL_RESULT',
            reason: `${catchData.type} catch trial ${result.toLowerCase()}`,
            timestamp: new Date().toISOString(),
            catchType: catchData.type,
            response: catchData.response
        });
    }

    recordPatientResponse() {
        const responseTime = Date.now();
        
        // Visual feedback
        this.setLEDStatus('response-led', true);
        this.elements.patientButton.classList.add('pressed');
        
        setTimeout(() => {
            this.setLEDStatus('response-led', false);
            this.elements.patientButton.classList.remove('pressed');
        }, 200);
        
        // Dispatch response event
        document.dispatchEvent(new CustomEvent('patient-response', {
            detail: { 
                timestamp: responseTime,
                reactionTime: this.calculateReactionTime(responseTime)
            }
        }));
    }

    updateToneStatus(toneData) {
        this.setLEDStatus('tone-led', true);
        
        // Update display
        if (document.getElementById('current-freq')) {
            document.getElementById('current-freq').textContent = `${toneData.frequency} Hz`;
        }
        if (document.getElementById('current-level')) {
            document.getElementById('current-level').textContent = `${toneData.level} dB HL`;
        }
        if (document.getElementById('current-ear')) {
            document.getElementById('current-ear').textContent = toneData.ear.toUpperCase();
        }
        
        // Show catch trial indicator if applicable
        if (toneData.isCatchTrial) {
            this.showNotification('🎯 Catch Trial', 'info');
        }
        
        // Turn off tone LED after duration
        setTimeout(() => {
            this.setLEDStatus('tone-led', false);
        }, toneData.duration);
    }

    updateTestStatus(status) {
        document.getElementById('test-progress').textContent = status;
    }

    updateConfidenceMetrics(consistency, malingeringRisk) {
        // Update consistency bar
        const consistencyBar = document.getElementById('consistency-bar');
        const consistencyValue = document.getElementById('consistency-value');
        
        consistencyBar.style.width = `${consistency * 100}%`;
        consistencyValue.textContent = `${Math.round(consistency * 100)}%`;
        
        // Update risk bar
        const riskBar = document.getElementById('risk-bar');
        const riskValue = document.getElementById('risk-value');
        
        riskBar.style.width = `${malingeringRisk * 100}%`;
        
        let riskLevel = 'Low';
        if (malingeringRisk > 0.6) riskLevel = 'High';
        else if (malingeringRisk > 0.3) riskLevel = 'Moderate';
        
        riskValue.textContent = riskLevel;
        
        // Color coding
        if (malingeringRisk > 0.5) {
            riskBar.style.backgroundColor = '#ff6b6b';
        } else if (malingeringRisk > 0.3) {
            riskBar.style.backgroundColor = '#ffd93d';
        } else {
            riskBar.style.backgroundColor = '#4ecdc4';
        }
    }

    setLEDStatus(ledId, isOn) {
        const led = document.getElementById(ledId);
        if (led) {
            led.classList.toggle('led-on', isOn);
        }
    }

    handleTestCompletion(report) {
        this.isTestActive = false;
        
        this.updateAIStatus({
            state: 'COMPLETE',
            action: 'Autonomous test completed',
            reason: 'All frequencies and ears tested successfully'
        });
        
        this.setLEDStatus('ai-active-led', false);
        
        // Update patient interface
        this.elements.patientCurrentTest.textContent = 'Test completed';
        this.elements.patientAiStatus.textContent = 'AI has finished testing';
        
        // Show completion dialog with AI summary
        this.showAutonomousCompletionDialog(report);
        
        // Re-enable start button
        this.elements.startButton.disabled = false;
        this.elements.stopButton.disabled = true;
        
        // Log completion
        this.logAIDecision({
            type: 'TEST_COMPLETION',
            reason: `Autonomous test completed successfully`,
            totalTests: Object.keys(report.testResults).length,
            reliability: Math.round(report.reliability * 100),
            timestamp: new Date().toISOString()
        });
    }

    handleTestStopped(data) {
        this.isTestActive = false;
        
        this.updateAIStatus({
            state: 'STOPPED',
            action: 'Test stopped',
            reason: data.reason || 'Test interrupted'
        });
        
        this.setLEDStatus('ai-active-led', false);
        this.setLEDStatus('tone-led', false);
        
        // Update patient interface
        this.elements.patientCurrentTest.textContent = 'Test stopped';
        this.elements.patientAiStatus.textContent = 'Test was interrupted';
        
        // Re-enable start button
        this.elements.startButton.disabled = false;
        this.elements.stopButton.disabled = true;
    }

    showAutonomousCompletionDialog(report) {
        const dialog = document.createElement('div');
        dialog.className = 'completion-dialog retro-panel';
        dialog.innerHTML = `
            <h3>🤖 AUTONOMOUS TEST COMPLETED</h3>
            <div class="ai-summary">
                <div class="summary-section">
                    <h4>AI CLINICIAN REPORT</h4>
                    <p><strong>Protocol:</strong> ${report.protocol}</p>
                    <p><strong>Test Duration:</strong> ${Math.round(report.testDuration / 1000)}s</p>
                    <p><strong>Measurements:</strong> ${Object.keys(report.testResults).length}</p>
                    <p><strong>Reliability:</strong> ${Math.round(report.reliability * 100)}%</p>
                </div>
                
                <div class="summary-section">
                    <h4>CLINICAL DECISIONS MADE</h4>
                    <p><strong>Frequency Changes:</strong> Automatic progression through standard sequence</p>
                    <p><strong>Intensity Adjustments:</strong> Hughson-Westlake rules applied</p>
                    <p><strong>Ear Switching:</strong> Bilateral assessment completed</p>
                    <p><strong>Threshold Confirmation:</strong> 2 out of 3 rule enforced</p>
                </div>
                
                <div class="summary-section">
                    <h4>QUALITY ASSESSMENT</h4>
                    <p><strong>Malingering Risk:</strong> ${report.malingeringAnalysis?.riskLevel || 'Low'}</p>
                    <p><strong>Response Consistency:</strong> ${Math.round((report.reliability || 0.8) * 100)}%</p>
                    <p><strong>Clinical Validity:</strong> ${report.reliability > 0.7 ? 'Valid' : 'Questionable'}</p>
                </div>
            </div>
            
            <div class="dialog-buttons">
                <button class="retro-button" onclick="this.parentElement.parentElement.remove()">Close</button>
                <button class="retro-button" onclick="window.print()">Print AI Report</button>
                <button class="retro-button" onclick="this.showDecisionLog()">View AI Decisions</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
            if (dialog.parentElement) {
                dialog.remove();
            }
        }, 15000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--retro-accent);
            color: #000;
            padding: 10px 20px;
            border-radius: 5px;
            font-family: var(--font-mono);
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    calculateReactionTime(responseTime) {
        // This would calculate based on when the tone was presented
        // For now, return a placeholder
        return Math.random() * 1000 + 200; // 200-1200ms
    }

    render() {
        // Initialize power LED
        this.setLEDStatus('power-led', true);
        
        // Set initial state
        this.updateTestStatus('Ready');
        this.elements.stopButton.disabled = true;
        
        console.log('Retro UI rendered successfully');
    }
}