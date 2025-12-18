/**
 * Clinical Explainer Module
 * Generates human-readable explanations for AI clinician decisions
 * Converts internal state and algorithms into clinician-style explanations
 */
export class ClinicalExplainer {
    constructor() {
        // Clinical terminology and templates
        this.templates = {
            thresholdConfirmed: "Threshold confirmed at {threshold} dB HL after {reversals} reversals with {confidence}% confidence.",
            thresholdEstablished: "Threshold established at {threshold} dB HL using {method} with {responses} responses ({confidence}% reliability).",
            intensityIncrease: "Increased to {level} dB HL (no response detected at {previousLevel} dB HL - Hughson-Westlake +10 dB rule).",
            intensityDecrease: "Decreased to {level} dB HL (response confirmed at {previousLevel} dB HL - Hughson-Westlake -5 dB rule).",
            frequencyChange: "Advanced to {frequency} Hz testing after completing {previousFrequency} Hz (threshold: {threshold} dB HL).",
            earSwitch: "Switched to {ear} ear testing after completing {previousEar} ear assessment ({frequencies} frequencies tested).",
            catchTrialExecuted: "Executed {catchType} catch trial - {result} (false response detection protocol).",
            testComplete: "Audiometric assessment completed: {totalMeasurements} thresholds established across {ears} ears with {overallConfidence}% overall reliability.",
            fatigueDetected: "Patient fatigue detected ({fatigueLevel}% level) - response times increased by {slowdown}% from baseline.",
            attentionConcern: "Attention concerns noted ({attentionLevel}% level) - {anticipatoryRate}% anticipatory responses detected.",
            malingeringAlert: "Malingering indicators present: {indicators} (confidence reduced to {adjustedConfidence}%)."
        };

        // Clinical decision rationales
        this.rationales = {
            hughsonWestlake: "Following Hughson-Westlake modified procedure (ASHA guidelines)",
            twoOutOfThree: "Applying 2-out-of-3 response confirmation rule (clinical standard)",
            safetyLimit: "Applying maximum safe presentation level (120 dB HL limit)",
            falseResponsePrevention: "Implementing catch trials for response validity assessment",
            fatigueManagement: "Monitoring patient fatigue for test reliability",
            bilateralAssessment: "Conducting bilateral assessment per diagnostic protocol"
        };

        // Confidence level descriptors
        this.confidenceDescriptors = {
            excellent: { min: 90, descriptor: "excellent", clinical: "highly reliable" },
            good: { min: 80, descriptor: "good", clinical: "clinically reliable" },
            acceptable: { min: 70, descriptor: "acceptable", clinical: "adequate reliability" },
            questionable: { min: 60, descriptor: "questionable", clinical: "limited reliability" },
            poor: { min: 0, descriptor: "poor", clinical: "unreliable" }
        };

        // Response pattern descriptors
        this.responsePatterns = {
            consistent: "Consistent response pattern observed",
            variable: "Variable response pattern noted",
            anticipatory: "Anticipatory responses detected",
            delayed: "Delayed responses observed",
            optimal: "Optimal response timing maintained"
        };
    }

    /**
     * Generate explanation for threshold confirmation decision
     * @param {Object} thresholdData - Threshold measurement data
     * @param {Object} testContext - Current test context
     * @returns {Object} Comprehensive explanation
     */
    explainThresholdDecision(thresholdData, testContext) {
        const {
            threshold,
            confidence,
            responses,
            reversals,
            ear,
            frequency,
            method = "Hughson-Westlake",
            responsePattern,
            reactionTimeAnalysis
        } = thresholdData;

        const confidencePercent = Math.round(confidence * 100);
        const confidenceLevel = this.getConfidenceDescriptor(confidencePercent);

        // Primary explanation
        const primaryExplanation = this.formatTemplate('thresholdConfirmed', {
            threshold,
            reversals: reversals || 'multiple',
            confidence: confidencePercent
        });

        // Detailed clinical rationale
        const clinicalRationale = this.generateClinicalRationale(thresholdData, testContext);

        // Response analysis
        const responseAnalysis = this.analyzeResponsePattern(responsePattern, reactionTimeAnalysis);

        // Quality assessment
        const qualityAssessment = this.assessMeasurementQuality(thresholdData);

        return {
            primary: primaryExplanation,
            detailed: {
                method: `${method} procedure applied per clinical standards`,
                rationale: clinicalRationale,
                responseAnalysis: responseAnalysis,
                qualityAssessment: qualityAssessment,
                confidence: {
                    level: confidenceLevel.descriptor,
                    clinical: confidenceLevel.clinical,
                    numeric: confidencePercent
                }
            },
            clinical: {
                summary: this.generateClinicalSummary(thresholdData, testContext),
                recommendations: this.generateRecommendations(thresholdData),
                flags: this.identifyQualityFlags(thresholdData)
            }
        };
    }

