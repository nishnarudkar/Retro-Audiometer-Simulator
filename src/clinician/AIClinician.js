/**
 * AI Clinician - Rule-based Hughson-Westlake Audiometry
 * Implements precise finite state machine for clinical audiometry
 */
import { TestProtocol } from './TestProtocol.js';
import { MalingeringDetector } from './MalingeringDetector.js';
import { ResponseAnalyzer } from './ResponseAnalyzer.js';
import { FalseResponseDetector } from './FalseResponseDetector.js';
import { ClinicalExplainer } from './ClinicalExplainer.js';

export class AIClinician {
    constructor() {
        this.protocol = new TestProtocol();
        this.malingeringDetector = new MalingeringDetector();
        this.responseAnalyzer = new ResponseAnalyzer();
        this.falseResponseDetector = new FalseResponseDetector();
        this.clinicalExplainer = new ClinicalExplainer();
        
        // Test state
        this.isTestActive = false;
        this.currentState = 'IDLE';
        this.testResults = new Map();
        
        // Autonomous decision parameters
        this.INITIAL_LEVEL = 40; // dB HL - Clinical standard starting point
        this.STEP_UP = 10;       // dB increase on no response - Hughson-Westlake rule
        this.STEP_DOWN = 5;      // dB decrease on response - Hughson-Westlake rule
        this.MAX_LEVEL = 120;    // dB HL safety limit - Prevent hearing damage
        this.MIN_LEVEL = -10;    // dB HL minimum - Equipment limitation
        
        // Clinical Efficiency Constraints (Real-world practice limitations)
        this.MAX_REVERSALS_PER_FREQUENCY = 4;    // Limit reversals to prevent excessive testing
        this.MAX_PRESENTATIONS_PER_FREQUENCY = 10; // Maximum tone presentations per frequency
        this.MAX_TIME_PER_FREQUENCY = 60000;     // 60 seconds maximum per frequency (ms)
        this.FORCE_THRESHOLD_CONFIDENCE = 0.6;   // Force threshold if confidence >= 60%
        
        // Autonomous test sequence (clinically optimized)
        this.testEars = ['right', 'left']; // Right ear first (clinical standard)
        this.frequencies = [1000, 2000, 4000, 500, 250, 8000]; // Standard audiometric sequence
        
        // Current autonomous test position
        this.currentEarIndex = 0;
        this.currentFrequencyIndex = 0;
        
        // Autonomous threshold tracking
        this.currentLevel = this.INITIAL_LEVEL;
        this.responsesAtLevel = [];
        this.thresholdConfirmed = false;
        this.confirmedThreshold = null;
        
        // Clinical Efficiency Tracking (per frequency)
        this.frequencyStartTime = null;           // Track time spent on current frequency
        this.reversalCount = 0;                   // Count reversals for current frequency
        this.presentationCount = 0;               // Count presentations for current frequency
        this.lastLevelDirection = null;           // Track level change direction for reversals
        
        // False response detection
        this.presentationCount = 0;
        this.lastToneStartTime = null;
        
        // Autonomous timing control
        this.responseTimeout = 3000; // ms - Standard clinical response window
        this.responseTimer = null;
        this.interStimulusDelay = 1500; // ms - Pause between tones
        
        // Clinical decision logging
        this.decisionLog = [];
        
        // State machine definition (fully autonomous)
        this.states = {
            IDLE: this.handleIdleState.bind(this),
            FAMILIARIZATION: this.handleFamiliarizationState.bind(this),
            PRESENT_TONE: this.handlePresentToneState.bind(this),
            WAIT_RESPONSE: this.handleWaitResponseState.bind(this),
            PROCESS_RESPONSE: this.handleProcessResponseState.bind(this),
            CONFIRM_THRESHOLD: this.handleConfirmThresholdState.bind(this),
            NEXT_FREQUENCY: this.handleNextFrequencyState.bind(this),
            NEXT_EAR: this.handleNextEarState.bind(this),
            TEST_COMPLETE: this.handleTestCompleteState.bind(this)
        };
    }

    /**
     * Begin Hughson-Westlake audiometric testing
     */
    async beginProtocol(audioEngine, session) {
        if (this.isTestActive) {
            console.warn('Test already in progress');
            return;
        }

        this.isTestActive = true;
        this.audioEngine = audioEngine;
        this.session = session;
        
        // Initialize test state
        this.currentEarIndex = 0;
        this.currentFrequencyIndex = 0;
        this.testResults.clear();
        
        console.log('🎧 Starting Hughson-Westlake Audiometry');
        console.log(`📋 Test sequence: ${this.frequencies.join(', ')} Hz`);
        console.log(`👂 Ears: ${this.testEars.join(' → ')}`);
        
        // Start state machine
        this.setState('FAMILIARIZATION');
        await this.runStateMachine();
    }

    /**
     * Finite State Machine Controller
     */
    async runStateMachine() {
        while (this.isTestActive && this.currentState !== 'TEST_COMPLETE') {
            console.log(`🔄 State: ${this.currentState}`);
            
            const stateHandler = this.states[this.currentState];
            if (stateHandler) {
                await stateHandler();
            } else {
                console.error(`Unknown state: ${this.currentState}`);
                this.setState('TEST_COMPLETE');
            }
            
            // Small delay to prevent tight loops
            await this.delay(100);
        }
    }

    /**
     * State transition handler
     */
    setState(newState) {
        console.log(`🔀 ${this.currentState} → ${newState}`);
        this.currentState = newState;
        
        // Dispatch state change event
        document.dispatchEvent(new CustomEvent('clinician-state-change', {
            detail: { 
                state: newState,
                ear: this.getCurrentEar(),
                frequency: this.getCurrentFrequency(),
                level: this.currentLevel
            }
        }));
    }

    // ==================== STATE HANDLERS ====================

    /**
     * IDLE State - Waiting to start
     */
    async handleIdleState() {
        // This state is handled by beginProtocol()
        await this.delay(100);
    }

    /**
     * FAMILIARIZATION State - Patient instruction and practice
     */
    async handleFamiliarizationState() {
        console.log('👋 Familiarization: 1000 Hz at 60 dB HL (both ears)');
        
        // Present clear, audible tone for familiarization
        await this.presentTone(1000, 60, 'both', 1000);
        
        // Wait for response
        const response = await this.waitForResponse(4000);
        
        if (response) {
            console.log('✅ Patient familiarization successful');
            this.initializeFrequencyTest();
            this.setState('PRESENT_TONE');
        } else {
            console.log('⚠️ No familiarization response - proceeding anyway');
            this.initializeFrequencyTest();
            this.setState('PRESENT_TONE');
        }
    }

    /**
     * PRESENT_TONE State - Present stimulus to patient (WITH CATCH TRIALS)
     */
    async handlePresentToneState() {
        const ear = this.getCurrentEar();
        const frequency = this.getCurrentFrequency();
        
        this.presentationCount++;
        
        // Handle catch trial if needed
        await this.handleCatchTrialIfNeeded(frequency, ear);
        
        // Present normal tone
        await this.presentNormalTone(frequency, ear);
        
        // Move to wait for response
        this.setState('WAIT_RESPONSE');
    }

    /**
     * Handle catch trial execution if one is needed
     * @param {number} frequency - Current test frequency
     * @param {string} ear - Current test ear
     */
    async handleCatchTrialIfNeeded(frequency, ear) {
        const catchTrialDecision = this.determineCatchTrialNeed(frequency, ear);
        
        if (catchTrialDecision.isCatchTrial) {
            await this.executeCatchTrialSequence(catchTrialDecision);
        }
    }

    /**
     * Determine if catch trial is needed
     * @param {number} frequency - Current frequency
     * @param {string} ear - Current ear
     * @returns {Object} Catch trial decision
     */
    determineCatchTrialNeed(frequency, ear) {
        return this.falseResponseDetector.shouldInsertCatchTrial(
            this.presentationCount, frequency, ear
        );
    }

    /**
     * Execute complete catch trial sequence
     * @param {Object} catchTrialDecision - Catch trial parameters
     */
    async executeCatchTrialSequence(catchTrialDecision) {
        console.log(`🎯 Executing catch trial: ${catchTrialDecision.type}`);
        
        const catchResult = await this.executeCatchTrial(catchTrialDecision);
        this.logCatchTrialResult(catchTrialDecision, catchResult);
        
        await this.delay(1000); // Brief pause after catch trial
    }

