/**
 * False Response Detection System
 * Implements catch trials, silence detection, and response consistency analysis
 * Outputs confidence scores (0-100%) for each threshold measurement
 */
export class FalseResponseDetector {
    constructor() {
        // Catch trial configuration
        this.catchTrialProbability = 0.15; // 15% chance of catch trial
        this.catchTrialHistory = [];
        this.silenceTrialHistory = [];
        
        // Response tracking
        this.responseHistory = [];
        this.falsePositiveCount = 0;
        this.totalCatchTrials = 0;
        
        // Detection parameters
        this.thresholds = {
            maxFalsePositiveRate: 0.2,      // 20% false positive rate is suspicious
            minPlausibleThreshold: -5,       // dB HL - responses below this are implausible
            maxReactionTime: 2500,           // ms - suspiciously slow responses
            minReactionTime: 100,            // ms - suspiciously fast responses
            consistencyWindow: 10,           // dB - acceptable threshold variability
            minResponsesForConfidence: 6     // Minimum responses needed for reliable confidence
        };
        
        // Confidence calculation weights
        this.confidenceWeights = {
            catchTrialPerformance: 0.35,     // Performance on catch trials
            responseConsistency: 0.25,       // Consistency of responses at similar levels
            thresholdPlausibility: 0.20,     // Plausibility of final threshold
            reactionTimeConsistency: 0.15,   // Consistency of reaction times
            crossFrequencyConsistency: 0.05  // Consistency across frequencies
        };
        
        // Current test tracking
        this.currentFrequency = null;
        this.currentEar = null;
        this.currentTestResponses = [];
    }

    /**
     * Determine if next presentation should be a catch trial
     * @param {number} presentationCount - Number of presentations so far
     * @param {number} frequency - Current frequency being tested
     * @param {string} ear - Current ear being tested
     * @returns {Object} - Catch trial decision
     */
    shouldInsertCatchTrial(presentationCount, frequency, ear) {
        // Don't insert catch trials too early or too frequently
        if (presentationCount < 3) {
            return { isCatchTrial: false, type: null };
        }
        
        // Check recent catch trial history to avoid clustering
        const recentCatchTrials = this.catchTrialHistory.filter(
            trial => Date.now() - trial.timestamp < 30000 // Last 30 seconds
        );
        
        if (recentCatchTrials.length >= 2) {
            return { isCatchTrial: false, type: null };
        }
        
        // Random insertion based on probability
        const random = Math.random();
        
        if (random < this.catchTrialProbability) {
            // Determine catch trial type
            const catchType = this.selectCatchTrialType(frequency, ear);
            
            console.log(`🎯 Inserting catch trial: ${catchType.type}`);
            
            return {
                isCatchTrial: true,
                type: catchType.type,
                parameters: catchType.parameters
            };
        }
        
        return { isCatchTrial: false, type: null };
    }

    /**
     * Select appropriate catch trial type
     * @param {number} frequency - Current frequency
     * @param {string} ear - Current ear
     * @returns {Object} - Catch trial configuration
     */
    selectCatchTrialType(frequency, ear) {
        const types = [
            {
                type: 'SILENCE',
                weight: 0.4,
                parameters: {
                    duration: 1000,
                    description: 'No sound presented - should not respond'
                }
            },
            {
                type: 'VERY_LOW_INTENSITY',
                weight: 0.3,
                parameters: {
                    level: -5, // dB HL - below normal hearing threshold
                    frequency: frequency,
                    ear: ear,
                    duration: 1000,
                    description: 'Implausibly quiet tone - should not respond'
                }
            },
            {
                type: 'WRONG_EAR',
                weight: 0.2,
                parameters: {
                    level: 40, // Audible level
                    frequency: frequency,
                    ear: ear === 'left' ? 'right' : 'left', // Opposite ear
                    duration: 1000,
                    description: 'Tone in opposite ear - should not respond'
                }
            },
            {
                type: 'DELAYED_SILENCE',
                weight: 0.1,
                parameters: {
                    delay: 2000, // 2 second delay before silence
                    duration: 1000,
                    description: 'Delayed silence - tests for anticipatory responses'
                }
            }
        ];
        
        // Weighted random selection
        const totalWeight = types.reduce((sum, type) => sum + type.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const type of types) {
            random -= type.weight;
            if (random <= 0) {
                return type;
            }
        }
        
        return types[0]; // Fallback
    }

