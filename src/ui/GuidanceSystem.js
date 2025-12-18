/**
 * Retro Audiometer Guidance System
 * Provides 1970s-style user guidance and clinical explanations
 */

export class GuidanceSystem {
    constructor() {
        this.currentPhase = 'STARTUP';
        this.messageQueue = [];
        this.isDisplaying = false;
        this.typewriterSpeed = 50; // ms per character
        
        // Message templates for different phases
        this.messageTemplates = {
            STARTUP: this.getStartupMessages(),
            PRE_TEST: this.getPreTestMessages(),
            FAMILIARIZATION: this.getFamiliarizationMessages(),
            TESTING: this.getTestingMessages(),
            THRESHOLD_FOUND: this.getThresholdMessages(),
            FREQUENCY_CHANGE: this.getFrequencyChangeMessages(),
            EAR_SWITCH: this.getEarSwitchMessages(),
            POST_TEST: this.getPostTestMessages()
        };
        
        this.clinicalExplanations = {
            INTENSITY_INCREASE: 'TONE TOO QUIET - INCREASING VOLUME',
            INTENSITY_DECREASE: 'RESPONSE DETECTED - SEEKING THRESHOLD',
            THRESHOLD_CONFIRMED: 'THRESHOLD ESTABLISHED - HIGH CONFIDENCE',
            CATCH_TRIAL: 'RESPONSE VALIDATION - QUALITY CHECK',
            FREQUENCY_PROGRESSION: 'MOVING TO NEXT TEST FREQUENCY',
            EAR_COMPLETION: 'EAR ASSESSMENT COMPLETE'
        };
    }

    getStartupMessages() {
        return [
            'AUDIOMETER MODEL 1975-AI INITIALIZING...',
            'SYSTEM DIAGNOSTICS: PASSED',
            'AUDIO CHANNELS: LEFT/RIGHT ISOLATED',
            'AI CLINICIAN: ONLINE',
            'HUGHSON-WESTLAKE PROTOCOL: LOADED',
            '',
            'PATIENT PREPARATION REQUIRED:',
            '1. POSITION HEADPHONES CORRECTLY',
            '2. ENSURE QUIET ENVIRONMENT',
            '3. READ INSTRUCTIONS BELOW',
            '',
            'PRESS [START AUTO TEST] WHEN READY'
        ];
    }

    getPreTestMessages() {
        return [
            'INITIATING AUTONOMOUS AUDIOMETRY...',
            'PATIENT RESPONSE PROTOCOL:',
            '- PRESS BUTTON FOR ANY TONE HEARD',
            '- RESPOND TO EVEN VERY QUIET TONES',
            '- DO NOT GUESS - ONLY RESPOND IF CERTAIN',
            '- AI WILL CONTROL ALL PARAMETERS',
            '',
            'FAMILIARIZATION TONE INCOMING...',
            'LISTEN CAREFULLY AND RESPOND'
        ];
    }

    getFamiliarizationMessages() {
        return [
            'PRESENTING FAMILIARIZATION TONE',
            'FREQUENCY: 1000 HZ',
            'LEVEL: 60 DB HL (CLEARLY AUDIBLE)',
            'PURPOSE: PATIENT INSTRUCTION',
            '',
            'THIS IS WHAT A TONE SOUNDS LIKE',
            'PRESS RESPONSE BUTTON NOW'
        ];
    }

    getTestingMessages() {
        return [
            'BEGINNING THRESHOLD MEASUREMENT',
            'AI CLINICIAN NOW IN CONTROL',
            'LISTEN FOR TONES AT ALL LEVELS',
            'RESPOND IMMEDIATELY WHEN HEARD'
        ];
    }

    getThresholdMessages() {
        return [
            'THRESHOLD MEASUREMENT COMPLETE',
            'CONFIDENCE LEVEL: EXCELLENT',
            'PROCEEDING TO NEXT FREQUENCY'
        ];
    }

    getFrequencyChangeMessages() {
        return [
            'FREQUENCY CHANGE IN PROGRESS',
            'ADJUSTING TEST PARAMETERS',
            'CONTINUE LISTENING AND RESPONDING'
        ];
    }