    /**
     * Execute the actual catch trial
     * @param {Object} catchTrialDecision - Catch trial parameters
     * @returns {Object} Catch trial result
     */
    async executeCatchTrial(catchTrialDecision) {
        return await this.falseResponseDetector.executeCatchTrial(
            catchTrialDecision,
            this.presentTone.bind(this),
            this.waitForResponse.bind(this)
        );
    }

    /**
     * Log catch trial result for clinical transparency
     * @param {Object} catchTrialDecision - Catch trial parameters
     * @param {Object} catchResult - Catch trial result
     */
    logCatchTrialResult(catchTrialDecision, catchResult) {
        this.logDecision({
            type: 'CATCH_TRIAL_EXECUTED',
            reason: 'False response detection',
            catchType: catchTrialDecision.type,
            response: catchResult.response,
            expectedResponse: false
        });
    }

    /**
     * Present normal tone stimulus
     * @param {number} frequency - Test frequency
     * @param {string} ear - Test ear
     */
    async presentNormalTone(frequency, ear) {
        // Increment presentation count for efficiency tracking
        this.presentationCount++;
        
        console.log(`🔊 Presenting ${frequency} Hz at ${this.currentLevel} dB HL (${ear} ear) [#${this.presentationCount}]`);
        
        this.recordToneStartTime();
        await this.presentTone(frequency, this.currentLevel, ear, 1000);
    }

    /**
     * Record tone start time for reaction time measurement
     */
    recordToneStartTime() {
        this.lastToneStartTime = Date.now();
    }

    /**
     * WAIT_RESPONSE State - Wait for patient response (WITH REACTION TIME TRACKING)
     */
    async handleWaitResponseState() {
        const response = await this.waitForResponse(this.responseTimeout);
        const reactionTime = this.calculateReactionTime(response);
        
        // Process and analyze the response
        const responseData = this.processPatientResponse(response, reactionTime);
        const responseAnalysis = this.analyzeResponseQuality(responseData);
        
        // Handle clinical alerts if needed
        this.handleClinicalAlerts(responseAnalysis);
        
        // Store response and proceed
        this.storeResponseData(responseData);
        this.logResponseResult(responseData);
        
        this.setState('PROCESS_RESPONSE');
    }

    /**
     * Calculate reaction time from response and tone start time
     * @param {boolean} response - Whether patient responded
     * @returns {number|null} Reaction time in milliseconds or null
     */
    calculateReactionTime(response) {
        return response && this.lastToneStartTime 
            ? Date.now() - this.lastToneStartTime 
            : null;
    }

    /**
     * Process patient response with comprehensive data collection
     * @param {boolean} response - Patient response
     * @param {number|null} reactionTime - Reaction time in ms
     * @returns {Object} Complete response data
     */
    processPatientResponse(response, reactionTime) {
        // Record in false response detector
        this.falseResponseDetector.recordResponse(
            this.getCurrentFrequency(),
            this.currentLevel,
            this.getCurrentEar(),
            response,
            reactionTime
        );

        return {
            level: this.currentLevel,
            response: response,
            reactionTime: reactionTime,
            timestamp: Date.now(),
            frequency: this.getCurrentFrequency(),
            ear: this.getCurrentEar(),
            presentationCount: this.presentationCount
        };
    }

    /**
     * Analyze response quality using comprehensive timing evaluation
     * @param {Object} responseData - Response data to analyze
     * @returns {Object} Response analysis results
     */
    analyzeResponseQuality(responseData) {
        return this.responseAnalyzer.addResponse(
            responseData.frequency,
            responseData.level,
            responseData.response,
            responseData.timestamp,
            this.lastToneStartTime,
            {
                ear: responseData.ear,
                presentationCount: responseData.presentationCount,
                testDuration: Date.now() - (this.session?.startTime || Date.now())
            }
        );
    }

    /**
     * Handle clinical alerts based on response analysis
     * @param {Object} responseAnalysis - Analysis results
     */
    handleClinicalAlerts(responseAnalysis) {
        if (!responseAnalysis.timingCategory) return;

        this.logResponseAnalysis(responseAnalysis);
        this.checkForAnticipatoryResponse(responseAnalysis);
        this.checkForFatigueAlert(responseAnalysis);
        this.checkForAttentionAlert(responseAnalysis);
    }

    /**
     * Log comprehensive response analysis
     * @param {Object} responseAnalysis - Analysis results
     */
    logResponseAnalysis(responseAnalysis) {
        console.log(`📊 Response Analysis:`, {
            timing: responseAnalysis.timingCategory,
            confidence: `${Math.round(responseAnalysis.confidenceScore * 100)}%`,
            fatigue: `${Math.round(responseAnalysis.fatigueLevel * 100)}%`,
            attention: `${Math.round(responseAnalysis.attentionLevel * 100)}%`
        });
    }

    /**
     * Check for and handle anticipatory response alerts
     * @param {Object} responseAnalysis - Analysis results
     */
    checkForAnticipatoryResponse(responseAnalysis) {
        if (responseAnalysis.timingCategory === 'anticipatory') {
            console.warn('⚠️ Anticipatory response detected - possible guessing behavior');
        }
    }

    /**
     * Check for and handle fatigue alerts
     * @param {Object} responseAnalysis - Analysis results
     */
    checkForFatigueAlert(responseAnalysis) {
        if (responseAnalysis.fatigueLevel > 0.6) {
            console.warn('😴 High fatigue detected - test reliability may be compromised');
        }
    }

    /**
     * Check for and handle attention alerts
     * @param {Object} responseAnalysis - Analysis results
     */
    checkForAttentionAlert(responseAnalysis) {
        if (responseAnalysis.attentionLevel < 0.4) {
            console.warn('🎯 Low attention detected - inconsistent response patterns');
        }
    }

    /**
     * Store response data for threshold calculation
     * @param {Object} responseData - Response data to store
     */
    storeResponseData(responseData) {
        this.responsesAtLevel.push({
            level: responseData.level,
            response: responseData.response,
            reactionTime: responseData.reactionTime,
            timestamp: responseData.timestamp
        });
    }

    /**
     * Log response result for clinical transparency
     * @param {Object} responseData - Response data
     */
    logResponseResult(responseData) {
        const reactionTimeText = responseData.reactionTime ? ` (${responseData.reactionTime}ms)` : '';
        const responseText = responseData.response ? 'YES' : 'NO';
        console.log(`📝 Response at ${responseData.level} dB HL: ${responseText}${reactionTimeText}`);
    }

    /**
     * PROCESS_RESPONSE State - Apply Hughson-Westlake rules (AUTONOMOUS DECISION)
     */
    async handleProcessResponseState() {
        const lastResponse = this.responsesAtLevel[this.responsesAtLevel.length - 1];
        
        // Apply Hughson-Westlake intensity adjustment rules
        const intensityDecision = this.determineIntensityAdjustment(lastResponse);
        this.applyIntensityAdjustment(intensityDecision);
        this.applySafetyLimits(intensityDecision);
        this.logDecision(intensityDecision);
        
        // Determine next action based on threshold confirmation status
        const nextAction = this.determineNextAction();
        await this.executeNextAction(nextAction);
    }

    /**
     * Determine intensity adjustment based on Hughson-Westlake rules
     * @param {Object} lastResponse - Most recent patient response
     * @returns {Object} Intensity adjustment decision
     */
    determineIntensityAdjustment(lastResponse) {
        const oldLevel = this.currentLevel;
        
        if (lastResponse.response) {
            return this.createDecreaseDecision(oldLevel);
        } else {
            return this.createIncreaseDecision(oldLevel);
        }
    }

    /**
     * Create intensity decrease decision (patient responded)
     * @param {number} oldLevel - Previous intensity level
     * @returns {Object} Decrease decision
     */
    createDecreaseDecision(oldLevel) {
        return {
            type: 'INTENSITY_DECREASE',
            reason: 'Patient responded - seeking lower threshold',
            rule: 'Hughson-Westlake: Decrease 5 dB on response',
            from: oldLevel,
            to: oldLevel - this.STEP_DOWN,
            adjustment: -this.STEP_DOWN
        };
    }

    /**
     * Create intensity increase decision (no response)
     * @param {number} oldLevel - Previous intensity level
     * @returns {Object} Increase decision
     */
    createIncreaseDecision(oldLevel) {
        return {
            type: 'INTENSITY_INCREASE',
            reason: 'No response - tone too quiet',
            rule: 'Hughson-Westlake: Increase 10 dB on no response',
            from: oldLevel,
            to: oldLevel + this.STEP_UP,
            adjustment: this.STEP_UP
        };
    }