    /**
     * Execute catch trial and record result
     * @param {Object} catchTrial - Catch trial configuration
     * @param {Function} presentStimulus - Function to present audio stimulus
     * @param {Function} waitForResponse - Function to wait for patient response
     * @returns {Object} - Catch trial result
     */
    async executeCatchTrial(catchTrial, presentStimulus, waitForResponse) {
        const startTime = Date.now();
        
        console.log(`🎯 Executing catch trial: ${catchTrial.type}`);
        
        let response = false;
        let reactionTime = null;
        
        try {
            switch (catchTrial.type) {
                case 'SILENCE':
                    // Present no sound, just wait for response
                    console.log('🔇 Catch trial: Silence (no sound)');
                    response = await waitForResponse(3000);
                    break;
                    
                case 'VERY_LOW_INTENSITY':
                    // Present tone at implausibly low level
                    console.log(`🔉 Catch trial: Very low intensity (${catchTrial.parameters.level} dB HL)`);
                    await presentStimulus(
                        catchTrial.parameters.frequency,
                        catchTrial.parameters.level,
                        catchTrial.parameters.ear,
                        catchTrial.parameters.duration
                    );
                    response = await waitForResponse(3000);
                    break;
                    
                case 'WRONG_EAR':
                    // Present tone to opposite ear
                    console.log(`👂 Catch trial: Wrong ear (${catchTrial.parameters.ear})`);
                    await presentStimulus(
                        catchTrial.parameters.frequency,
                        catchTrial.parameters.level,
                        catchTrial.parameters.ear,
                        catchTrial.parameters.duration
                    );
                    response = await waitForResponse(3000);
                    break;
                    
                case 'DELAYED_SILENCE':
                    // Wait, then present silence
                    console.log(`⏱️ Catch trial: Delayed silence (${catchTrial.parameters.delay}ms delay)`);
                    await new Promise(resolve => setTimeout(resolve, catchTrial.parameters.delay));
                    response = await waitForResponse(3000);
                    break;
            }
            
            reactionTime = response ? Date.now() - startTime : null;
            
        } catch (error) {
            console.error('Catch trial execution error:', error);
            response = false;
        }
        
        // Record catch trial result
        const result = {
            type: catchTrial.type,
            parameters: catchTrial.parameters,
            response: response,
            reactionTime: reactionTime,
            timestamp: Date.now(),
            frequency: this.currentFrequency,
            ear: this.currentEar,
            expectedResponse: false // Catch trials should not elicit responses
        };
        
        this.catchTrialHistory.push(result);
        this.totalCatchTrials++;
        
        if (response) {
            this.falsePositiveCount++;
            console.log(`❌ False positive detected on catch trial (${this.falsePositiveCount}/${this.totalCatchTrials})`);
        } else {
            console.log(`✅ Correct rejection on catch trial`);
        }
        
        // Dispatch catch trial event
        document.dispatchEvent(new CustomEvent('catch-trial-completed', {
            detail: result
        }));
        
        return result;
    }

    /**
     * Record regular test response for analysis
     * @param {number} frequency - Test frequency
     * @param {number} level - Stimulus level in dB HL
     * @param {string} ear - Test ear
     * @param {boolean} response - Patient response
     * @param {number} reactionTime - Response time in ms
     */
    recordResponse(frequency, level, ear, response, reactionTime) {
        const responseData = {
            frequency,
            level,
            ear,
            response,
            reactionTime,
            timestamp: Date.now(),
            isCatchTrial: false
        };
        
        this.responseHistory.push(responseData);
        
        // Update current test tracking
        if (frequency !== this.currentFrequency || ear !== this.currentEar) {
            this.currentFrequency = frequency;
            this.currentEar = ear;
            this.currentTestResponses = [];
        }
        
        this.currentTestResponses.push(responseData);
        
        // Analyze for suspicious patterns
        this.analyzeResponsePattern(responseData);
    }

    /**
     * Analyze response pattern for suspicious behavior
     * @param {Object} responseData - Latest response data
     */
    analyzeResponsePattern(responseData) {
        // Check for implausibly low threshold responses
        if (responseData.response && responseData.level < this.thresholds.minPlausibleThreshold) {
            console.log(`⚠️ Suspicious: Response at implausibly low level (${responseData.level} dB HL)`);
        }
        
        // Check reaction time consistency
        if (responseData.reactionTime) {
            if (responseData.reactionTime < this.thresholds.minReactionTime) {
                console.log(`⚠️ Suspicious: Very fast reaction time (${responseData.reactionTime}ms)`);
            } else if (responseData.reactionTime > this.thresholds.maxReactionTime) {
                console.log(`⚠️ Suspicious: Very slow reaction time (${responseData.reactionTime}ms)`);
            }
        }
        
        // Check for response consistency at similar levels
        this.checkResponseConsistency(responseData);
    }

