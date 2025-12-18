/**
 * Response Analyzer Module
 * Comprehensive analysis of patient response patterns and timing for audiometric testing
 * Tracks reaction times, delayed responses, anticipatory responses, and fatigue indicators
 */
export class ResponseAnalyzer {
    constructor() {
        this.responses = [];
        this.reactionTimes = [];
        this.falsePositives = 0;
        this.missedResponses = 0;
        this.testStartTime = Date.now();
        
        // Clinical timing thresholds (based on audiometric research)
        this.timingThresholds = {
            // Normal reaction time range for audiometric testing
            normal: { min: 200, max: 1500 }, // ms
            
            // Anticipatory response (too fast - likely guessing)
            anticipatory: { max: 150 }, // ms
            
            // Delayed response (may indicate hearing difficulty or cognitive issues)
            delayed: { min: 2000 }, // ms
            
            // Very delayed (possible attention/fatigue issues)
            veryDelayed: { min: 3500 }, // ms
            
            // Optimal response window (most reliable responses)
            optimal: { min: 300, max: 800 } // ms
        };
        
        // Fatigue analysis parameters
        this.fatigueAnalysis = {
            windowSize: 10, // Number of recent responses to analyze
            baselineWindow: 5, // Initial responses for baseline
            fatigueThreshold: 1.5, // Multiplier for detecting fatigue
            attentionThreshold: 0.3 // Consistency drop indicating attention issues
        };
        
        // Response pattern tracking
        this.responsePatterns = {
            consecutiveDelayed: 0,
            consecutiveAnticipatory: 0,
            reactionTimeVariability: [],
            attentionLapses: 0
        };
        
        // Confidence scoring weights
        this.confidenceWeights = {
            reactionTime: 0.35,      // Primary factor - timing consistency
            responseConsistency: 0.25, // Response pattern reliability
            fatigueLevel: 0.20,      // Patient alertness/attention
            anticipatoryRate: 0.15,  // Guessing behavior
            delayedRate: 0.05        // Processing difficulties
        };
    }

    /**
     * Add a response with comprehensive timing analysis
     * @param {number} frequency - Test frequency in Hz
     * @param {number} level - Test level in dB HL
     * @param {boolean} response - Patient response (true/false)
     * @param {number} timestamp - Response timestamp
     * @param {number} toneStartTime - Tone onset timestamp
     * @param {Object} additionalData - Optional additional response data
     * @returns {Object} Comprehensive response analysis
     */
    addResponse(frequency, level, response, timestamp, toneStartTime = null, additionalData = {}) {
        const reactionTime = toneStartTime ? timestamp - toneStartTime : null;
        const testDuration = timestamp - this.testStartTime;
        
        const responseData = {
            frequency,
            level,
            response,
            timestamp,
            toneStartTime,
            reactionTime,
            testDuration,
            responseIndex: this.responses.length,
            ...additionalData
        };
        
        // Perform comprehensive timing analysis
        const timingAnalysis = this.analyzeResponseTiming(responseData);
        responseData.timingAnalysis = timingAnalysis;
        
        // Update pattern tracking
        this.updateResponsePatterns(responseData);
        
        // Store response
        this.responses.push(responseData);
        
        if (reactionTime !== null) {
            this.reactionTimes.push(reactionTime);
        }
        
        // Perform comprehensive analysis
        const analysis = this.analyzeLatestResponse(responseData);
        
        // Log detailed timing information
        this.logResponseTiming(responseData, analysis);
        
        return analysis;
    }