    /**
     * Apply the intensity adjustment to current level
     * @param {Object} decision - Intensity decision
     */
    applyIntensityAdjustment(decision) {
        const oldLevel = this.currentLevel;
        this.currentLevel = decision.to;
        
        // Track reversals for clinical efficiency
        this.trackReversal(decision.adjustment);
        
        const direction = decision.adjustment > 0 ? 'increasing' : 'decreasing';
        const action = decision.adjustment > 0 ? '⬆️' : '⬇️';
        
        console.log(`${action} AI Decision: ${decision.reason} - ${direction} to ${this.currentLevel} dB HL`);
        console.log(`📊 Efficiency tracking: ${this.reversalCount}/${this.MAX_REVERSALS_PER_FREQUENCY} reversals, ${this.presentationCount}/${this.MAX_PRESENTATIONS_PER_FREQUENCY} presentations`);
    }
    
    /**
     * Track reversals in level changes for clinical efficiency
     * @param {number} adjustment - Level adjustment amount
     */
    trackReversal(adjustment) {
        const currentDirection = adjustment > 0 ? 'up' : 'down';
        
        // Check if this is a reversal (direction change)
        if (this.lastLevelDirection && this.lastLevelDirection !== currentDirection) {
            this.reversalCount++;
            console.log(`🔄 Reversal detected (#${this.reversalCount}): ${this.lastLevelDirection} → ${currentDirection}`);
        }
        
        this.lastLevelDirection = currentDirection;
    }

    /**
     * Apply safety limits to prevent dangerous levels
     * @param {Object} decision - Intensity decision to modify
     */
    applySafetyLimits(decision) {
        const beforeLimit = this.currentLevel;
        this.currentLevel = Math.max(this.MIN_LEVEL, Math.min(this.MAX_LEVEL, this.currentLevel));
        
        if (beforeLimit !== this.currentLevel) {
            decision.limitApplied = true;
            decision.limitReason = this.getSafetyLimitReason();
            decision.to = this.currentLevel; // Update decision to reflect actual level
            
            console.log(`⚠️ AI Decision: Safety limit applied - ${decision.limitReason}`);
        }
    }

    /**
     * Get safety limit reason based on which limit was applied
     * @returns {string} Safety limit reason
     */
    getSafetyLimitReason() {
        if (this.currentLevel === this.MAX_LEVEL) {
            return 'Maximum safe level reached';
        } else if (this.currentLevel === this.MIN_LEVEL) {
            return 'Minimum equipment level reached';
        }
        return 'Safety limit applied';
    }

    /**
     * Determine next action based on threshold confirmation status
     * @returns {Object} Next action decision
     */
    determineNextAction() {
        if (this.shouldConfirmThreshold()) {
            return this.createThresholdConfirmationAction();
        } else {
            return this.createContinueTestingAction();
        }
    }

    /**
     * Create threshold confirmation action
     * @returns {Object} Confirmation action
     */
    createThresholdConfirmationAction() {
        return {
            type: 'THRESHOLD_CONFIRMATION',
            reason: '2 out of 3 responses at same level detected',
            rule: 'Hughson-Westlake: Confirm threshold with 2/3 rule',
            responsesCollected: this.responsesAtLevel.length,
            nextState: 'CONFIRM_THRESHOLD'
        };
    }

    /**
     * Create continue testing action
     * @returns {Object} Continue action
     */
    createContinueTestingAction() {
        return {
            type: 'CONTINUE_TESTING',
            reason: 'Insufficient data for threshold confirmation',
            responsesCollected: this.responsesAtLevel.length,
            nextAction: 'Present another tone',
            nextState: 'PRESENT_TONE'
        };
    }

    /**
     * Execute the determined next action
     * @param {Object} action - Action to execute
     */
    async executeNextAction(action) {
        this.logDecision(action);
        
        if (action.type === 'THRESHOLD_CONFIRMATION') {
            console.log(`✓ AI Decision: Sufficient data collected - confirming threshold`);
            this.setState('CONFIRM_THRESHOLD');
        } else {
            console.log(`🔄 AI Decision: Continue testing - need more data (${action.responsesCollected} responses)`);
            await this.delay(this.interStimulusDelay);
            this.setState('PRESENT_TONE');
        }
    }

    /**
     * CONFIRM_THRESHOLD State - Confirm threshold with 2/3 rule (AUTONOMOUS DECISION)
     */
    async handleConfirmThresholdState() {
        const threshold = this.calculateThreshold();
        
        if (this.isThresholdValid(threshold)) {
            await this.finalizeThreshold(threshold);
        } else {
            await this.continueThresholdSearch();
        }
    }

    /**
     * Check if calculated threshold is valid
     * @param {number|null} threshold - Calculated threshold
     * @returns {boolean} Whether threshold is valid
     */
    isThresholdValid(threshold) {
        return threshold !== null;
    }

    /**
     * Finalize confirmed threshold with all required processing
     * @param {number} threshold - Confirmed threshold value
     */
    async finalizeThreshold(threshold) {
        const thresholdContext = this.createThresholdContext(threshold);
        const decision = this.createThresholdDecision(thresholdContext);
        
        // Check if this was triggered by efficiency constraints
        const efficiencyConstraints = this.checkEfficiencyConstraints();
        if (efficiencyConstraints.forceThreshold) {
            this.logEfficiencyConstraintDecision(efficiencyConstraints, threshold, thresholdContext.confidence);
        }
        
        this.logDecision(decision);
        this.logThresholdFinalization(thresholdContext);
        
        const thresholdData = await this.buildThresholdData(thresholdContext);
        this.storeThresholdResult(thresholdData, thresholdContext);
        this.updateSessionAndAnalysis(thresholdData, thresholdContext);
        this.dispatchThresholdEvent(thresholdContext, decision, thresholdData);
        
        this.setState('NEXT_FREQUENCY');
    }
    
    /**
     * Log efficiency constraint decision for clinical transparency
     * @param {Object} constraints - Efficiency constraint information
     * @param {number} threshold - Forced threshold value
     * @param {number} confidence - Threshold confidence
     */
    logEfficiencyConstraintDecision(constraints, threshold, confidence) {
        const constraintDecision = {
            type: 'EFFICIENCY_CONSTRAINT_TRIGGERED',
            constraint: constraints.constraint,
            value: constraints.value,
            limit: this.getConstraintLimit(constraints.constraint),
            reason: constraints.reason,
            forcedThreshold: threshold,
            confidence: confidence,
            clinicalRationale: this.getEfficiencyRationale(constraints.constraint)
        };
        
        this.logDecision(constraintDecision);
        console.log(`⚠️ Efficiency Constraint: ${constraints.reason} - threshold forced at ${threshold} dB HL`);
    }
    
    /**
     * Get constraint limit value for logging
     * @param {string} constraint - Constraint type
     * @returns {number} Constraint limit
     */
    getConstraintLimit(constraint) {
        const limits = {
            'TIME_LIMIT': this.MAX_TIME_PER_FREQUENCY,
            'PRESENTATION_LIMIT': this.MAX_PRESENTATIONS_PER_FREQUENCY,
            'REVERSAL_LIMIT': this.MAX_REVERSALS_PER_FREQUENCY
        };
        
        return limits[constraint] || 0;
    }

    /**
     * Create threshold context with all relevant information
     * @param {number} threshold - Threshold value
     * @returns {Object} Threshold context
     */
    createThresholdContext(threshold) {
        return {
            threshold: threshold,
            ear: this.getCurrentEar(),
            frequency: this.getCurrentFrequency(),
            confidence: this.calculateConfidence(),
            responses: this.responsesAtLevel.length
        };
    }

    /**
     * Create threshold finalization decision
     * @param {Object} context - Threshold context
     * @returns {Object} Decision object
     */
    createThresholdDecision(context) {
        return {
            type: 'THRESHOLD_FINALIZED',
            reason: '2 out of 3 responses confirmed at threshold level',
            rule: 'Hughson-Westlake: Lowest level with 2+ positive responses',
            threshold: context.threshold,
            confidence: Math.round(context.confidence * 100),
            ear: context.ear,
            frequency: context.frequency,
            totalResponses: context.responses
        };
    }

    /**
     * Log threshold finalization for clinical transparency
     * @param {Object} context - Threshold context
     */
    logThresholdFinalization(context) {
        const confidencePercent = Math.round(context.confidence * 100);
        console.log(`✅ AI Decision: Threshold finalized at ${context.threshold} dB HL (confidence: ${confidencePercent}%)`);
    }