    /**
     * Check response consistency at similar intensity levels
     * @param {Object} newResponse - Latest response
     */
    checkResponseConsistency(newResponse) {
        const similarResponses = this.currentTestResponses.filter(r => 
            Math.abs(r.level - newResponse.level) <= 5 && // Within 5 dB
            r.timestamp !== newResponse.timestamp // Not the same response
        );
        
        if (similarResponses.length >= 2) {
            const responsePattern = similarResponses.map(r => r.response);
            const consistency = this.calculatePatternConsistency(responsePattern);
            
            if (consistency < 0.5) {
                console.log(`⚠️ Suspicious: Inconsistent responses at similar levels (${Math.round(consistency * 100)}% consistency)`);
            }
        }
    }

    /**
     * Calculate pattern consistency
     * @param {Array} pattern - Array of boolean responses
     * @returns {number} - Consistency score (0-1)
     */
    calculatePatternConsistency(pattern) {
        if (pattern.length < 2) return 1;
        
        const positiveCount = pattern.filter(r => r).length;
        const negativeCount = pattern.length - positiveCount;
        
        // High consistency if responses are mostly the same
        return Math.max(positiveCount, negativeCount) / pattern.length;
    }

    /**
     * Calculate comprehensive confidence score for a threshold
     * @param {Object} thresholdData - Threshold measurement data
     * @param {number} frequency - Test frequency
     * @param {string} ear - Test ear
     * @returns {number} - Confidence score (0-100)
     */
    calculateConfidenceScore(thresholdData, frequency, ear) {
        const scores = {
            catchTrialPerformance: this.calculateCatchTrialScore(),
            responseConsistency: this.calculateResponseConsistencyScore(frequency, ear),
            thresholdPlausibility: this.calculateThresholdPlausibilityScore(thresholdData.threshold, frequency),
            reactionTimeConsistency: this.calculateReactionTimeConsistencyScore(frequency, ear),
            crossFrequencyConsistency: this.calculateCrossFrequencyConsistencyScore(thresholdData.threshold, frequency, ear)
        };
        
        // Weighted average
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const [component, weight] of Object.entries(this.confidenceWeights)) {
            if (scores[component] !== null) {
                totalScore += scores[component] * weight;
                totalWeight += weight;
            }
        }
        
        const finalScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 50;
        
        // Log confidence breakdown
        console.log(`📊 Confidence breakdown for ${frequency} Hz (${ear} ear):`);
        console.log(`   Catch trials: ${scores.catchTrialPerformance?.toFixed(2) || 'N/A'}`);
        console.log(`   Consistency: ${scores.responseConsistency?.toFixed(2) || 'N/A'}`);
        console.log(`   Plausibility: ${scores.thresholdPlausibility?.toFixed(2) || 'N/A'}`);
        console.log(`   Reaction time: ${scores.reactionTimeConsistency?.toFixed(2) || 'N/A'}`);
        console.log(`   Cross-frequency: ${scores.crossFrequencyConsistency?.toFixed(2) || 'N/A'}`);
        console.log(`   Final confidence: ${Math.round(finalScore)}%`);
        