    /**
     * Comprehensive analysis of response timing patterns
     * @param {Object} responseData - Response data with timing information
     * @returns {Object} Detailed timing analysis
     */
    analyzeResponseTiming(responseData) {
        const { reactionTime } = responseData;
        
        if (!reactionTime) {
            return {
                category: 'no-response',
                reliability: 0,
                flags: ['No reaction time available']
            };
        }
        
        const analysis = {
            reactionTime,
            category: this.categorizeReactionTime(reactionTime),
            reliability: this.calculateTimingReliability(reactionTime),
            flags: [],
            percentile: this.calculateReactionTimePercentile(reactionTime),
            variability: this.calculateReactionTimeVariability(),
            fatigueIndicator: this.assessFatigueFromTiming(responseData)
        };
        
        // Categorize and flag timing issues
        if (reactionTime < this.timingThresholds.anticipatory.max) {
            analysis.flags.push('Anticipatory response - possible guessing');
        } else if (reactionTime > this.timingThresholds.veryDelayed.min) {
            analysis.flags.push('Very delayed response - attention/fatigue concern');
        } else if (reactionTime > this.timingThresholds.delayed.min) {
            analysis.flags.push('Delayed response - processing difficulty');
        }
        
        // Check for optimal timing
        if (reactionTime >= this.timingThresholds.optimal.min && 
            reactionTime <= this.timingThresholds.optimal.max) {
            analysis.flags.push('Optimal reaction time');
        }
        
        return analysis;
    }

    /**
     * Categorize reaction time into clinical categories
     * @param {number} reactionTime - Reaction time in milliseconds
     * @returns {string} Timing category
     */
    categorizeReactionTime(reactionTime) {
        if (reactionTime < this.timingThresholds.anticipatory.max) {
            return 'anticipatory';
        } else if (reactionTime > this.timingThresholds.veryDelayed.min) {
            return 'very-delayed';
        } else if (reactionTime > this.timingThresholds.delayed.min) {
            return 'delayed';
        } else if (reactionTime >= this.timingThresholds.optimal.min && 
                   reactionTime <= this.timingThresholds.optimal.max) {
            return 'optimal';
        } else if (reactionTime >= this.timingThresholds.normal.min && 
                   reactionTime <= this.timingThresholds.normal.max) {
            return 'normal';
        } else {
            return 'abnormal';
        }
    }

    /**
     * Calculate timing reliability score (0-1)
     * @param {number} reactionTime - Reaction time in milliseconds
     * @returns {number} Reliability score
     */
    calculateTimingReliability(reactionTime) {
        // Optimal timing gets highest reliability
        if (reactionTime >= this.timingThresholds.optimal.min && 
            reactionTime <= this.timingThresholds.optimal.max) {
            return 1.0;
        }
        
        // Normal timing gets good reliability
        if (reactionTime >= this.timingThresholds.normal.min && 
            reactionTime <= this.timingThresholds.normal.max) {
            return 0.8;
        }
        
        // Anticipatory responses are highly unreliable
        if (reactionTime < this.timingThresholds.anticipatory.max) {
            return 0.1;
        }
        
        // Very delayed responses are moderately unreliable
        if (reactionTime > this.timingThresholds.veryDelayed.min) {
            return 0.3;
        }
        
        // Delayed responses are somewhat unreliable
        if (reactionTime > this.timingThresholds.delayed.min) {
            return 0.5;
        }
        
        return 0.4; // Default for other cases
    }

    /**
     * Enhanced analysis of latest response with comprehensive timing evaluation
     * @param {Object} responseData - Complete response data
     * @returns {Object} Comprehensive analysis results
     */
    analyzeLatestResponse(responseData) {
        const analysis = {
            valid: true,
            flags: [],
            timingCategory: responseData.timingAnalysis?.category || 'unknown',
            timingReliability: responseData.timingAnalysis?.reliability || 0,
            consistency: this.calculateConsistency(),
            fatigueLevel: this.assessCurrentFatigueLevel(),
            attentionLevel: this.assessAttentionLevel(),
            confidenceScore: 0
        };

        // Copy timing flags
        if (responseData.timingAnalysis?.flags) {
            analysis.flags.push(...responseData.timingAnalysis.flags);
        }

        // Assess response validity based on timing
        if (responseData.timingAnalysis?.category === 'anticipatory') {
            analysis.valid = false;
            analysis.flags.push('Response too fast - likely anticipatory');
        }

        // Check for fatigue indicators
        if (analysis.fatigueLevel > 0.6) {
            analysis.flags.push('Fatigue detected - response reliability may be compromised');
        }

        // Check for attention issues
        if (analysis.attentionLevel < 0.4) {
            analysis.flags.push('Attention issues detected - inconsistent response patterns');
        }

        // Calculate overall confidence score
        analysis.confidenceScore = this.calculateResponseConfidence(responseData, analysis);

        return analysis;
    }