    /**
     * Generate explanation for intensity adjustment decisions
     * @param {Object} adjustmentData - Intensity adjustment data
     * @returns {Object} Explanation for intensity change
     */
    explainIntensityAdjustment(adjustmentData) {
        const {
            direction,
            fromLevel,
            toLevel,
            reason,
            response,
            rule,
            safetyApplied
        } = adjustmentData;

        let template = direction === 'increase' ? 'intensityIncrease' : 'intensityDecrease';
        
        const explanation = this.formatTemplate(template, {
            level: toLevel,
            previousLevel: fromLevel
        });

        const rationale = {
            rule: rule || (direction === 'increase' ? 
                "Hughson-Westlake: +10 dB when no response" : 
                "Hughson-Westlake: -5 dB when response detected"),
            response: response ? "Patient responded" : "No response detected",
            clinical: direction === 'increase' ? 
                "Seeking audible level for threshold bracketing" :
                "Seeking minimum audible level for threshold determination"
        };

        if (safetyApplied) {
            rationale.safety = "Maximum safe presentation level applied (120 dB HL)";
        }

        return {
            primary: explanation,
            rationale: rationale,
            nextStep: direction === 'increase' ? 
                "Continue increasing until response obtained" :
                "Continue decreasing to establish threshold"
        };
    }

    /**
     * Generate explanation for frequency progression decisions
     * @param {Object} progressionData - Frequency change data
     * @returns {Object} Explanation for frequency change
     */
    explainFrequencyProgression(progressionData) {
        const {
            fromFrequency,
            toFrequency,
            completedThreshold,
            testSequence,
            ear,
            rationale
        } = progressionData;

        const explanation = this.formatTemplate('frequencyChange', {
            frequency: toFrequency,
            previousFrequency: fromFrequency,
            threshold: completedThreshold
        });

        const clinicalRationale = {
            sequence: `Following standard audiometric sequence: ${testSequence.join(' → ')} Hz`,
            completion: `${fromFrequency} Hz threshold established at ${completedThreshold} dB HL`,
            protocol: "ASHA recommended frequency progression for diagnostic audiometry",
            purpose: "Comprehensive frequency-specific hearing assessment"
        };

        return {
            primary: explanation,
            rationale: clinicalRationale,
            progress: this.calculateTestProgress(progressionData)
        };
    }

    /**
     * Generate explanation for ear switching decisions
     * @param {Object} earSwitchData - Ear switching data
     * @returns {Object} Explanation for ear change
     */
    explainEarSwitch(earSwitchData) {
        const {
            fromEar,
            toEar,
            completedFrequencies,
            thresholds,
            bilateralComparison
        } = earSwitchData;

        const explanation = this.formatTemplate('earSwitch', {
            ear: toEar,
            previousEar: fromEar,
            frequencies: completedFrequencies.length
        });

        const clinicalRationale = {
            protocol: "Bilateral assessment required for comprehensive audiometric evaluation",
            completion: `${fromEar} ear assessment completed across ${completedFrequencies.length} frequencies`,
            comparison: bilateralComparison ? 
                "Bilateral comparison will be performed upon completion" :
                "Independent ear assessment per clinical standards"
        };

        // Summarize completed ear results with defensive safeguards
        const earSummary = this.summarizeEarResults(thresholds, fromEar);

        return {
            primary: explanation,
            rationale: clinicalRationale,
            completedEarSummary: earSummary,
            nextSteps: `Begin ${toEar} ear assessment starting at ${completedFrequencies[0]} Hz`
        };
    }