    getEarSwitchMessages() {
        return [
            'EAR ASSESSMENT COMPLETE',
            'SWITCHING TO OPPOSITE EAR',
            'BILATERAL TESTING REQUIRED',
            'CONTINUE NORMAL RESPONSES'
        ];
    }

    getPostTestMessages() {
        return [
            'AUDIOMETRIC ASSESSMENT COMPLETE',
            'GENERATING CLINICAL REPORT...',
            'THRESHOLD DATA VALIDATED',
            'CONFIDENCE METRICS CALCULATED',
            '',
            'TEST RESULTS AVAILABLE BELOW'
        ];
    }

    // Display messages with typewriter effect
    async displayMessage(message, targetElement, speed = this.typewriterSpeed) {
        if (!targetElement) return;
        
        targetElement.textContent = '';
        
        for (let i = 0; i < message.length; i++) {
            targetElement.textContent += message[i];
            await this.delay(speed);
        }
    }

    // Display multiple messages in sequence
    async displayMessageSequence(messages, targetElement, lineDelay = 800) {
        for (const message of messages) {
            await this.displayMessage(message, targetElement);
            await this.delay(lineDelay);
        }
    }

    // Show phase-specific guidance
    async showGuidance(phase, targetElement) {
        this.currentPhase = phase;
        const messages = this.messageTemplates[phase] || [];
        
        if (messages.length > 0) {
            await this.displayMessageSequence(messages, targetElement);
        }
    }

    // Format clinical decision for CRT display
    formatClinicalDecision(decision) {
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        let explanation = this.clinicalExplanations[decision.type] || decision.reason || 'AI DECISION MADE';
        
        // Add specific details based on decision type
        if (decision.type === 'INTENSITY_INCREASE' || decision.type === 'INTENSITY_DECREASE') {
            explanation += ` (${decision.from} -> ${decision.to} DB HL)`;
        } else if (decision.type === 'THRESHOLD_CONFIRMED') {
            explanation += ` AT ${decision.threshold} DB HL`;
        } else if (decision.type === 'FREQUENCY_CHANGE') {
            explanation += ` (${decision.from} -> ${decision.to} HZ)`;
        }
        
        return `[${timestamp}] ${explanation}`;
    }

    // Generate progress indicator
    getProgressIndicator(currentTest, totalTests) {
        const percentage = Math.round((currentTest / totalTests) * 100);
        const barLength = 20;
        const filledLength = Math.round((percentage / 100) * barLength);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        return `PROGRESS: [${bar}] ${percentage}%`;
    }

    // Generate clinical status summary
    generateStatusSummary(testData) {
        const summary = [];
        
        summary.push('CURRENT TEST STATUS:');
        summary.push(`EAR: ${testData.ear?.toUpperCase() || 'UNKNOWN'}`);
        summary.push(`FREQUENCY: ${testData.frequency || 'N/A'} HZ`);
        summary.push(`INTENSITY: ${testData.level || 'N/A'} DB HL`);
        summary.push(`STATE: ${testData.state || 'UNKNOWN'}`);
        
        if (testData.confidence) {
            const confidenceLevel = this.getConfidenceLevel(testData.confidence);
            summary.push(`CONFIDENCE: ${confidenceLevel}`);
        }
        
        return summary;
    }