    /**
     * Update response pattern tracking for fatigue and attention analysis
     * @param {Object} responseData - Latest response data
     */
    updateResponsePatterns(responseData) {
        const { timingAnalysis } = responseData;
        
        if (!timingAnalysis) return;
        
        // Track consecutive patterns
        if (timingAnalysis.category === 'delayed' || timingAnalysis.category === 'very-delayed') {
            this.responsePatterns.consecutiveDelayed++;
            this.responsePatterns.consecutiveAnticipatory = 0;
        } else if (timingAnalysis.category === 'anticipatory') {
            this.responsePatterns.consecutiveAnticipatory++;
            this.responsePatterns.consecutiveDelayed = 0;
        } else {
            this.responsePatterns.consecutiveDelayed = 0;
            this.responsePatterns.consecutiveAnticipatory = 0;
        }
        
        // Track reaction time variability
        if (responseData.reactionTime) {
            this.responsePatterns.reactionTimeVariability.push(responseData.reactionTime);
            
            // Keep only recent responses for variability calculation
            if (this.responsePatterns.reactionTimeVariability.length > this.fatigueAnalysis.windowSize) {
                this.responsePatterns.reactionTimeVariability.shift();
            }
        }
        
        // Detect attention lapses (very delayed or missed responses)
        if (timingAnalysis.category === 'very-delayed' || !responseData.response) {
            this.responsePatterns.attentionLapses++;
        }
    }

    /**
     * Calculate reaction time percentile compared to normal population
     * @param {number} reactionTime - Reaction time in milliseconds
     * @returns {number} Percentile (0-100)
     */
    calculateReactionTimePercentile(reactionTime) {
        // Based on audiometric research data
        // Normal distribution: mean ~500ms, std ~200ms
        const mean = 500;
        const std = 200;
        
        // Calculate z-score
        const zScore = (reactionTime - mean) / std;
        
        // Convert to percentile (approximate)
        if (zScore <= -2) return 2;
        if (zScore <= -1) return 16;
        if (zScore <= 0) return 50;
        if (zScore <= 1) return 84;
        if (zScore <= 2) return 98;
        return 99;
    }

    /**
     * Calculate reaction time variability (coefficient of variation)
     * @returns {number} Variability coefficient (0-1+)
     */
    calculateReactionTimeVariability() {
        const recentTimes = this.responsePatterns.reactionTimeVariability;
        
        if (recentTimes.length < 3) return 0;
        
        const mean = recentTimes.reduce((sum, rt) => sum + rt, 0) / recentTimes.length;
        const variance = recentTimes.reduce((sum, rt) => sum + Math.pow(rt - mean, 2), 0) / recentTimes.length;
        const std = Math.sqrt(variance);
        
        // Coefficient of variation
        return mean > 0 ? std / mean : 0;
    }

    /**
     * Assess fatigue level from timing patterns
     * @param {Object} responseData - Current response data
     * @returns {number} Fatigue level (0-1)
     */
    assessFatigueFromTiming(responseData) {
        if (this.responses.length < this.fatigueAnalysis.baselineWindow) {
            return 0; // Not enough data for fatigue assessment
        }
        
        // Get baseline reaction times (first few responses)
        const baselineResponses = this.responses.slice(0, this.fatigueAnalysis.baselineWindow);
        const baselineTimes = baselineResponses
            .filter(r => r.reactionTime)
            .map(r => r.reactionTime);
        
        if (baselineTimes.length === 0) return 0;
        
        const baselineAverage = baselineTimes.reduce((sum, rt) => sum + rt, 0) / baselineTimes.length;
        
        // Get recent reaction times
        const recentResponses = this.responses.slice(-this.fatigueAnalysis.windowSize);
        const recentTimes = recentResponses
            .filter(r => r.reactionTime)
            .map(r => r.reactionTime);
        
        if (recentTimes.length === 0) return 0;
        
        const recentAverage = recentTimes.reduce((sum, rt) => sum + rt, 0) / recentTimes.length;
        
        // Calculate fatigue indicator
        const slowdownRatio = recentAverage / baselineAverage;
        
        // Fatigue indicated by significant slowdown
        if (slowdownRatio >= this.fatigueAnalysis.fatigueThreshold) {
            return Math.min(1.0, (slowdownRatio - 1.0) / 0.5); // Scale to 0-1
        }
        
        return 0;
    }