    /**
     * Generate explanation for catch trial execution
     * @param {Object} catchTrialData - Catch trial data
     * @returns {Object} Explanation for catch trial
     */
    explainCatchTrial(catchTrialData) {
        const {
            type,
            response,
            expected,
            purpose,
            result,
            confidenceImpact
        } = catchTrialData;

        const passed = response === expected;
        const resultText = passed ? "PASSED" : "FAILED";

        const explanation = this.formatTemplate('catchTrialExecuted', {
            catchType: type,
            result: resultText
        });

        const clinicalRationale = {
            purpose: this.getCatchTrialPurpose(type),
            expected: `Expected response: ${expected ? 'Response' : 'No response'}`,
            actual: `Actual response: ${response ? 'Response detected' : 'No response'}`,
            interpretation: this.interpretCatchTrialResult(type, passed),
            confidenceImpact: confidenceImpact ? 
                `Confidence adjusted by ${confidenceImpact > 0 ? '+' : ''}${Math.round(confidenceImpact * 100)}%` :
                "No confidence adjustment applied"
        };

        return {
            primary: explanation,
            rationale: clinicalRationale,
            clinical: {
                validity: passed ? "Response validity confirmed" : "Response validity questioned",
                recommendation: this.getCatchTrialRecommendation(type, passed)
            }
        };
    }

    /**
     * Generate explanation for test completion
     * @param {Object} completionData - Test completion data
     * @returns {Object} Comprehensive test explanation
     */
    explainTestCompletion(completionData) {
        const {
            totalMeasurements,
            ears,
            overallConfidence,
            testDuration,
            qualityMetrics,
            clinicalFindings
        } = completionData;

        const explanation = this.formatTemplate('testComplete', {
            totalMeasurements,
            ears: ears.join(' and '),
            overallConfidence: Math.round(overallConfidence * 100)
        });

        const comprehensiveSummary = {
            testQuality: this.assessOverallTestQuality(qualityMetrics),
            clinicalFindings: this.summarizeClinicalFindings(clinicalFindings),
            reliability: this.assessTestReliability(overallConfidence, qualityMetrics),
            recommendations: this.generateFinalRecommendations(completionData)
        };

        return {
            primary: explanation,
            summary: comprehensiveSummary,
            duration: `Test completed in ${Math.round(testDuration / 60000)} minutes`,
            validity: this.assessTestValidity(completionData)
        };
    }

    /**
     * Generate explanation for fatigue detection
     * @param {Object} fatigueData - Fatigue analysis data
     * @returns {Object} Fatigue explanation
     */
    explainFatigueDetection(fatigueData) {
        const {
            fatigueLevel,
            baselineSlowdown,
            indicators,
            recommendation
        } = fatigueData;

        const explanation = this.formatTemplate('fatigueDetected', {
            fatigueLevel: Math.round(fatigueLevel * 100),
            slowdown: Math.round(baselineSlowdown * 100)
        });

        const clinicalAssessment = {
            severity: this.categorizeFatigueSeverity(fatigueLevel),
            indicators: indicators.map(indicator => this.explainFatigueIndicator(indicator)),
            impact: "Test reliability may be compromised by patient fatigue",
            recommendation: recommendation || this.getFatigueRecommendation(fatigueLevel)
        };

        return {
            primary: explanation,
            assessment: clinicalAssessment,
            monitoring: "Continue monitoring response patterns for further fatigue indicators"
        };
    }

    /**
     * Generate explanation for attention concerns
     * @param {Object} attentionData - Attention analysis data
     * @returns {Object} Attention explanation
     */
    explainAttentionConcerns(attentionData) {
        const {
            attentionLevel,
            anticipatoryRate,
            variability,
            inconsistencies
        } = attentionData;

        const explanation = this.formatTemplate('attentionConcern', {
            attentionLevel: Math.round(attentionLevel * 100),
            anticipatoryRate: Math.round(anticipatoryRate * 100)
        });

        const clinicalAssessment = {
            severity: this.categorizeAttentionLevel(attentionLevel),
            indicators: this.identifyAttentionIndicators(attentionData),
            impact: "Response consistency and test validity may be affected",
            recommendations: this.getAttentionRecommendations(attentionData)
        };

        return {
            primary: explanation,
            assessment: clinicalAssessment,
            intervention: "Consider re-instruction or environmental assessment"
        };
    }