    /**
     * Build comprehensive threshold data with all analyses
     * @param {Object} context - Threshold context
     * @returns {Object} Complete threshold data
     */
    async buildThresholdData(context) {
        const enhancedConfidence = this.falseResponseDetector.calculateConfidenceScore(
            { threshold: context.threshold, confidence: context.confidence },
            context.frequency,
            context.ear
        );

        return {
            threshold: context.threshold,
            confidence: context.confidence / 100, // Original confidence (0-1)
            enhancedConfidence: enhancedConfidence, // Enhanced confidence (0-100)
            responses: context.responses,
            malingeringRisk: 0, // Will be calculated by MalingeringDetector
            decisionBasis: '2 out of 3 rule',
            responsePattern: this.getResponsePattern(),
            falseResponseAnalysis: this.falseResponseDetector.getDetectionReport()
        };
    }

    /**
     * Store threshold result in test results
     * @param {Object} thresholdData - Complete threshold data
     * @param {Object} context - Threshold context
     */
    storeThresholdResult(thresholdData, context) {
        const key = `${context.ear}_${context.frequency}`;
        this.testResults.set(key, thresholdData);
    }

    /**
     * Update session and perform malingering analysis
     * @param {Object} thresholdData - Threshold data
     * @param {Object} context - Threshold context
     */
    updateSessionAndAnalysis(thresholdData, context) {
        // Update session if available
        if (this.session) {
            this.session.updateThreshold(context.ear, context.frequency, thresholdData);
        }
        
        // Analyze for malingering
        this.malingeringDetector.analyzeResponse(thresholdData, context.frequency, context.ear);
    }

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

    /**
     * Continue threshold search when more data is needed
     */
    async continueThresholdSearch() {
        const decision = this.createContinueSearchDecision();
        this.logDecision(decision);
        
        console.log(`❓ AI Decision: Threshold not confirmed - need more data (${this.responsesAtLevel.length} responses)`);
        
        await this.delay(this.interStimulusDelay);
        this.setState('PRESENT_TONE');
    }

    /**
     * Create continue search decision
     * @returns {Object} Continue search decision
     */
    createContinueSearchDecision() {
        return {
            type: 'CONTINUE_THRESHOLD_SEARCH',
            reason: '2 out of 3 rule not yet satisfied',
            rule: 'Hughson-Westlake: Require 2+ positive responses at same level',
            currentResponses: this.responsesAtLevel.length,
            nextAction: 'Continue stimulus presentation'
        };
    }

    /**
     * NEXT_FREQUENCY State - Move to next frequency (AUTONOMOUS DECISION)
     */
    async handleNextFrequencyState() {
        const currentFreq = this.getCurrentFrequency();
        this.currentFrequencyIndex++;
        
        if (this.hasMoreFrequenciesToTest()) {
            await this.proceedToNextFrequency(currentFreq);
        } else {
            await this.completeCurrentEar();
        }
    }

    /**
     * Check if there are more frequencies to test in current ear
     * @returns {boolean} True if more frequencies remain
     */
    hasMoreFrequenciesToTest() {
        return this.currentFrequencyIndex < this.frequencies.length;
    }

    /**
     * Proceed to next frequency in test sequence
     * @param {number} currentFreq - Current frequency being tested
     */
    async proceedToNextFrequency(currentFreq) {
        const nextFreq = this.getCurrentFrequency();
        const decision = this.createFrequencyChangeDecision(currentFreq, nextFreq);
        
        this.logDecision(decision);
        console.log(`🎵 AI Decision: Frequency change ${currentFreq} → ${nextFreq} Hz`);
        
        this.initializeFrequencyTest();
        await this.delay(1000);
        this.setState('PRESENT_TONE');
    }

    /**
     * Create frequency change decision object
     * @param {number} fromFreq - Previous frequency
     * @param {number} toFreq - Next frequency
     * @returns {Object} Decision object
     */
    createFrequencyChangeDecision(fromFreq, toFreq) {
        return {
            type: 'FREQUENCY_CHANGE',
            reason: 'Threshold established for current frequency',
            rule: 'Standard audiometric protocol: Test all frequencies',
            from: fromFreq,
            to: toFreq,
            ear: this.getCurrentEar()
        };
    }

    /**
     * Complete testing for current ear
     */
    async completeCurrentEar() {
        const decision = this.createEarCompletionDecision();
        
        this.logDecision(decision);
        console.log(`👂 AI Decision: ${this.getCurrentEar()} ear complete - switching ears`);
        this.setState('NEXT_EAR');
    }

    /**
     * Create ear completion decision object
     * @returns {Object} Decision object
     */
    createEarCompletionDecision() {
        return {
            type: 'EAR_COMPLETION',
            reason: 'All frequencies tested for current ear',
            ear: this.getCurrentEar(),
            frequenciesCompleted: this.frequencies.length,
            nextAction: 'Switch to opposite ear'
        };
    }

    /**
     * NEXT_EAR State - Move to next ear (AUTONOMOUS DECISION)
     */
    async handleNextEarState() {
        const currentEar = this.getCurrentEar();
        this.currentEarIndex++;
        
        if (this.hasMoreEarsToTest()) {
            await this.switchToNextEar(currentEar);
        } else {
            await this.completeEntireTest();
        }
    }

    /**
     * Check if there are more ears to test
     * @returns {boolean} True if more ears remain
     */
    hasMoreEarsToTest() {
        return this.currentEarIndex < this.testEars.length;
    }

    /**
     * Switch to next ear in test sequence
     * @param {string} currentEar - Current ear being tested
     */
    async switchToNextEar(currentEar) {
        const nextEar = this.getCurrentEar();
        const decision = this.createEarSwitchDecision(currentEar, nextEar);
        
        this.logDecision(decision);
        console.log(`👂 AI Decision: Ear switch ${currentEar} → ${nextEar}`);
        
        this.resetForNewEar();
        await this.delay(2000);
        this.setState('PRESENT_TONE');
    }

    /**
     * Create ear switch decision object
     * @param {string} fromEar - Previous ear
     * @param {string} toEar - Next ear
     * @returns {Object} Decision object
     */
    createEarSwitchDecision(fromEar, toEar) {
        return {
            type: 'EAR_SWITCH',
            reason: 'Complete bilateral assessment required',
            rule: 'Clinical standard: Test both ears independently',
            from: fromEar,
            to: toEar,
            completedFrequencies: this.frequencies.length
        };
    }

    /**
     * Reset test parameters for new ear
     */
    resetForNewEar() {
        this.currentFrequencyIndex = 0;
        this.initializeFrequencyTest();
    }

    /**
     * Complete entire audiometric test
     */
    async completeEntireTest() {
        const decision = this.createTestCompletionDecision();
        
        this.logDecision(decision);
        console.log(`🎉 AI Decision: Complete audiometric assessment achieved`);
        this.setState('TEST_COMPLETE');
    }

    /**
     * Create test completion decision object
     * @returns {Object} Decision object
     */
    createTestCompletionDecision() {
        return {
            type: 'TEST_COMPLETION',
            reason: 'All ears and frequencies tested',
            rule: 'Complete audiometric assessment achieved',
            totalTests: this.testResults.size,
            expectedTests: this.testEars.length * this.frequencies.length
        };
    }

    /**
     * TEST_COMPLETE State - Finalize test
     */
    async handleTestCompleteState() {
        console.log('🎉 Hughson-Westlake test completed');
        await this.completeTest();
        this.isTestActive = false;
    }

    // ==================== HELPER METHODS ====================

    /**
     * Initialize test for new frequency
     */
    initializeFrequencyTest() {
        this.currentLevel = this.INITIAL_LEVEL;
        this.responsesAtLevel = [];
        this.thresholdConfirmed = false;
        this.confirmedThreshold = null;
        this.lastToneStartTime = null;
        
        // Reset clinical efficiency tracking for new frequency
        this.frequencyStartTime = Date.now();
        this.reversalCount = 0;
        this.presentationCount = 0;
        this.lastLevelDirection = null;
        
        const ear = this.getCurrentEar();
        const frequency = this.getCurrentFrequency();
        console.log(`\n🎯 Starting threshold search: ${frequency} Hz (${ear} ear)`);
        console.log(`📊 Efficiency limits: ${this.MAX_REVERSALS_PER_FREQUENCY} reversals, ${this.MAX_PRESENTATIONS_PER_FREQUENCY} presentations, ${this.MAX_TIME_PER_FREQUENCY/1000}s`);
    }