    /**
     * Assess current fatigue level based on recent response patterns
     * @returns {number} Fatigue level (0-1)
     */
    assessCurrentFatigueLevel() {
        if (this.responses.length < this.fatigueAnalysis.windowSize) {
            return 0;
        }
        
        const recentResponses = this.responses.slice(-this.fatigueAnalysis.windowSize);
        
        // Multiple fatigue indicators
        let fatigueScore = 0;
        
        // 1. Increasing reaction times
        const timingFatigue = this.assessFatigueFromTiming(recentResponses[recentResponses.length - 1]);
        fatigueScore += timingFatigue * 0.4;
        
        // 2. Consecutive delayed responses
        const delayedRatio = this.responsePatterns.consecutiveDelayed / this.fatigueAnalysis.windowSize;
        fatigueScore += Math.min(1.0, delayedRatio * 2) * 0.3;
        
        // 3. Increased variability
        const variability = this.calculateReactionTimeVariability();
        fatigueScore += Math.min(1.0, variability * 3) * 0.2;
        
        // 4. Attention lapses
        const attentionLapseRatio = this.responsePatterns.attentionLapses / this.responses.length;
        fatigueScore += Math.min(1.0, attentionLapseRatio * 5) * 0.1;
        
        return Math.min(1.0, fatigueScore);
    }

    /**
     * Assess attention level based on response consistency and timing
     * @returns {number} Attention level (0-1)
     */
    assessAttentionLevel() {
        if (this.responses.length < 5) {
            return 0.5; // Neutral until enough data
        }
        
        let attentionScore = 1.0;
        
        // 1. Response consistency
        const consistency = this.calculateConsistency();
        attentionScore *= consistency;
        
        // 2. Anticipatory response rate (indicates inattention/guessing)
        const anticipatoryCount = this.responses.filter(r => 
            r.timingAnalysis?.category === 'anticipatory'
        ).length;
        const anticipatoryRate = anticipatoryCount / this.responses.length;
        attentionScore *= Math.max(0.2, 1.0 - anticipatoryRate * 2);
        
        // 3. Very delayed response rate (indicates attention lapses)
        const veryDelayedCount = this.responses.filter(r => 
            r.timingAnalysis?.category === 'very-delayed'
        ).length;
        const veryDelayedRate = veryDelayedCount / this.responses.length;
        attentionScore *= Math.max(0.2, 1.0 - veryDelayedRate * 3);
        
        // 4. Reaction time variability (high variability indicates inconsistent attention)
        const variability = this.calculateReactionTimeVariability();
        attentionScore *= Math.max(0.3, 1.0 - variability);
        
        return Math.max(0, Math.min(1.0, attentionScore));
    }