    // ==================== HELPER METHODS ====================

    /**
     * Format explanation template with data
     * @param {string} templateKey - Template identifier
     * @param {Object} data - Data to insert into template
     * @returns {string} Formatted explanation
     */
    formatTemplate(templateKey, data) {
        let template = this.templates[templateKey] || templateKey;
        
        Object.keys(data).forEach(key => {
            const placeholder = `{${key}}`;
            template = template.replace(new RegExp(placeholder, 'g'), data[key]);
        });
        
        return template;
    }

    /**
     * Get confidence descriptor based on percentage
     * @param {number} confidencePercent - Confidence percentage
     * @returns {Object} Confidence descriptor
     */
    getConfidenceDescriptor(confidencePercent) {
        for (const [level, descriptor] of Object.entries(this.confidenceDescriptors)) {
            if (confidencePercent >= descriptor.min) {
                return descriptor;
            }
        }
        return this.confidenceDescriptors.poor;
    }

    /**
     * Generate clinical rationale for threshold decision
     * @param {Object} thresholdData - Threshold data
     * @param {Object} testContext - Test context
     * @returns {string} Clinical rationale
     */
    generateClinicalRationale(thresholdData, testContext) {
        const { method, responses, reversals } = thresholdData;
        
        let rationale = `${method} procedure: `;
        
        if (reversals >= 2) {
            rationale += `${reversals} reversals achieved, `;
        }
        
        rationale += `${responses} total responses analyzed. `;
        rationale += "Threshold represents lowest level with consistent positive responses.";
        
        return rationale;
    }

    /**
     * Analyze response pattern for explanation
     * @param {Array} responsePattern - Response pattern data
     * @param {Object} reactionTimeAnalysis - Reaction time analysis
     * @returns {string} Response analysis explanation
     */
    analyzeResponsePattern(responsePattern, reactionTimeAnalysis) {
        if (!responsePattern || responsePattern.length === 0) {
            return "Insufficient response data for pattern analysis";
        }

        const positiveResponses = responsePattern.filter(r => r.response).length;
        const responseRate = positiveResponses / responsePattern.length;
        
        let analysis = `Response rate: ${Math.round(responseRate * 100)}% (${positiveResponses}/${responsePattern.length}). `;
        
        if (reactionTimeAnalysis) {
            const avgReactionTime = reactionTimeAnalysis.average;
            if (avgReactionTime) {
                analysis += `Average reaction time: ${avgReactionTime}ms `;
                
                if (avgReactionTime < 200) {
                    analysis += "(fast - monitor for anticipatory responses). ";
                } else if (avgReactionTime > 1500) {
                    analysis += "(slow - consider processing delays). ";
                } else {
                    analysis += "(normal range). ";
                }
            }
        }
        
        return analysis;
    }

    /**
     * Assess measurement quality
     * @param {Object} thresholdData - Threshold data
     * @returns {string} Quality assessment
     */
    assessMeasurementQuality(thresholdData) {
        const { confidence, responses, reversals } = thresholdData;
        const confidencePercent = Math.round(confidence * 100);
        
        let assessment = "";
        
        if (confidencePercent >= 90) {
            assessment = "Excellent measurement quality with high confidence.";
        } else if (confidencePercent >= 80) {
            assessment = "Good measurement quality suitable for clinical use.";
        } else if (confidencePercent >= 70) {
            assessment = "Acceptable measurement quality with adequate reliability.";
        } else {
            assessment = "Questionable measurement quality - consider retesting.";
        }
        
        if (reversals && reversals < 2) {
            assessment += " Limited reversals may affect precision.";
        }
        
        if (responses < 5) {
            assessment += " Limited response data collected.";
        }
        
        return assessment;
    }