        return Math.round(Math.max(0, Math.min(100, finalScore)));
    }

    /**
     * Calculate catch trial performance score
     * @returns {number|null} - Score (0-1) or null if insufficient data
     */
    calculateCatchTrialScore() {
        if (this.totalCatchTrials === 0) return null;
        
        const falsePositiveRate = this.falsePositiveCount / this.totalCatchTrials;
        
        // Perfect performance = 1.0, high false positive rate = 0.0
        if (falsePositiveRate === 0) return 1.0;
        if (falsePositiveRate >= this.thresholds.maxFalsePositiveRate) return 0.0;
        
        // Linear interpolation between perfect and threshold
        return 1.0 - (falsePositiveRate / this.thresholds.maxFalsePositiveRate);
    }

    /**
     * Calculate response consistency score for current frequency/ear
     * @param {number} frequency - Test frequency
     * @param {string} ear - Test ear
     * @returns {number|null} - Score (0-1) or null if insufficient data
     */
    calculateResponseConsistencyScore(frequency, ear) {
        const responses = this.responseHistory.filter(r => 
            r.frequency === frequency && r.ear === ear && !r.isCatchTrial
        );
        
        if (responses.length < this.thresholds.minResponsesForConfidence) return null;
        
        // Group responses by level (±2.5 dB bins)
        const levelGroups = {};
        responses.forEach(r => {
            const levelBin = Math.round(r.level / 5) * 5; // 5 dB bins
            if (!levelGroups[levelBin]) {
                levelGroups[levelBin] = [];
            }
            levelGroups[levelBin].push(r.response);
        });
        
        // Calculate consistency within each level group
        let totalConsistency = 0;
        let groupCount = 0;
        
        for (const [level, groupResponses] of Object.entries(levelGroups)) {
            if (groupResponses.length >= 2) {
                const consistency = this.calculatePatternConsistency(groupResponses);
                totalConsistency += consistency;
                groupCount++;
            }
        }
        
        return groupCount > 0 ? totalConsistency / groupCount : 0.5;
    }

    /**
     * Calculate threshold plausibility score
     * @param {number} threshold - Measured threshold in dB HL
     * @param {number} frequency - Test frequency
     * @returns {number} - Score (0-1)
     */
    calculateThresholdPlausibilityScore(threshold, frequency) {
        // Expected normal hearing thresholds by frequency
        const normalThresholds = {
            125: 15, 250: 10, 500: 5, 750: 5, 1000: 0,
            1500: 0, 2000: 5, 3000: 10, 4000: 15, 6000: 20, 8000: 25
        };
        
        const expectedThreshold = normalThresholds[frequency] || 10;
        
        // Implausibly good hearing (better than -10 dB HL)
        if (threshold < -10) return 0.0;
        
        // Normal range (within 25 dB of expected)
        if (threshold <= expectedThreshold + 25) return 1.0;
        
        // Mild to moderate loss (25-70 dB HL) - still plausible
        if (threshold <= 70) return 0.8;
        
        // Severe loss (70-90 dB HL) - plausible but less common
        if (threshold <= 90) return 0.6;
        
        // Profound loss (>90 dB HL) - plausible but rare
        return 0.4;
    }

    /**
     * Calculate reaction time consistency score
     * @param {number} frequency - Test frequency
     * @param {string} ear - Test ear
     * @returns {number|null} - Score (0-1) or null if insufficient data
     */
    calculateReactionTimeConsistencyScore(frequency, ear) {
        const responses = this.responseHistory.filter(r => 
            r.frequency === frequency && r.ear === ear && 
            r.response && r.reactionTime && !r.isCatchTrial
        );
        
        if (responses.length < 3) return null;
        
        const reactionTimes = responses.map(r => r.reactionTime);
        const mean = reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length;
        const variance = reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - mean, 2), 0) / reactionTimes.length;
        const stdDev = Math.sqrt(variance);
        
        // Coefficient of variation (lower is more consistent)
        const cv = stdDev / mean;
        
        // Good consistency: CV < 0.3, Poor consistency: CV > 0.8
        if (cv <= 0.3) return 1.0;
        if (cv >= 0.8) return 0.0;
        
        return 1.0 - ((cv - 0.3) / 0.5); // Linear interpolation
    }

    /**
     * Calculate cross-frequency consistency score
     * @param {number} threshold - Current threshold
     * @param {number} frequency - Current frequency
     * @param {string} ear - Current ear
     * @returns {number|null} - Score (0-1) or null if insufficient data
     */
    calculateCrossFrequencyConsistencyScore(threshold, frequency, ear) {
        // Get thresholds for adjacent frequencies
        const adjacentFreqs = this.getAdjacentFrequencies(frequency);
        const adjacentThresholds = [];
        
        adjacentFreqs.forEach(freq => {
            const response = this.responseHistory.find(r => 
                r.frequency === freq && r.ear === ear && !r.isCatchTrial
            );
            if (response) {
                adjacentThresholds.push(response.level);
            }
        });
        
        if (adjacentThresholds.length === 0) return null;
        
        // Calculate maximum difference from adjacent frequencies
        const maxDifference = Math.max(...adjacentThresholds.map(t => Math.abs(threshold - t)));
        
        // Reasonable difference: <20 dB, Suspicious: >40 dB
        if (maxDifference <= 20) return 1.0;
        if (maxDifference >= 40) return 0.0;
        
        return 1.0 - ((maxDifference - 20) / 20); // Linear interpolation
    }

    /**
     * Get adjacent frequencies for cross-frequency analysis
     * @param {number} frequency - Current frequency
     * @returns {Array} - Array of adjacent frequencies
     */
    getAdjacentFrequencies(frequency) {
        const freqs = [125, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000];
        const index = freqs.indexOf(frequency);
        const adjacent = [];
        
        if (index > 0) adjacent.push(freqs[index - 1]);
        if (index < freqs.length - 1) adjacent.push(freqs[index + 1]);
        
        return adjacent;
    }

    /**
     * Get comprehensive detection report
     * @returns {Object} - Complete false response analysis
     */
    getDetectionReport() {
        const falsePositiveRate = this.totalCatchTrials > 0 
            ? this.falsePositiveCount / this.totalCatchTrials 
            : 0;
        
        return {
            catchTrialSummary: {
                totalCatchTrials: this.totalCatchTrials,
                falsePositives: this.falsePositiveCount,
                falsePositiveRate: Math.round(falsePositiveRate * 100),
                performance: falsePositiveRate <= this.thresholds.maxFalsePositiveRate ? 'Good' : 'Suspicious'
            },
            suspiciousPatterns: this.identifySuspiciousPatterns(),
            recommendations: this.generateRecommendations(falsePositiveRate),
            catchTrialHistory: this.catchTrialHistory.map(trial => ({
                type: trial.type,
                response: trial.response,
                timestamp: new Date(trial.timestamp).toISOString()
            }))
        };
    }

    /**
     * Identify suspicious response patterns
     * @returns {Array} - Array of suspicious pattern descriptions
     */
    identifySuspiciousPatterns() {
        const patterns = [];
        
        // High false positive rate
        const falsePositiveRate = this.totalCatchTrials > 0 
            ? this.falsePositiveCount / this.totalCatchTrials 
            : 0;
        
        if (falsePositiveRate > this.thresholds.maxFalsePositiveRate) {
            patterns.push(`High false positive rate: ${Math.round(falsePositiveRate * 100)}%`);
        }
        
        // Responses at implausibly low levels
        const lowLevelResponses = this.responseHistory.filter(r => 
            r.response && r.level < this.thresholds.minPlausibleThreshold
        );
        
        if (lowLevelResponses.length > 0) {
            patterns.push(`${lowLevelResponses.length} responses at implausibly low levels`);
        }
        
        // Inconsistent reaction times
        const reactionTimes = this.responseHistory
            .filter(r => r.response && r.reactionTime)
            .map(r => r.reactionTime);
        
        if (reactionTimes.length > 5) {
            const mean = reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length;
            const variance = reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - mean, 2), 0) / reactionTimes.length;
            const cv = Math.sqrt(variance) / mean;
            
            if (cv > 0.8) {
                patterns.push(`Highly variable reaction times (CV: ${cv.toFixed(2)})`);
            }
        }
        
        return patterns;
    }

    /**
     * Generate clinical recommendations based on detection results
     * @param {number} falsePositiveRate - Rate of false positive responses
     * @returns {Array} - Array of recommendation strings
     */
    generateRecommendations(falsePositiveRate) {
        const recommendations = [];
        
        if (falsePositiveRate > 0.3) {
            recommendations.push('High false positive rate - consider retesting');
            recommendations.push('Evaluate patient understanding of instructions');
            recommendations.push('Consider objective testing methods');
        } else if (falsePositiveRate > 0.1) {
            recommendations.push('Moderate false positive rate - document findings');
            recommendations.push('Consider additional catch trials');
        }
        
        if (this.totalCatchTrials < 3) {
            recommendations.push('Insufficient catch trials for reliable assessment');
        }
        
        const suspiciousPatterns = this.identifySuspiciousPatterns();
        if (suspiciousPatterns.length > 2) {
            recommendations.push('Multiple suspicious patterns detected');
            recommendations.push('Results may not be reliable');
        }
        
        return recommendations;
    }

    /**
     * Reset detector for new test session
     */
    reset() {
        this.catchTrialHistory = [];
        this.silenceTrialHistory = [];
        this.responseHistory = [];
        this.falsePositiveCount = 0;
        this.totalCatchTrials = 0;
        this.currentFrequency = null;
        this.currentEar = null;
        this.currentTestResponses = [];
        
        console.log('🔄 False response detector reset');
    }
}