    /**
     * Calculate comprehensive confidence score based on timing and response patterns
     * @param {Object} responseData - Current response data
     * @param {Object} analysis - Current analysis results
     * @returns {number} Confidence score (0-1)
     */
    calculateResponseConfidence(responseData, analysis) {
        let confidence = 0;
        
        // 1. Reaction time reliability
        const timingReliability = responseData.timingAnalysis?.reliability || 0;
        confidence += timingReliability * this.confidenceWeights.reactionTime;
        
        // 2. Response consistency
        confidence += analysis.consistency * this.confidenceWeights.responseConsistency;
        
        // 3. Fatigue level (inverse - less fatigue = higher confidence)
        const fatigueScore = 1.0 - analysis.fatigueLevel;
        confidence += fatigueScore * this.confidenceWeights.fatigueLevel;
        
        // 4. Anticipatory response rate (inverse)
        const anticipatoryRate = this.getAnticipatoryResponseRate();
        const anticipatoryScore = 1.0 - anticipatoryRate;
        confidence += anticipatoryScore * this.confidenceWeights.anticipatoryRate;
        
        // 5. Delayed response rate (inverse)
        const delayedRate = this.getDelayedResponseRate();
        const delayedScore = 1.0 - delayedRate;
        confidence += delayedScore * this.confidenceWeights.delayedRate;
        
        return Math.max(0, Math.min(1.0, confidence));
    }

    /**
     * Get anticipatory response rate
     * @returns {number} Rate of anticipatory responses (0-1)
     */
    getAnticipatoryResponseRate() {
        if (this.responses.length === 0) return 0;
        
        const anticipatoryCount = this.responses.filter(r => 
            r.timingAnalysis?.category === 'anticipatory'
        ).length;
        
        return anticipatoryCount / this.responses.length;
    }

    /**
     * Get delayed response rate
     * @returns {number} Rate of delayed responses (0-1)
     */
    getDelayedResponseRate() {
        if (this.responses.length === 0) return 0;
        
        const delayedCount = this.responses.filter(r => 
            r.timingAnalysis?.category === 'delayed' || 
            r.timingAnalysis?.category === 'very-delayed'
        ).length;
        
        return delayedCount / this.responses.length;
    }

    /**
     * Log detailed response timing information
     * @param {Object} responseData - Response data
     * @param {Object} analysis - Analysis results
     */
    logResponseTiming(responseData, analysis) {
        if (responseData.reactionTime) {
            console.log(`⏱️ Response Timing Analysis:`, {
                reactionTime: `${responseData.reactionTime}ms`,
                category: responseData.timingAnalysis?.category,
                reliability: `${Math.round((responseData.timingAnalysis?.reliability || 0) * 100)}%`,
                percentile: `${responseData.timingAnalysis?.percentile}th`,
                confidence: `${Math.round(analysis.confidenceScore * 100)}%`,
                fatigue: `${Math.round(analysis.fatigueLevel * 100)}%`,
                attention: `${Math.round(analysis.attentionLevel * 100)}%`
            });
        }
    }

    /**
     * Legacy method for backward compatibility
     * @param {number} reactionTime - Reaction time in milliseconds
     * @returns {number} Suspicion score (0-1)
     */
    analyzeResponseTime(reactionTime) {
        if (!reactionTime) return 0;
        
        const reliability = this.calculateTimingReliability(reactionTime);
        return 1.0 - reliability; // Convert reliability to suspicion score
    }

    calculateConsistency() {
        if (this.responses.length < 3) return 0.5;
        
        // Calculate consistency based on response patterns
        const recentResponses = this.responses.slice(-5);
        let consistentResponses = 0;
        
        for (let i = 1; i < recentResponses.length; i++) {
            const current = recentResponses[i];
            const previous = recentResponses[i - 1];
            
            // Check if response pattern makes sense
            if (current.level > previous.level && current.response >= previous.response) {
                consistentResponses++;
            } else if (current.level < previous.level && current.response <= previous.response) {
                consistentResponses++;
            }
        }
        
        return consistentResponses / (recentResponses.length - 1);
    }

    getReliabilityScore() {
        if (this.responses.length === 0) return 0;
        
        const consistency = this.calculateConsistency();
        const reactionTimeScore = this.calculateReactionTimeScore();
        const responseRateScore = this.calculateResponseRateScore();
        
        return (consistency * 0.5 + reactionTimeScore * 0.3 + responseRateScore * 0.2);
    }

    calculateReactionTimeScore() {
        if (this.reactionTimes.length === 0) return 0.5;
        
        const normalTimes = this.reactionTimes.filter(rt => 
            rt >= this.normalReactionTime.min && rt <= this.normalReactionTime.max
        );
        
        return normalTimes.length / this.reactionTimes.length;
    }