    /**
     * Generate clinical summary
     * @param {Object} thresholdData - Threshold data
     * @param {Object} testContext - Test context
     * @returns {string} Clinical summary
     */
    generateClinicalSummary(thresholdData, testContext) {
        const { threshold, ear, frequency, confidence } = thresholdData;
        const confidencePercent = Math.round(confidence * 100);
        
        return `${ear} ear ${frequency} Hz threshold: ${threshold} dB HL (${confidencePercent}% confidence). ` +
               `Measurement obtained using standard clinical protocols with appropriate quality controls.`;
    }

    /**
     * Generate recommendations based on threshold data
     * @param {Object} thresholdData - Threshold data
     * @returns {Array} Array of recommendations
     */
    generateRecommendations(thresholdData) {
        const recommendations = [];
        const { confidence, threshold, reactionTimeAnalysis } = thresholdData;
        
        if (confidence < 0.7) {
            recommendations.push("Consider retesting this frequency for improved reliability");
        }
        
        if (threshold > 80) {
            recommendations.push("Significant hearing loss detected - consider medical referral");
        }
        
        if (reactionTimeAnalysis?.anticipatoryRate > 0.2) {
            recommendations.push("High anticipatory response rate - re-instruct patient");
        }
        
        return recommendations;
    }

    /**
     * Identify quality flags
     * @param {Object} thresholdData - Threshold data
     * @returns {Array} Array of quality flags
     */
    identifyQualityFlags(thresholdData) {
        const flags = [];
        const { confidence, responses, reversals, reactionTimeAnalysis } = thresholdData;
        
        if (confidence < 0.6) {
            flags.push({ type: 'low_confidence', message: 'Low confidence measurement' });
        }
        
        if (responses < 5) {
            flags.push({ type: 'limited_data', message: 'Limited response data' });
        }
        
        if (reversals && reversals < 2) {
            flags.push({ type: 'few_reversals', message: 'Insufficient reversals for precision' });
        }
        
        if (reactionTimeAnalysis?.anticipatoryRate > 0.3) {
            flags.push({ type: 'anticipatory_responses', message: 'High anticipatory response rate' });
        }
        
        return flags;
    }

    /**
     * Get catch trial purpose explanation
     * @param {string} type - Catch trial type
     * @returns {string} Purpose explanation
     */
    getCatchTrialPurpose(type) {
        const purposes = {
            'silence': 'Detect false positive responses during silence periods',
            'very_low': 'Identify responses to inaudible stimuli',
            'wrong_ear': 'Verify ear-specific response accuracy',
            'delayed_silence': 'Assess response timing and attention'
        };
        
        return purposes[type] || 'Validate response authenticity and attention';
    }

    /**
     * Interpret catch trial result
     * @param {string} type - Catch trial type
     * @param {boolean} passed - Whether catch trial was passed
     * @returns {string} Interpretation
     */
    interpretCatchTrialResult(type, passed) {
        if (passed) {
            return "Response validity confirmed - patient demonstrating appropriate response behavior";
        } else {
            const interpretations = {
                'silence': 'False positive response detected - patient may be guessing or overly eager',
                'very_low': 'Response to inaudible stimulus - possible exaggerated hearing loss',
                'wrong_ear': 'Cross-ear response detected - verify headphone placement',
                'delayed_silence': 'Inappropriate delayed response - attention or comprehension issues'
            };
            
            return interpretations[type] || 'Response validity questioned - monitor for additional indicators';
        }
    }

    /**
     * Get catch trial recommendation
     * @param {string} type - Catch trial type
     * @param {boolean} passed - Whether catch trial was passed
     * @returns {string} Recommendation
     */
    getCatchTrialRecommendation(type, passed) {
        if (passed) {
            return "Continue testing with standard protocol";
        } else {
            return "Consider re-instruction, additional catch trials, or validity assessment";
        }
    }