    /**
     * Check if threshold should be confirmed (2 out of 3 responses at same level)
     * Now includes clinical efficiency constraints
     */
    shouldConfirmThreshold() {
        // Check clinical efficiency constraints first
        const efficiencyConstraints = this.checkEfficiencyConstraints();
        if (efficiencyConstraints.forceThreshold) {
            console.log(`⏰ Clinical Efficiency: ${efficiencyConstraints.reason} - forcing threshold estimation`);
            return true;
        }
        
        // Check traditional maximum responses
        if (this.hasExceededMaximumResponses()) {
            return true;
        }
        
        // Check standard 2 out of 3 rule
        const levelGroups = this.groupResponsesByLevel();
        const hasValidConfirmation = this.hasValidThresholdConfirmation(levelGroups);
        
        // Also check if we have sufficient confidence to proceed
        if (hasValidConfirmation) {
            const currentConfidence = this.calculateConfidence();
            if (currentConfidence >= this.FORCE_THRESHOLD_CONFIDENCE) {
                console.log(`✅ Sufficient confidence (${Math.round(currentConfidence * 100)}%) - confirming threshold`);
                return true;
            }
        }
        
        return hasValidConfirmation;
    }

    /**
     * Check clinical efficiency constraints
     * @returns {Object} Constraint check results
     */
    checkEfficiencyConstraints() {
        const timeElapsed = Date.now() - this.frequencyStartTime;
        
        // Check time constraint
        if (timeElapsed >= this.MAX_TIME_PER_FREQUENCY) {
            return {
                forceThreshold: true,
                reason: `Maximum time limit reached (${this.MAX_TIME_PER_FREQUENCY/1000}s)`,
                constraint: 'TIME_LIMIT',
                value: timeElapsed
            };
        }
        
        // Check presentation count constraint
        if (this.presentationCount >= this.MAX_PRESENTATIONS_PER_FREQUENCY) {
            return {
                forceThreshold: true,
                reason: `Maximum presentations reached (${this.MAX_PRESENTATIONS_PER_FREQUENCY})`,
                constraint: 'PRESENTATION_LIMIT',
                value: this.presentationCount
            };
        }
        
        // Check reversal count constraint
        if (this.reversalCount >= this.MAX_REVERSALS_PER_FREQUENCY) {
            return {
                forceThreshold: true,
                reason: `Maximum reversals reached (${this.MAX_REVERSALS_PER_FREQUENCY})`,
                constraint: 'REVERSAL_LIMIT',
                value: this.reversalCount
            };
        }
        
        return {
            forceThreshold: false,
            timeRemaining: this.MAX_TIME_PER_FREQUENCY - timeElapsed,
            presentationsRemaining: this.MAX_PRESENTATIONS_PER_FREQUENCY - this.presentationCount,
            reversalsRemaining: this.MAX_REVERSALS_PER_FREQUENCY - this.reversalCount
        };
    }

    /**
     * Check if maximum response limit has been exceeded
     * @returns {boolean} True if too many responses collected
     */
    hasExceededMaximumResponses() {
        if (this.responsesAtLevel.length > 15) {
            console.log('⚠️ Maximum responses reached - forcing threshold calculation');
            return true;
        }
        return false;
    }

    /**
     * Group recent responses by intensity level
     * @returns {Object} Responses grouped by level
     */
    groupResponsesByLevel() {
        const recentResponses = this.responsesAtLevel.slice(-6);
        const levelGroups = {};
        
        recentResponses.forEach(r => {
            if (!levelGroups[r.level]) {
                levelGroups[r.level] = [];
            }
            levelGroups[r.level].push(r);
        });
        
        return levelGroups;
    }