    calculateResponseRateScore() {
        if (this.responses.length === 0) return 0.5;
        
        const responseRate = this.responses.filter(r => r.response).length / this.responses.length;
        
        // Ideal response rate is around 50-70% (depending on threshold levels)
        if (responseRate >= 0.3 && responseRate <= 0.8) {
            return 1.0;
        } else if (responseRate < 0.1 || responseRate > 0.95) {
            return 0.2; // Very suspicious
        } else {
            return 0.6;
        }
    }

    /**
     * Get comprehensive response timing summary
     * @returns {Object} Detailed timing and response analysis summary
     */
    getResponseSummary() {
        const timingStats = this.getTimingStatistics();
        const fatigueLevel = this.assessCurrentFatigueLevel();
        const attentionLevel = this.assessAttentionLevel();
        
        return {
            // Basic response data
            totalResponses: this.responses.length,
            positiveResponses: this.responses.filter(r => r.response).length,
            responseRate: this.responses.length > 0 ? 
                this.responses.filter(r => r.response).length / this.responses.length : 0,
            
            // Timing analysis
            timing: timingStats,
            
            // Quality metrics
            consistency: this.calculateConsistency(),
            reliability: this.getReliabilityScore(),
            fatigueLevel: fatigueLevel,
            attentionLevel: attentionLevel,
            
            // Response categories
            responseCategories: this.getResponseCategorySummary(),
            
            // Confidence assessment
            overallConfidence: this.calculateOverallConfidence(),
            
            // Clinical flags
            clinicalFlags: this.getClinicalFlags()
        };
    }