    /**
     * Convert internal AI state to human-readable clinical explanation
     * @param {Object} aiState - Current AI clinician state
     * @returns {Object} Comprehensive clinical explanation
     */
    explainCurrentState(aiState) {
        const {
            currentState,
            currentEar,
            currentFrequency,
            currentLevel,
            recentDecisions,
            testProgress,
            qualityMetrics
        } = aiState;

        const stateExplanations = {
            'IDLE': 'System ready for audiometric testing',
            'FAMILIARIZATION': 'Conducting patient familiarization with test procedure',
            'PRESENT_TONE': `Presenting ${currentFrequency} Hz tone at ${currentLevel} dB HL to ${currentEar} ear`,
            'WAIT_RESPONSE': 'Waiting for patient response within clinical time window (3 seconds)',
            'PROCESS_RESPONSE': 'Analyzing patient response and applying Hughson-Westlake decision rules',
            'CONFIRM_THRESHOLD': 'Confirming threshold using 2-out-of-3 response verification',
            'NEXT_FREQUENCY': 'Advancing to next frequency in standard audiometric sequence',
            'NEXT_EAR': 'Switching to opposite ear for bilateral assessment',
            'TEST_COMPLETE': 'Audiometric assessment completed - generating final report'
        };

        const currentExplanation = stateExplanations[currentState] || `Processing state: ${currentState}`;
        
        return {
            current: currentExplanation,
            context: this.explainTestContext(aiState),
            recentDecisions: this.explainRecentDecisions(recentDecisions),
            progress: this.explainTestProgress(testProgress),
            quality: this.explainQualityMetrics(qualityMetrics)
        };
    }

    /**
     * Explain test context
     * @param {Object} aiState - AI state
     * @returns {string} Context explanation
     */
    explainTestContext(aiState) {
        const { currentEar, currentFrequency, currentLevel, testProgress } = aiState;
        
        return `Currently testing ${currentEar} ear at ${currentFrequency} Hz. ` +
               `Test progress: ${testProgress?.completed || 0}/${testProgress?.total || 0} measurements completed. ` +
               `Following standard Hughson-Westlake protocol with autonomous decision-making.`;
    }

    /**
     * Explain recent decisions
     * @param {Array} recentDecisions - Recent AI decisions
     * @returns {Array} Decision explanations
     */
    explainRecentDecisions(recentDecisions) {
        if (!recentDecisions || recentDecisions.length === 0) {
            return ["No recent decisions to report"];
        }

        return recentDecisions.slice(-3).map(decision => {
            switch (decision.type) {
                case 'INTENSITY_INCREASE':
                    return `Increased intensity to ${decision.to} dB HL (no response at ${decision.from} dB HL)`;
                case 'INTENSITY_DECREASE':
                    return `Decreased intensity to ${decision.to} dB HL (response confirmed at ${decision.from} dB HL)`;
                case 'THRESHOLD_FINALIZED':
                    return `Threshold established at ${decision.threshold} dB HL (${decision.confidence}% confidence)`;
                case 'FREQUENCY_CHANGE':
                    return `Advanced from ${decision.from} Hz to ${decision.to} Hz`;
                case 'EAR_SWITCH':
                    return `Switched from ${decision.from} ear to ${decision.to} ear`;
                default:
                    return decision.reason || 'Clinical decision made';
            }
        });
    }

    /**
     * Explain test progress
     * @param {Object} testProgress - Test progress data
     * @returns {string} Progress explanation
     */
    explainTestProgress(testProgress) {
        if (!testProgress) {
            return "Test progress information not available";
        }

        const { completed, total, currentPhase, estimatedTimeRemaining } = testProgress;
        const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        let explanation = `Test ${percentComplete}% complete (${completed}/${total} measurements). `;
        
        if (currentPhase) {
            explanation += `Current phase: ${currentPhase}. `;
        }
        
        if (estimatedTimeRemaining) {
            explanation += `Estimated time remaining: ${Math.round(estimatedTimeRemaining / 60)} minutes.`;
        }
        
        return explanation;
    }