    /**
     * Check if any level has valid threshold confirmation (2 out of 3 rule)
     * @param {Object} levelGroups - Responses grouped by level
     * @returns {boolean} True if threshold can be confirmed
     */
    hasValidThresholdConfirmation(levelGroups) {
        for (const level in levelGroups) {
            const responses = levelGroups[level];
            
            if (this.hasMinimumResponsesAtLevel(responses)) {
                const positiveResponses = this.countPositiveResponses(responses);
                
                if (this.meetsConfirmationRule(positiveResponses)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if level has minimum required responses
     * @param {Array} responses - Responses at specific level
     * @returns {boolean} True if minimum responses met
     */
    hasMinimumResponsesAtLevel(responses) {
        return responses.length >= 3;
    }

    /**
     * Count positive responses in array
     * @param {Array} responses - Response array
     * @returns {number} Number of positive responses
     */
    countPositiveResponses(responses) {
        return responses.filter(r => r.response).length;
    }

    /**
     * Check if responses meet 2 out of 3 confirmation rule
     * @param {number} positiveResponses - Number of positive responses
     * @returns {boolean} True if rule is satisfied
     */
    meetsConfirmationRule(positiveResponses) {
        return positiveResponses >= 2;
    }

    /**
     * Calculate threshold using 2 out of 3 rule with efficiency constraints
     */
    calculateThreshold() {
        const levelGroups = this.buildLevelResponseGroups();
        const primaryThreshold = this.findPrimaryThreshold(levelGroups);
        
        // If primary threshold found, use it
        if (primaryThreshold !== null) {
            return primaryThreshold;
        }
        
        // Check if we're being forced due to efficiency constraints
        const efficiencyConstraints = this.checkEfficiencyConstraints();
        if (efficiencyConstraints.forceThreshold) {
            return this.calculateForcedThreshold(efficiencyConstraints);
        }
        
        return this.findFallbackThreshold();
    }
    
    /**
     * Calculate threshold when forced by efficiency constraints
     * @param {Object} constraints - Efficiency constraint information
     * @returns {number} Forced threshold estimate
     */
    calculateForcedThreshold(constraints) {
        console.log(`⚠️ Calculating forced threshold due to: ${constraints.reason}`);
        
        // Use best available evidence even if not meeting 2/3 rule
        const bestEstimate = this.findBestAvailableThreshold();
        
        if (bestEstimate !== null) {
            console.log(`📊 Using best available evidence: ${bestEstimate} dB HL`);
            return bestEstimate;
        }
        
        // If no positive responses, estimate based on current testing level
        const estimatedThreshold = this.estimateThresholdFromCurrentLevel();
        console.log(`📊 Estimating threshold from current level: ${estimatedThreshold} dB HL`);
        
        return estimatedThreshold;
    }
    
    /**
     * Find best available threshold estimate from collected data
     * @returns {number|null} Best threshold estimate or null
     */
    findBestAvailableThreshold() {
        // Look for any level with at least 1 positive response out of 2+ presentations
        const levelGroups = this.buildLevelResponseGroups();
        let bestThreshold = null;
        let bestRatio = 0;
        
        for (const level in levelGroups) {
            const group = levelGroups[level];
            const levelNum = parseInt(level);
            
            if (group.total >= 2 && group.positive >= 1) {
                const ratio = group.positive / group.total;
                
                // Prefer lower levels with reasonable response rates
                if (ratio >= 0.5 && (bestThreshold === null || levelNum < bestThreshold)) {
                    bestThreshold = levelNum;
                    bestRatio = ratio;
                }
            }
        }
        
        if (bestThreshold !== null) {
            console.log(`📊 Best available: ${bestThreshold} dB HL (${Math.round(bestRatio * 100)}% response rate)`);
        }
        
        return bestThreshold;
    }
    
    /**
     * Estimate threshold based on current testing level and response pattern
     * @returns {number} Estimated threshold
     */
    estimateThresholdFromCurrentLevel() {
        const recentResponses = this.responsesAtLevel.slice(-3);
        const hasRecentPositive = recentResponses.some(r => r.response);
        
        if (hasRecentPositive) {
            // If we have recent positive responses, threshold is likely near current level
            const positiveResponses = recentResponses.filter(r => r.response);
            const avgPositiveLevel = positiveResponses.reduce((sum, r) => sum + r.level, 0) / positiveResponses.length;
            return Math.round(avgPositiveLevel);
        } else {
            // No recent positive responses - threshold likely above current level
            // Estimate conservatively
            return Math.min(this.currentLevel + 10, this.MAX_LEVEL);
        }
    }

    /**
     * Build response groups with positive/total counts per level
     * @returns {Object} Level groups with response statistics
     */
    buildLevelResponseGroups() {
        const levelGroups = {};
        
        this.responsesAtLevel.forEach(r => {
            if (!levelGroups[r.level]) {
                levelGroups[r.level] = { positive: 0, total: 0 };
            }
            levelGroups[r.level].total++;
            if (r.response) {
                levelGroups[r.level].positive++;
            }
        });
        
        return levelGroups;
    }

    /**
     * Find primary threshold using 2 out of 3 rule
     * @param {Object} levelGroups - Response groups by level
     * @returns {number|null} Primary threshold or null if not found
     */
    findPrimaryThreshold(levelGroups) {
        let lowestThreshold = null;
        
        for (const level in levelGroups) {
            const group = levelGroups[level];
            const levelNum = parseInt(level);
            
            if (this.isValidThresholdLevel(group)) {
                lowestThreshold = this.updateLowestThreshold(lowestThreshold, levelNum);
            }
        }
        
        return lowestThreshold;
    }

    /**
     * Check if level meets threshold validation criteria
     * @param {Object} group - Response group for specific level
     * @returns {boolean} True if level is valid for threshold
     */
    isValidThresholdLevel(group) {
        return group.total >= 3 && group.positive >= 2;
    }

    /**
     * Update lowest threshold if new level is lower
     * @param {number|null} currentLowest - Current lowest threshold
     * @param {number} newLevel - New level to compare
     * @returns {number} Updated lowest threshold
     */
    updateLowestThreshold(currentLowest, newLevel) {
        return currentLowest === null || newLevel < currentLowest 
            ? newLevel 
            : currentLowest;
    }

    /**
     * Find fallback threshold when primary method fails
     * @returns {number} Fallback threshold value
     */
    findFallbackThreshold() {
        const positiveResponseThreshold = this.findLowestPositiveResponseLevel();
        
        if (positiveResponseThreshold !== null) {
            return positiveResponseThreshold;
        }
        
        return this.handleNoResponsesDetected();
    }

    /**
     * Find lowest level with any positive response
     * @returns {number|null} Lowest positive response level or null
     */
    findLowestPositiveResponseLevel() {
        const positiveLevels = this.responsesAtLevel
            .filter(r => r.response)
            .map(r => r.level);
        
        if (positiveLevels.length > 0) {
            console.log('⚠️ Using lowest positive response level');
            return Math.min(...positiveLevels);
        }
        
        return null;
    }

    /**
     * Handle case where no responses were detected
     * @returns {number} Maximum level threshold
     */
    handleNoResponsesDetected() {
        console.log('⚠️ No responses detected - threshold > max level');
        return this.MAX_LEVEL;
    }

    /**
     * Calculate confidence based on response consistency and efficiency constraints
     */
    calculateConfidence() {
        if (this.responsesAtLevel.length < 3) return 0.5;
        
        // Calculate base consistency confidence
        const baseConfidence = this.calculateBaseConfidence();
        
        // Apply efficiency constraint penalties
        const efficiencyPenalty = this.calculateEfficiencyPenalty();
        
        // Final confidence with efficiency adjustments
        const finalConfidence = Math.max(0.2, baseConfidence - efficiencyPenalty);
        
        console.log(`📊 Confidence calculation: base=${Math.round(baseConfidence * 100)}%, penalty=${Math.round(efficiencyPenalty * 100)}%, final=${Math.round(finalConfidence * 100)}%`);
        
        return finalConfidence;
    }
    
    /**
     * Calculate base confidence from response consistency
     * @returns {number} Base confidence score (0-1)
     */
    calculateBaseConfidence() {
        const levelGroups = {};
        this.responsesAtLevel.forEach(r => {
            if (!levelGroups[r.level]) {
                levelGroups[r.level] = { positive: 0, total: 0 };
            }
            levelGroups[r.level].total++;
            if (r.response) levelGroups[r.level].positive++;
        });
        
        // High confidence if responses are consistent at each level
        let consistencyScore = 0;
        let totalGroups = 0;
        
        for (const level in levelGroups) {
            const group = levelGroups[level];
            if (group.total >= 2) {
                const consistency = group.positive / group.total;
                // Consistent if all positive or all negative
                if (consistency === 0 || consistency === 1) {
                    consistencyScore += 1;
                } else if (consistency >= 0.66 || consistency <= 0.33) {
                    consistencyScore += 0.5;
                }
                totalGroups++;
            }
        }
        
        const confidence = totalGroups > 0 ? consistencyScore / totalGroups : 0.5;
        return Math.min(0.95, Math.max(0.3, confidence));
    }
    
    /**
     * Calculate confidence penalty based on efficiency constraints
     * @returns {number} Penalty amount (0-0.3)
     */
    calculateEfficiencyPenalty() {
        let penalty = 0;
        
        // Penalty for excessive reversals (indicates inconsistent responses)
        const reversalRatio = this.reversalCount / this.MAX_REVERSALS_PER_FREQUENCY;
        if (reversalRatio > 0.75) {
            penalty += 0.15; // High reversal penalty
        } else if (reversalRatio > 0.5) {
            penalty += 0.1;  // Moderate reversal penalty
        }
        
        // Penalty for excessive presentations (indicates difficulty establishing threshold)
        const presentationRatio = this.presentationCount / this.MAX_PRESENTATIONS_PER_FREQUENCY;
        if (presentationRatio > 0.8) {
            penalty += 0.1; // High presentation penalty
        } else if (presentationRatio > 0.6) {
            penalty += 0.05; // Moderate presentation penalty
        }
        
        // Penalty for time pressure (may affect response quality)
        const timeElapsed = Date.now() - this.frequencyStartTime;
        const timeRatio = timeElapsed / this.MAX_TIME_PER_FREQUENCY;
        if (timeRatio > 0.8) {
            penalty += 0.05; // Time pressure penalty
        }
        
        return Math.min(0.3, penalty); // Cap total penalty at 30%
    }

    /**
     * Get current ear being tested
     */
    getCurrentEar() {
        return this.testEars[this.currentEarIndex];
    }

    /**
     * Get current frequency being tested
     */
    getCurrentFrequency() {
        return this.frequencies[this.currentFrequencyIndex];
    }

    /**
     * Log clinical decision with human-readable explanation
     */
    logDecision(decision) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            state: this.currentState,
            ear: this.getCurrentEar(),
            frequency: this.getCurrentFrequency(),
            level: this.currentLevel,
            ...decision
        };
        
        // Generate human-readable explanation
        const explanation = this.generateDecisionExplanation(logEntry);
        logEntry.explanation = explanation;
        
        this.decisionLog.push(logEntry);
        
        // Log explanation to console for transparency
        if (explanation.primary) {
            console.log(`📋 Clinical Explanation: ${explanation.primary}`);
        }
        
        // Dispatch decision event with explanation for UI
        document.dispatchEvent(new CustomEvent('clinical-decision', {
            detail: {
                ...logEntry,
                explanation: explanation
            }
        }));
    }

    /**
     * Generate human-readable explanation for a decision
     * @param {Object} decision - Decision data
     * @returns {Object} Comprehensive explanation
     */
    generateDecisionExplanation(decision) {
        try {
            const { type } = decision;
            
            switch (type) {
            case 'INTENSITY_INCREASE':
            case 'INTENSITY_DECREASE':
                return this.safeExplainerCall(() => 
                    this.clinicalExplainer.explainIntensityAdjustment({
                        direction: type === 'INTENSITY_INCREASE' ? 'increase' : 'decrease',
                        fromLevel: decision.from,
                        toLevel: decision.to,
                        reason: decision.reason,
                        response: type === 'INTENSITY_DECREASE',
                        rule: decision.rule,
                        safetyApplied: decision.limitApplied
                    }), 
                    `Intensity ${type === 'INTENSITY_INCREASE' ? 'increased' : 'decreased'}: ${decision.reason}`
                );
                
            case 'THRESHOLD_FINALIZED':
                return this.safeExplainerCall(() => 
                    this.clinicalExplainer.explainThresholdDecision({
                        threshold: decision.threshold,
                        confidence: decision.confidence / 100,
                        responses: decision.totalResponses,
                        reversals: this.countReversals(),
                        ear: decision.ear,
                        frequency: decision.frequency,
                        method: 'Hughson-Westlake',
                        responsePattern: this.getResponsePattern(),
                        reactionTimeAnalysis: this.responseAnalyzer.getTimingStatistics()
                    }, {
                        testProgress: this.getTestProgress()
                    }),
                    `Threshold finalized at ${decision.threshold} dB HL for ${decision.ear} ear, ${decision.frequency} Hz`
                );
                
            case 'FREQUENCY_CHANGE':
                return this.safeExplainerCall(() => 
                    this.clinicalExplainer.explainFrequencyProgression({
                        fromFrequency: decision.from,
                        toFrequency: decision.to,
                        completedThreshold: this.confirmedThreshold,
                        testSequence: this.frequencies,
                        ear: decision.ear,
                        rationale: decision.reason
                    }),
                    `Frequency changed from ${decision.from} Hz to ${decision.to} Hz`
                );
                
            case 'EAR_SWITCH':
                return this.safeExplainerCall(() => 
                    this.clinicalExplainer.explainEarSwitch({
                        fromEar: decision.from,
                        toEar: decision.to,
                        completedFrequencies: this.frequencies,
                        thresholds: this.getEarThresholds(decision.from),
                        bilateralComparison: true
                    }),
                    `Switched from ${decision.from} ear to ${decision.to} ear testing`
                );
                
            case 'CATCH_TRIAL_EXECUTED':
                return this.safeExplainerCall(() => 
                    this.clinicalExplainer.explainCatchTrial({
                        type: decision.catchType,
                        response: decision.response,
                        expected: decision.expectedResponse,
                        purpose: 'Response validity assessment',
                        result: decision.response === decision.expectedResponse ? 'PASSED' : 'FAILED',
                        confidenceImpact: decision.response !== decision.expectedResponse ? -0.1 : 0
                    }),
                    `Catch trial executed: ${decision.catchType} - ${decision.response === decision.expectedResponse ? 'PASSED' : 'FAILED'}`
                );
                
            case 'EFFICIENCY_CONSTRAINT_TRIGGERED':
                return this.safeExplainerCall(() => 
                    this.clinicalExplainer.explainEfficiencyConstraint({
                        constraint: decision.constraint,
                        value: decision.value,
                        limit: decision.limit,
                        reason: decision.reason,
                        forcedThreshold: decision.forcedThreshold,
                        confidence: decision.confidence,
                        clinicalRationale: this.getEfficiencyRationale(decision.constraint)
                    }),
                    `Efficiency constraint triggered: ${decision.reason}`
                );
                
            case 'TEST_COMPLETION':
                return this.safeExplainerCall(() => 
                    this.clinicalExplainer.explainTestCompletion({
                        totalMeasurements: decision.totalTests,
                        ears: this.testEars,
                        overallConfidence: this.calculateOverallConfidence(),
                        testDuration: Date.now() - (this.session?.startTime || Date.now()),
                        qualityMetrics: this.getQualityMetrics(),
                        clinicalFindings: this.getClinicalFindings()
                    }),
                    `Audiometric test completed: ${decision.totalTests} measurements across ${this.testEars.length} ears`
                );
                
            default:
                return {
                    primary: decision.reason || 'Clinical decision made',
                    rationale: { rule: decision.rule || 'Standard clinical protocol' }
                };
        }
        
        } catch (error) {
            // Defensive fallback - never crash the clinical flow
            console.warn('Error generating decision explanation:', error);
            return this.createFallbackExplanation(decision);
        }
    }

    /**
     * Safely call clinical explainer methods with defensive error handling
     * @param {Function} explainerCall - Function that calls the explainer method
     * @param {string} fallbackMessage - Fallback message if explainer fails
     * @returns {Object} Explanation object or fallback
     */
    safeExplainerCall(explainerCall, fallbackMessage) {
        try {
            const result = explainerCall();
            
            // Validate the result has expected structure
            if (result && typeof result === 'object' && result.primary) {
                return result;
            } else {
                console.warn('Explainer returned invalid result structure, using fallback');
                return this.createSimpleFallback(fallbackMessage);
            }
            
        } catch (error) {
            console.warn('Clinical explainer method failed:', error.message);
            return this.createSimpleFallback(fallbackMessage);
        }
    }

    /**
     * Create a fallback explanation when the main explanation system fails
     * @param {Object} decision - Decision data
     * @returns {Object} Fallback explanation
     */
    createFallbackExplanation(decision) {
        const { type, reason } = decision;
        
        const fallbackMessages = {
            'INTENSITY_INCREASE': 'Intensity increased - no response detected',
            'INTENSITY_DECREASE': 'Intensity decreased - response confirmed',
            'THRESHOLD_FINALIZED': `Threshold established at ${decision.threshold || 'unknown'} dB HL`,
            'FREQUENCY_CHANGE': `Frequency changed from ${decision.from || 'previous'} to ${decision.to || 'next'}`,
            'EAR_SWITCH': `Switched from ${decision.from || 'previous'} ear to ${decision.to || 'next'} ear`,
            'CATCH_TRIAL_EXECUTED': `Catch trial executed - ${decision.catchType || 'validity check'}`,
            'EFFICIENCY_CONSTRAINT_TRIGGERED': `Clinical efficiency limit reached - ${reason || 'proceeding with available data'}`,
            'TEST_COMPLETION': 'Audiometric assessment completed'
        };

        return {
            primary: fallbackMessages[type] || reason || 'Clinical decision made',
            rationale: {
                rule: 'Standard clinical protocol',
                note: 'Detailed explanation unavailable - clinical progression maintained'
            },
            fallback: true
        };
    }

    /**
     * Create a simple fallback explanation
     * @param {string} message - Simple fallback message
     * @returns {Object} Simple explanation object
     */
    createSimpleFallback(message) {
        return {
            primary: message,
            rationale: {
                rule: 'Clinical decision protocol',
                note: 'Detailed explanation unavailable'
            },
            fallback: true
        };
    }

    /**
     * Get current AI state with explanations
     * @returns {Object} Current state with human-readable explanations
     */
    getExplainedState() {
        const aiState = {
            currentState: this.currentState,
            currentEar: this.getCurrentEar(),
            currentFrequency: this.getCurrentFrequency(),
            currentLevel: this.currentLevel,
            recentDecisions: this.decisionLog.slice(-5),
            testProgress: this.getTestProgress(),
            qualityMetrics: this.getQualityMetrics()
        };
        
        return this.clinicalExplainer.explainCurrentState(aiState);
    }

    /**
     * Get test progress information
     * @returns {Object} Test progress data
     */
    getTestProgress() {
        const totalTests = this.testEars.length * this.frequencies.length;
        const completedTests = this.testResults.size;
        
        return {
            completed: completedTests,
            total: totalTests,
            currentPhase: `${this.getCurrentEar()} ear - ${this.getCurrentFrequency()} Hz`,
            estimatedTimeRemaining: (totalTests - completedTests) * 30000 // Rough estimate: 30s per test
        };
    }

    /**
     * Get quality metrics
     * @returns {Object} Quality metrics data
     */
    getQualityMetrics() {
        const responseSummary = this.responseAnalyzer.getResponseSummary();
        
        return {
            overallConfidence: responseSummary.overallConfidence || 0.8,
            fatigueLevel: responseSummary.fatigueLevel || 0,
            attentionLevel: responseSummary.attentionLevel || 1.0,
            responseConsistency: responseSummary.consistency || 0.8
        };
    }

    /**
     * Get clinical findings summary
     * @returns {Object} Clinical findings
     */
    getClinicalFindings() {
        const findings = {
            thresholds: {},
            patterns: [],
            concerns: []
        };
        
        // Collect thresholds
        this.testResults.forEach((result, key) => {
            findings.thresholds[key] = {
                threshold: result.threshold,
                confidence: result.confidence
            };
        });
        
        // Identify patterns
        const malingeringReport = this.malingeringDetector.getFinalReport();
        if (malingeringReport.overallRisk > 0.3) {
            findings.concerns.push('Malingering indicators detected');
        }
        
        const responseSummary = this.responseAnalyzer.getResponseSummary();
        if (responseSummary.fatigueLevel > 0.5) {
            findings.concerns.push('Patient fatigue observed');
        }
        
        return findings;
    }

    /**
     * Get thresholds for a specific ear
     * @param {string} ear - Ear identifier
     * @returns {Object} Ear thresholds
     */
    getEarThresholds(ear) {
        const thresholds = {};
        
        this.testResults.forEach((result, key) => {
            if (key.startsWith(ear)) {
                const frequency = key.split('_')[1];
                thresholds[frequency] = result.threshold;
            }
        });
        
        return thresholds;
    }

    /**
     * Count reversals in current response pattern
     * @returns {number} Number of reversals
     */
    countReversals() {
        let reversals = 0;
        let lastDirection = null;
        
        for (let i = 1; i < this.responsesAtLevel.length; i++) {
            const current = this.responsesAtLevel[i];
            const previous = this.responsesAtLevel[i - 1];
            
            if (current.level !== previous.level) {
                const direction = current.level > previous.level ? 'up' : 'down';
                
                if (lastDirection && direction !== lastDirection) {
                    reversals++;
                }
                
                lastDirection = direction;
            }
        }
        
        return reversals;
    }

    /**
     * Calculate overall test confidence
     * @returns {number} Overall confidence (0-1)
     */
    calculateOverallConfidence() {
        if (this.testResults.size === 0) return 0;
        
        let totalConfidence = 0;
        this.testResults.forEach(result => {
            totalConfidence += result.confidence || 0.5;
        });
        
        return totalConfidence / this.testResults.size;
    }

    /**
     * Get response pattern for current frequency
     */
    getResponsePattern() {
        const pattern = this.responsesAtLevel.map(r => ({
            level: r.level,
            response: r.response ? 'Y' : 'N'
        }));
        
        return pattern;
    }

    /**
     * Get clinical decision history
     */
    getDecisionHistory() {
        return [...this.decisionLog];
    }

    /**
     * Get clinical explanation for current state
     */
    getCurrentExplanation() {
        const ear = this.getCurrentEar();
        const frequency = this.getCurrentFrequency();
        
        switch (this.currentState) {
            case 'FAMILIARIZATION':
                return {
                    action: 'Patient Instruction',
                    reason: 'Ensuring patient understands test procedure',
                    clinical: 'Present clear, audible tone for familiarization'
                };
            
            case 'PRESENT_TONE':
                return {
                    action: `Presenting ${frequency} Hz at ${this.currentLevel} dB HL`,
                    reason: `Testing hearing threshold for ${ear} ear`,
                    clinical: 'Hughson-Westlake method: Systematic threshold determination'
                };
            
            case 'WAIT_RESPONSE':
                return {
                    action: 'Waiting for patient response',
                    reason: 'Collecting behavioral response data',
                    clinical: '3-second response window per clinical standards'
                };
            
            case 'PROCESS_RESPONSE':
                return {
                    action: 'Analyzing response and adjusting level',
                    reason: 'Applying Hughson-Westlake intensity rules',
                    clinical: 'Response: -5dB, No response: +10dB'
                };
            
            case 'CONFIRM_THRESHOLD':
                return {
                    action: 'Confirming threshold using 2/3 rule',
                    reason: 'Ensuring reliable threshold measurement',
                    clinical: 'Require 2+ positive responses at same level'
                };
            
            default:
                return {
                    action: this.currentState,
                    reason: 'Autonomous test progression',
                    clinical: 'Following standard audiometric protocol'
                };
        }
    }

    // ==================== AUDIO & RESPONSE METHODS ====================

    /**
     * Present tone stimulus (supports catch trials)
     */
    async presentTone(frequency, level, ear, duration = 1000) {
        if (!this.audioEngine) {
            console.error('Audio engine not available');
            return;
        }
        
        // Dispatch event for UI updates
        document.dispatchEvent(new CustomEvent('tone-presented', {
            detail: { frequency, level, ear, duration, isCatchTrial: level < 0 }
        }));
        
        try {
            // Only present tone if level is above minimum threshold
            // (catch trials with very low levels may not actually play)
            if (level >= this.MIN_LEVEL) {
                await this.audioEngine.playTone(frequency, level, duration, ear);
            } else {
                // Simulate presentation time for catch trials
                await this.delay(duration);
            }
        } catch (error) {
            console.error('Failed to present tone:', error);
        }
    }

    /**
     * Wait for patient response with timeout
     */
    async waitForResponse(timeoutMs) {
        return new Promise((resolve) => {
            let responseReceived = false;
            let responseTimer = null;
            
            const responseHandler = (event) => {
                if (!responseReceived && this.isTestActive) {
                    responseReceived = true;
                    clearTimeout(responseTimer);
                    document.removeEventListener('patient-response', responseHandler);
                    
                    // Record response timing
                    this.responseAnalyzer.addResponse(
                        this.getCurrentFrequency(),
                        this.currentLevel,
                        true,
                        Date.now()
                    );
                    
                    resolve(true);
                }
            };
            
            document.addEventListener('patient-response', responseHandler);
            
            responseTimer = setTimeout(() => {
                if (!responseReceived) {
                    responseReceived = true;
                    document.removeEventListener('patient-response', responseHandler);
                    
                    // Record no response
                    this.responseAnalyzer.addResponse(
                        this.getCurrentFrequency(),
                        this.currentLevel,
                        false,
                        Date.now()
                    );
                    
                    resolve(false);
                }
            }, timeoutMs);
        });
    }

    /**
     * Record patient response (called by UI)
     */
    recordResponse(responseData) {
        if (!this.isTestActive) return;
        
        console.log('📝 Response recorded:', responseData);
        
        // The actual response handling is done in waitForResponse()
        // This method is kept for compatibility with UI events
    }

    // ==================== TEST CONTROL METHODS ====================

    /**
     * Complete the test and generate report
     */
    async completeTest() {
        console.log('📊 Generating final report...');
        
        // Calculate test duration
        const testDuration = Date.now() - (this.session?.startTime || Date.now());
        
        // Generate comprehensive report with false response analysis
        const report = {
            protocol: 'Hughson-Westlake',
            testResults: Object.fromEntries(this.testResults),
            malingeringAnalysis: this.malingeringDetector.getFinalReport(),
            falseResponseAnalysis: this.falseResponseDetector.getDetectionReport(),
            testDuration: testDuration,
            reliability: this.responseAnalyzer.getReliabilityScore(),
            summary: this.generateTestSummary()
        };
        
        console.log('📋 Test Results Summary:');
        this.logTestSummary();
        
        // Dispatch completion event
        document.dispatchEvent(new CustomEvent('test-completed', {
            detail: report
        }));
        
        return report;
    }

    /**
     * Generate test summary
     */
    generateTestSummary() {
        const summary = {
            ears: {},
            overall: {
                totalFrequencies: this.frequencies.length * this.testEars.length,
                completedFrequencies: this.testResults.size,
                averageConfidence: 0
            }
        };
        
        // Calculate per-ear summaries
        this.testEars.forEach(ear => {
            const earResults = [];
            this.frequencies.forEach(freq => {
                const result = this.testResults.get(`${ear}_${freq}`);
                if (result) {
                    earResults.push(result);
                }
            });
            
            if (earResults.length > 0) {
                const avgThreshold = earResults.reduce((sum, r) => sum + r.threshold, 0) / earResults.length;
                const avgConfidence = earResults.reduce((sum, r) => sum + r.confidence, 0) / earResults.length;
                
                summary.ears[ear] = {
                    averageThreshold: Math.round(avgThreshold),
                    averageConfidence: Math.round(avgConfidence * 100),
                    frequenciesTested: earResults.length
                };
            }
        });
        
        // Calculate overall confidence
        const allResults = Array.from(this.testResults.values());
        if (allResults.length > 0) {
            summary.overall.averageConfidence = Math.round(
                allResults.reduce((sum, r) => sum + r.confidence, 0) / allResults.length * 100
            );
        }
        
        return summary;
    }

    /**
     * Log test summary to console
     */
    logTestSummary() {
        this.testResults.forEach((result, key) => {
            console.log(`${key}: ${result.threshold} dB HL (confidence: ${Math.round(result.confidence * 100)}%)`);
        });
    }

    /**
     * Stop test (user initiated)
     */
    stopTest() {
        this.isTestActive = false;
        this.setState('IDLE');
        
        if (this.responseTimer) {
            clearTimeout(this.responseTimer);
            this.responseTimer = null;
        }
        
        console.log('🛑 Test stopped by user');
        
        // Dispatch stop event
        document.dispatchEvent(new CustomEvent('test-stopped', {
            detail: { 
                reason: 'user_initiated',
                partialResults: Object.fromEntries(this.testResults)
            }
        }));
    }

    /**
     * Get current test status
     */
    getTestStatus() {
        return {
            isActive: this.isTestActive,
            state: this.currentState,
            currentEar: this.getCurrentEar(),
            currentFrequency: this.getCurrentFrequency(),
            currentLevel: this.currentLevel,
            progress: {
                earIndex: this.currentEarIndex,
                frequencyIndex: this.currentFrequencyIndex,
                totalEars: this.testEars.length,
                totalFrequencies: this.frequencies.length
            },
            completedTests: this.testResults.size
        };
    }

    /**
     * Get clinical rationale for efficiency constraints
     * @param {string} constraint - Constraint type
     * @returns {string} Clinical rationale
     */
    getEfficiencyRationale(constraint) {
        const rationales = {
            'TIME_LIMIT': 'Extended testing increases patient fatigue and reduces response reliability. Clinical appointments require predictable durations for effective workflow management.',
            'PRESENTATION_LIMIT': 'Excessive tone presentations cause mental fatigue and attention lapses. Experienced audiologists limit presentations to maintain patient engagement and response quality.',
            'REVERSAL_LIMIT': 'Too many intensity reversals indicate inconsistent responses, often due to patient confusion or fatigue. Clinical practice limits reversals to ensure reliable threshold measurements.'
        };
        
        return rationales[constraint] || 'Clinical efficiency constraint applied to balance accuracy with patient comfort and practical workflow requirements.';
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}