    /**
     * Get detailed timing statistics
     * @returns {Object} Comprehensive timing statistics
     */
    getTimingStatistics() {
        const validTimes = this.reactionTimes.filter(rt => rt !== null && rt !== undefined);
        
        if (validTimes.length === 0) {
            return {
                count: 0,
                average: null,
                median: null,
                min: null,
                max: null,
                standardDeviation: null,
                variabilityCoefficient: null
            };
        }
        
        const sorted = [...validTimes].sort((a, b) => a - b);
        const sum = validTimes.reduce((acc, rt) => acc + rt, 0);
        const average = sum / validTimes.length;
        
        // Calculate standard deviation
        const variance = validTimes.reduce((acc, rt) => acc + Math.pow(rt - average, 2), 0) / validTimes.length;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            count: validTimes.length,
            average: Math.round(average),
            median: Math.round(sorted[Math.floor(sorted.length / 2)]),
            min: Math.min(...validTimes),
            max: Math.max(...validTimes),
            standardDeviation: Math.round(standardDeviation),
            variabilityCoefficient: average > 0 ? Math.round((standardDeviation / average) * 100) / 100 : 0,
            
            // Percentile distribution
            percentiles: {
                p25: Math.round(sorted[Math.floor(sorted.length * 0.25)]),
                p75: Math.round(sorted[Math.floor(sorted.length * 0.75)]),
                p90: Math.round(sorted[Math.floor(sorted.length * 0.90)])
            }
        };
    }

    /**
     * Get summary of response categories by timing
     * @returns {Object} Response category breakdown
     */
    getResponseCategorySummary() {
        const categories = {
            optimal: 0,
            normal: 0,
            anticipatory: 0,
            delayed: 0,
            veryDelayed: 0,
            noTiming: 0
        };
        
        this.responses.forEach(response => {
            const category = response.timingAnalysis?.category || 'noTiming';
            if (categories.hasOwnProperty(category)) {
                categories[category]++;
            } else {
                categories.noTiming++;
            }
        });
        
        // Convert to percentages
        const total = this.responses.length;
        const percentages = {};
        Object.keys(categories).forEach(key => {
            percentages[key] = total > 0 ? Math.round((categories[key] / total) * 100) : 0;
        });
        
        return {
            counts: categories,
            percentages: percentages
        };
    }

    /**
     * Calculate overall confidence score for the entire test session
     * @returns {number} Overall confidence score (0-1)
     */
    calculateOverallConfidence() {
        if (this.responses.length === 0) return 0;
        
        // Average confidence of all responses
        const responseConfidences = this.responses
            .filter(r => r.timingAnalysis)
            .map(r => {
                const mockAnalysis = {
                    consistency: this.calculateConsistency(),
                    fatigueLevel: this.assessCurrentFatigueLevel(),
                    attentionLevel: this.assessAttentionLevel()
                };
                return this.calculateResponseConfidence(r, mockAnalysis);
            });
        
        if (responseConfidences.length === 0) return 0;
        
        const averageConfidence = responseConfidences.reduce((sum, conf) => sum + conf, 0) / responseConfidences.length;
        
        // Apply session-level adjustments
        let sessionConfidence = averageConfidence;
        
        // Reduce confidence for high fatigue
        const fatigueLevel = this.assessCurrentFatigueLevel();
        sessionConfidence *= (1.0 - fatigueLevel * 0.3);
        
        // Reduce confidence for low attention
        const attentionLevel = this.assessAttentionLevel();
        sessionConfidence *= (0.5 + attentionLevel * 0.5);
        
        // Reduce confidence for high anticipatory rate
        const anticipatoryRate = this.getAnticipatoryResponseRate();
        sessionConfidence *= (1.0 - anticipatoryRate * 0.5);
        
        return Math.max(0, Math.min(1.0, sessionConfidence));
    }

    /**
     * Get clinical flags based on timing analysis
     * @returns {Array} Array of clinical concern flags
     */
    getClinicalFlags() {
        const flags = [];
        
        // High anticipatory response rate
        const anticipatoryRate = this.getAnticipatoryResponseRate();
        if (anticipatoryRate > 0.2) {
            flags.push({
                type: 'anticipatory_responses',
                severity: anticipatoryRate > 0.4 ? 'high' : 'moderate',
                message: `High anticipatory response rate (${Math.round(anticipatoryRate * 100)}%) - possible guessing behavior`,
                recommendation: 'Consider re-instruction or test validity concerns'
            });
        }
        
        // High delayed response rate
        const delayedRate = this.getDelayedResponseRate();
        if (delayedRate > 0.3) {
            flags.push({
                type: 'delayed_responses',
                severity: delayedRate > 0.5 ? 'high' : 'moderate',
                message: `High delayed response rate (${Math.round(delayedRate * 100)}%) - processing difficulties`,
                recommendation: 'Consider cognitive factors or hearing aid processing delays'
            });
        }
        
        // High fatigue level
        const fatigueLevel = this.assessCurrentFatigueLevel();
        if (fatigueLevel > 0.6) {
            flags.push({
                type: 'fatigue',
                severity: fatigueLevel > 0.8 ? 'high' : 'moderate',
                message: `Significant fatigue detected (${Math.round(fatigueLevel * 100)}%) - test reliability compromised`,
                recommendation: 'Consider test break or session termination'
            });
        }
        
        // Low attention level
        const attentionLevel = this.assessAttentionLevel();
        if (attentionLevel < 0.4) {
            flags.push({
                type: 'attention',
                severity: attentionLevel < 0.2 ? 'high' : 'moderate',
                message: `Low attention level (${Math.round(attentionLevel * 100)}%) - inconsistent responses`,
                recommendation: 'Consider re-instruction or environmental factors'
            });
        }
        
        // High reaction time variability
        const variability = this.calculateReactionTimeVariability();
        if (variability > 0.5) {
            flags.push({
                type: 'variability',
                severity: variability > 0.7 ? 'high' : 'moderate',
                message: `High reaction time variability (CV: ${Math.round(variability * 100)}%) - inconsistent performance`,
                recommendation: 'Consider attention, fatigue, or comprehension issues'
            });
        }
        
        return flags;
    }

    reset() {
        this.responses = [];
        this.reactionTimes = [];
        this.falsePositives = 0;
        this.missedResponses = 0;
    }
}