    /**
     * Explain quality metrics
     * @param {Object} qualityMetrics - Quality metrics data
     * @returns {string} Quality explanation
     */
    explainQualityMetrics(qualityMetrics) {
        if (!qualityMetrics) {
            return "Quality metrics not yet available";
        }

        const { overallConfidence, fatigueLevel, attentionLevel, responseConsistency } = qualityMetrics;
        
        let explanation = `Test quality: ${Math.round(overallConfidence * 100)}% overall confidence. `;
        
        if (fatigueLevel > 0.3) {
            explanation += `Fatigue level: ${Math.round(fatigueLevel * 100)}% (monitoring required). `;
        }
        
        if (attentionLevel < 0.7) {
            explanation += `Attention level: ${Math.round(attentionLevel * 100)}% (below optimal). `;
        }
        
        if (responseConsistency) {
            explanation += `Response consistency: ${Math.round(responseConsistency * 100)}%.`;
        }
        
        return explanation;
    }

    /**
     * Calculate test progress information
     * @param {Object} progressionData - Test progression data
     * @returns {string} Progress description
     */
    calculateTestProgress(progressionData) {
        if (!progressionData) {
            return "Test in progress";
        }

        const { testSequence, completedFrequencies, totalFrequencies, currentEar } = progressionData;
        
        if (completedFrequencies !== undefined && totalFrequencies !== undefined) {
            const percentage = Math.round((completedFrequencies / totalFrequencies) * 100);
            return `${completedFrequencies}/${totalFrequencies} frequencies completed (${percentage}%) for ${currentEar} ear`;
        }
        
        if (testSequence && Array.isArray(testSequence)) {
            return `Testing sequence: ${testSequence.join(', ')} Hz`;
        }
        
        return "Test progression ongoing";
    }

    /**
     * Explain efficiency constraint triggered decision
     * @param {Object} constraintData - Efficiency constraint information
     * @returns {Object} Comprehensive explanation
     */
    explainEfficiencyConstraint(constraintData) {
        const {
            constraint,
            value,
            limit,
            reason,
            forcedThreshold,
            confidence,
            clinicalRationale
        } = constraintData;

        // Generate constraint-specific explanations
        const constraintExplanations = {
            'TIME_LIMIT': {
                primary: `Time limit reached (${Math.round(value/1000)}s of ${limit/1000}s maximum)`,
                clinical: 'Extended testing reduces patient reliability and increases fatigue',
                action: 'Proceeding with best available threshold estimate'
            },
            'PRESENTATION_LIMIT': {
                primary: `Presentation limit reached (${value} of ${limit} maximum tones)`,
                clinical: 'Excessive presentations cause patient fatigue and attention lapses',
                action: 'Finalizing threshold based on collected evidence'
            },
            'REVERSAL_LIMIT': {
                primary: `Reversal limit reached (${value} of ${limit} maximum reversals)`,
                clinical: 'Multiple reversals indicate response inconsistency or patient confusion',
                action: 'Establishing threshold from most reliable response pattern'
            }
        };

        const explanation = constraintExplanations[constraint] || {
            primary: `Efficiency constraint triggered: ${reason}`,
            clinical: 'Clinical efficiency limit reached',
            action: 'Proceeding with available evidence'
        };

        // Confidence assessment
        const confidencePercent = Math.round(confidence * 100);
        const confidenceLevel = this.getConfidenceDescriptor(confidencePercent);

        // Clinical justification
        const clinicalJustification = this.generateEfficiencyJustification(constraint, value, limit);

        return {
            primary: explanation.primary,
            detailed: {
                constraint: constraint,
                clinicalReason: explanation.clinical,
                proposedAction: explanation.action,
                forcedThreshold: `${forcedThreshold} dB HL`,
                confidence: {
                    level: confidenceLevel.descriptor,
                    clinical: confidenceLevel.clinical,
                    numeric: confidencePercent
                },
                clinicalJustification: clinicalJustification,
                rationale: clinicalRationale || 'Standard clinical efficiency protocol'
            },
            rationale: {
                rule: `Clinical efficiency constraint: ${constraint}`,
                evidence: `${value} of ${limit} limit reached`,
                decision: `Forced threshold estimation with ${confidencePercent}% confidence`,
                standard: 'Real-world clinical practice balances accuracy with patient comfort'
            }
        };
    }