    getConfidenceLevel(confidence) {
        if (confidence >= 0.9) return 'EXCELLENT';
        if (confidence >= 0.8) return 'GOOD';
        if (confidence >= 0.7) return 'ACCEPTABLE';
        if (confidence >= 0.6) return 'QUESTIONABLE';
        return 'POOR';
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Clinical Report Generator
export class ClinicalReportGenerator {
    constructor() {
        this.reportTemplate = {
            header: this.getReportHeader(),
            sections: {
                summary: 'TEST SUMMARY',
                thresholds: 'HEARING THRESHOLDS',
                analysis: 'CLINICAL ANALYSIS',
                recommendations: 'RECOMMENDATIONS'
            }
        };
    }

    getReportHeader() {
        const date = new Date().toLocaleDateString('en-US');
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        
        return [
            '═══════════════════════════════════════════════',
            '          AUDIOMETRIC ASSESSMENT REPORT',
            '               MODEL 1975-AI SYSTEM',
            '═══════════════════════════════════════════════',
            `DATE: ${date}                    TIME: ${time}`,
            `PROTOCOL: HUGHSON-WESTLAKE AUTONOMOUS`,
            `CLINICIAN: AI SYSTEM v1.0`,
            '═══════════════════════════════════════════════'
        ];
    }

    generateReport(testResults, qualityMetrics) {
        const report = [];
        
        // Header
        report.push(...this.reportTemplate.header);
        report.push('');
        
        // Test Summary
        report.push(this.reportTemplate.sections.summary);
        report.push('─'.repeat(47));
        report.push(...this.generateSummarySection(testResults, qualityMetrics));
        report.push('');
        
        // Hearing Thresholds
        report.push(this.reportTemplate.sections.thresholds);
        report.push('─'.repeat(47));
        report.push(...this.generateThresholdSection(testResults));
        report.push('');
        
        // Clinical Analysis
        report.push(this.reportTemplate.sections.analysis);
        report.push('─'.repeat(47));
        report.push(...this.generateAnalysisSection(testResults, qualityMetrics));
        report.push('');
        
        // Recommendations
        report.push(this.reportTemplate.sections.recommendations);
        report.push('─'.repeat(47));
        report.push(...this.generateRecommendationsSection(testResults, qualityMetrics));
        
        return report;
    }

    generateSummarySection(testResults, qualityMetrics) {
        const summary = [];
        const totalTests = Object.keys(testResults).length;
        const expectedTests = 12; // 6 frequencies × 2 ears
        
        summary.push(`TESTS COMPLETED: ${totalTests}/${expectedTests}`);
        summary.push(`OVERALL CONFIDENCE: ${Math.round(qualityMetrics.overallConfidence * 100)}%`);
        summary.push(`TEST RELIABILITY: ${this.getReliabilityLevel(qualityMetrics.reliability)}`);
        summary.push(`RESPONSE CONSISTENCY: ${Math.round(qualityMetrics.consistency * 100)}%`);
        
        if (qualityMetrics.malingeringRisk > 0.3) {
            summary.push(`VALIDITY CONCERN: ELEVATED RISK DETECTED`);
        } else {
            summary.push(`VALIDITY: NORMAL RESPONSE PATTERNS`);
        }
        
        return summary;
    }

    generateThresholdSection(testResults) {
        const thresholds = [];
        
        thresholds.push('FREQUENCY    LEFT EAR    RIGHT EAR    DIFFERENCE');
        thresholds.push('─'.repeat(47));
        
        const frequencies = [250, 500, 1000, 2000, 4000, 8000];
        
        frequencies.forEach(freq => {
            const leftKey = `left_${freq}`;
            const rightKey = `right_${freq}`;
            
            const leftThreshold = testResults[leftKey]?.threshold || 'NR';
            const rightThreshold = testResults[rightKey]?.threshold || 'NR';
            
            let difference = 'N/A';
            if (leftThreshold !== 'NR' && rightThreshold !== 'NR') {
                difference = Math.abs(leftThreshold - rightThreshold) + ' dB';
            }
            
            const line = `${freq.toString().padEnd(9)} ${leftThreshold.toString().padEnd(11)} ${rightThreshold.toString().padEnd(12)} ${difference}`;
            thresholds.push(line);
        });
        
        return thresholds;
    }

    generateAnalysisSection(testResults, qualityMetrics) {
        const analysis = [];
        
        // Calculate Pure Tone Averages
        const leftPTA = this.calculatePTA(testResults, 'left');
        const rightPTA = this.calculatePTA(testResults, 'right');
        
        analysis.push(`LEFT EAR PTA (500, 1K, 2K Hz): ${leftPTA} dB HL`);
        analysis.push(`RIGHT EAR PTA (500, 1K, 2K Hz): ${rightPTA} dB HL`);
        analysis.push('');
        
        // Hearing loss classification
        analysis.push('HEARING LOSS CLASSIFICATION:');
        analysis.push(`LEFT EAR: ${this.classifyHearingLoss(leftPTA)}`);
        analysis.push(`RIGHT EAR: ${this.classifyHearingLoss(rightPTA)}`);
        analysis.push('');
        
        // Quality indicators
        analysis.push('QUALITY INDICATORS:');
        analysis.push(`RESPONSE TIME: ${this.analyzeResponseTimes(qualityMetrics)}`);
        analysis.push(`TEST COOPERATION: ${this.analyzeCooperation(qualityMetrics)}`);
        
        return analysis;
    }

    generateRecommendationsSection(testResults, qualityMetrics) {
        const recommendations = [];
        
        // Calculate PTAs for recommendations
        const leftPTA = this.calculatePTA(testResults, 'left');
        const rightPTA = this.calculatePTA(testResults, 'right');
        const maxPTA = Math.max(leftPTA, rightPTA);
        
        if (maxPTA <= 25) {
            recommendations.push('• HEARING WITHIN NORMAL LIMITS');
            recommendations.push('• ROUTINE MONITORING RECOMMENDED');
        } else if (maxPTA <= 40) {
            recommendations.push('• MILD HEARING LOSS DETECTED');
            recommendations.push('• CONSIDER HEARING AID EVALUATION');
            recommendations.push('• ANNUAL HEARING MONITORING');
        } else if (maxPTA <= 70) {
            recommendations.push('• MODERATE HEARING LOSS DETECTED');
            recommendations.push('• HEARING AID FITTING RECOMMENDED');
            recommendations.push('• COMMUNICATION STRATEGIES ADVISED');
        } else {
            recommendations.push('• SEVERE HEARING LOSS DETECTED');
            recommendations.push('• URGENT AUDIOLOGICAL REFERRAL');
            recommendations.push('• COMPREHENSIVE HEARING AID EVALUATION');
        }
        
        // Quality-based recommendations
        if (qualityMetrics.reliability < 0.7) {
            recommendations.push('• RETEST RECOMMENDED DUE TO LOW RELIABILITY');
        }
        
        if (qualityMetrics.malingeringRisk > 0.4) {
            recommendations.push('• VALIDITY CONCERNS - CONSIDER OBJECTIVE TESTING');
        }
        
        recommendations.push('');
        recommendations.push('NOTE: RESULTS REQUIRE CLINICAL INTERPRETATION');
        
        return recommendations;
    }

    calculatePTA(testResults, ear) {
        const frequencies = [500, 1000, 2000];
        let total = 0;
        let count = 0;
        
        frequencies.forEach(freq => {
            const key = `${ear}_${freq}`;
            if (testResults[key] && testResults[key].threshold !== undefined) {
                total += testResults[key].threshold;
                count++;
            }
        });
        
        return count > 0 ? Math.round(total / count) : 0;
    }

    classifyHearingLoss(pta) {
        if (pta <= 25) return 'NORMAL';
        if (pta <= 40) return 'MILD LOSS';
        if (pta <= 55) return 'MODERATE LOSS';
        if (pta <= 70) return 'MODERATELY SEVERE LOSS';
        if (pta <= 90) return 'SEVERE LOSS';
        return 'PROFOUND LOSS';
    }

    getReliabilityLevel(reliability) {
        if (reliability >= 0.9) return 'EXCELLENT';
        if (reliability >= 0.8) return 'GOOD';
        if (reliability >= 0.7) return 'ACCEPTABLE';
        return 'QUESTIONABLE';
    }

    analyzeResponseTimes(qualityMetrics) {
        if (qualityMetrics.averageResponseTime < 300) return 'FAST (POSSIBLE GUESSING)';
        if (qualityMetrics.averageResponseTime < 800) return 'NORMAL';
        if (qualityMetrics.averageResponseTime < 1500) return 'SLOW BUT ACCEPTABLE';
        return 'VERY SLOW (ATTENTION CONCERNS)';
    }

    analyzeCooperation(qualityMetrics) {
        if (qualityMetrics.consistency > 0.8) return 'EXCELLENT';
        if (qualityMetrics.consistency > 0.6) return 'GOOD';
        return 'VARIABLE';
    }
}