    /**
     * Generate clinical justification for efficiency constraints
     * @param {string} constraint - Constraint type
     * @param {number} value - Current value
     * @param {number} limit - Constraint limit
     * @returns {string} Clinical justification
     */
    generateEfficiencyJustification(constraint, value, limit) {
        const utilizationPercent = Math.round((value / limit) * 100);
        
        const justifications = {
            'TIME_LIMIT': `Patient attention and response reliability decline significantly after ${limit/1000} seconds of continuous testing. Current session duration (${Math.round(value/1000)}s) approaches fatigue threshold.`,
            'PRESENTATION_LIMIT': `Clinical studies show diminishing returns after ${limit} tone presentations per frequency. Current count (${value}) indicates sufficient evidence collection for threshold determination.`,
            'REVERSAL_LIMIT': `More than ${limit} intensity reversals typically indicate patient confusion or inconsistent responses. Current reversal count (${value}) suggests threshold region has been adequately explored.`
        };

        const baseJustification = justifications[constraint] || `Efficiency limit reached (${utilizationPercent}% of maximum).`;
        
        return `${baseJustification} Proceeding with threshold estimation maintains clinical workflow while preserving measurement validity.`;
    }

    /**
     * Summarize threshold results for a completed ear
     * @param {Object} thresholds - Threshold data for the ear (frequency -> threshold value)
     * @param {string} ear - Ear identifier ('left' or 'right')
     * @returns {string} Human-readable summary of ear results
     */
    summarizeEarResults(thresholds, ear) {
        try {
            // Defensive safeguards
            if (!thresholds || typeof thresholds !== 'object') {
                return `${ear} ear assessment completed (no threshold data available)`;
            }

            const frequencies = Object.keys(thresholds);
            
            if (frequencies.length === 0) {
                return `${ear} ear assessment completed (no frequencies tested)`;
            }

            // Calculate summary statistics
            const thresholdValues = frequencies.map(freq => thresholds[freq]).filter(val => val !== null && val !== undefined);
            
            if (thresholdValues.length === 0) {
                return `${ear} ear assessment completed (${frequencies.length} frequencies attempted, no valid thresholds established)`;
            }

            // Calculate average threshold
            const averageThreshold = Math.round(thresholdValues.reduce((sum, val) => sum + val, 0) / thresholdValues.length);
            
            // Determine hearing level classification
            const hearingLevel = this.classifyHearingLevel(averageThreshold);
            
            // Create frequency range summary
            const frequencyRange = this.summarizeFrequencyRange(frequencies);
            
            // Generate comprehensive summary
            const summary = `${ear} ear completed: ${thresholdValues.length}/${frequencies.length} frequencies tested, ` +
                          `average threshold ${averageThreshold} dB HL (${hearingLevel}), ` +
                          `range ${frequencyRange}`;

            return summary;

        } catch (error) {
            // Defensive fallback - never crash the clinical flow
            console.warn('Error summarizing ear results:', error);
            return `${ear} ear assessment completed (summary unavailable)`;
        }
    }

    /**
     * Classify hearing level based on average threshold
     * @param {number} averageThreshold - Average threshold in dB HL
     * @returns {string} Hearing level classification
     */
    classifyHearingLevel(averageThreshold) {
        if (averageThreshold <= 20) return 'normal hearing';
        if (averageThreshold <= 40) return 'mild hearing loss';
        if (averageThreshold <= 60) return 'moderate hearing loss';
        if (averageThreshold <= 80) return 'severe hearing loss';
        return 'profound hearing loss';
    }

    /**
     * Summarize the frequency range tested
     * @param {Array} frequencies - Array of frequency strings
     * @returns {string} Frequency range summary
     */
    summarizeFrequencyRange(frequencies) {
        try {
            const numericFreqs = frequencies
                .map(f => parseInt(f))
                .filter(f => !isNaN(f))
                .sort((a, b) => a - b);

            if (numericFreqs.length === 0) return 'unknown frequencies';
            if (numericFreqs.length === 1) return `${numericFreqs[0]} Hz`;
            
            const minFreq = numericFreqs[0];
            const maxFreq = numericFreqs[numericFreqs.length - 1];
            
            return `${minFreq}-${maxFreq} Hz`;
        } catch (error) {
            return 'multiple frequencies';
        }
    }
}