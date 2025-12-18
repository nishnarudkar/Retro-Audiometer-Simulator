/**
 * Malingering Detection Module
 * Analyzes response patterns to detect potential false responses
 */
export class MalingeringDetector {
    constructor() {
        this.responseHistory = [];
        this.suspiciousPatterns = [];
        this.riskScores = new Map(); // frequency_ear -> risk score
        
        // Detection thresholds
        this.thresholds = {
            maxReactionTime: 2000,
            minReactionTime: 150,
            consistencyThreshold: 0.7,
            thresholdVariability: 15, // dB
            crossFrequencyVariability: 20 // dB
        };
    }

    analyzeResponse(thresholdData, frequency, ear) {
        const key = `${ear}_${frequency}`;
        
        // Store response data
        this.responseHistory.push({
            frequency,
            ear,
            threshold: thresholdData.threshold,
            confidence: thresholdData.confidence,
            responses: thresholdData.responses,
            timestamp: Date.now()
        });

        let riskScore = 0;
        const suspiciousFlags = [];

        // 1. Threshold consistency check
        const consistencyRisk = this.checkThresholdConsistency(thresholdData);
        if (consistencyRisk > 0.3) {
            suspiciousFlags.push('Inconsistent thresholds');
            riskScore += consistencyRisk * 0.3;
        }

        // 2. Cross-frequency pattern analysis
        const crossFreqRisk = this.analyzeCrossFrequencyPattern(frequency, ear, thresholdData.threshold);
        if (crossFreqRisk > 0.4) {
            suspiciousFlags.push('Unusual cross-frequency pattern');
            riskScore += crossFreqRisk * 0.25;
        }

        // 3. Response timing analysis
        const timingRisk = this.analyzeResponseTiming(thresholdData);
        if (timingRisk > 0.3) {
            suspiciousFlags.push('Suspicious response timing');
            riskScore += timingRisk * 0.2;
        }

        // 4. Bilateral symmetry check
        const symmetryRisk = this.checkBilateralSymmetry(frequency, ear, thresholdData.threshold);
        if (symmetryRisk > 0.4) {
            suspiciousFlags.push('Unusual bilateral asymmetry');
            riskScore += symmetryRisk * 0.15;
        }

        // 5. Threshold progression analysis
        const progressionRisk = this.analyzeThresholdProgression(frequency, thresholdData.threshold);
        if (progressionRisk > 0.3) {
            suspiciousFlags.push('Atypical threshold progression');
            riskScore += progressionRisk * 0.1;
        }

        // Store risk assessment
        this.riskScores.set(key, {
            totalRisk: Math.min(1.0, riskScore),
            flags: suspiciousFlags,
            components: {
                consistency: consistencyRisk,
                crossFrequency: crossFreqRisk,
                timing: timingRisk,
                symmetry: symmetryRisk,
                progression: progressionRisk
            }
        });

        return this.riskScores.get(key);
    }

    checkThresholdConsistency(thresholdData) {
        // Low confidence suggests inconsistent responses
        if (thresholdData.confidence < 0.6) {
            return 0.4;
        }
        
        // Too few responses for reliable threshold
        if (thresholdData.responses < 6) {
            return 0.3;
        }

        return 0;
    }

    analyzeCrossFrequencyPattern(frequency, ear, threshold) {
        const earData = this.responseHistory.filter(r => r.ear === ear);
        if (earData.length < 2) return 0;

        // Check for flat audiogram (suspicious if all thresholds are identical)
        const thresholds = earData.map(r => r.threshold);
        const uniqueThresholds = new Set(thresholds);
        
        if (uniqueThresholds.size === 1 && thresholds.length > 3) {
            return 0.8; // Very suspicious - perfectly flat audiogram
        }

        // Check for unrealistic threshold differences between adjacent frequencies
        const adjacentFreqs = this.getAdjacentFrequencies(frequency);
        let maxDifference = 0;
        
        adjacentFreqs.forEach(adjFreq => {
            const adjData = earData.find(r => r.frequency === adjFreq);
            if (adjData) {
                const difference = Math.abs(threshold - adjData.threshold);
                maxDifference = Math.max(maxDifference, difference);
            }
        });

        if (maxDifference > 40) {
            return 0.6; // Suspicious large threshold difference
        }

        return 0;
    }

    analyzeResponseTiming(thresholdData) {
        // This would analyze reaction times if we had that data
        // For now, return low risk
        return 0;
    }

    checkBilateralSymmetry(frequency, ear, threshold) {
        const oppositeEar = ear === 'left' ? 'right' : 'left';
        const oppositeData = this.responseHistory.find(
            r => r.frequency === frequency && r.ear === oppositeEar
        );

        if (!oppositeData) return 0;

        const difference = Math.abs(threshold - oppositeData.threshold);
        
        // Suspicious if difference is too large (>40 dB) or too small (<5 dB for all frequencies)
        if (difference > 40) {
            return 0.5;
        }
        
        // Check if all bilateral differences are suspiciously small
        const bilateralDifferences = this.calculateAllBilateralDifferences();
        if (bilateralDifferences.length > 3 && bilateralDifferences.every(diff => diff < 5)) {
            return 0.4; // Suspiciously symmetric
        }

        return 0;
    }

    analyzeThresholdProgression(frequency, threshold) {
        // Check if thresholds follow expected patterns
        // For example, high-frequency hearing loss should show progression
        
        const allData = this.responseHistory.filter(r => r.ear === this.getCurrentEar());
        if (allData.length < 4) return 0;

        // Sort by frequency
        allData.sort((a, b) => a.frequency - b.frequency);
        
        // Check for unrealistic patterns (e.g., better hearing at 8000 Hz than 1000 Hz)
        const lowFreqAvg = this.getAverageThreshold([250, 500, 1000], allData);
        const highFreqAvg = this.getAverageThreshold([4000, 6000, 8000], allData);
        
        if (highFreqAvg < lowFreqAvg - 20) {
            return 0.5; // Suspicious - much better high-frequency hearing
        }

        return 0;
    }

    getAdjacentFrequencies(frequency) {
        const freqs = [125, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000];
        const index = freqs.indexOf(frequency);
        const adjacent = [];
        
        if (index > 0) adjacent.push(freqs[index - 1]);
        if (index < freqs.length - 1) adjacent.push(freqs[index + 1]);
        
        return adjacent;
    }

    calculateAllBilateralDifferences() {
        const differences = [];
        const frequencies = [...new Set(this.responseHistory.map(r => r.frequency))];
        
        frequencies.forEach(freq => {
            const leftData = this.responseHistory.find(r => r.frequency === freq && r.ear === 'left');
            const rightData = this.responseHistory.find(r => r.frequency === freq && r.ear === 'right');
            
            if (leftData && rightData) {
                differences.push(Math.abs(leftData.threshold - rightData.threshold));
            }
        });
        
        return differences;
    }

    getAverageThreshold(frequencies, data) {
        const relevantData = data.filter(r => frequencies.includes(r.frequency));
        if (relevantData.length === 0) return 0;
        
        return relevantData.reduce((sum, r) => sum + r.threshold, 0) / relevantData.length;
    }

    getCurrentEar() {
        if (this.responseHistory.length === 0) return 'left';
        return this.responseHistory[this.responseHistory.length - 1].ear;
    }

    getRiskScore(frequency, ear) {
        const key = `${ear}_${frequency}`;
        const riskData = this.riskScores.get(key);
        return riskData ? riskData.totalRisk : 0;
    }

    getFinalReport() {
        const overallRisk = this.calculateOverallRisk();
        const flaggedFrequencies = this.getFlaggedFrequencies();
        
        return {
            overallRisk,
            riskLevel: this.getRiskLevel(overallRisk),
            flaggedFrequencies,
            recommendations: this.generateRecommendations(overallRisk, flaggedFrequencies),
            detailedAnalysis: Object.fromEntries(this.riskScores)
        };
    }

    calculateOverallRisk() {
        if (this.riskScores.size === 0) return 0;
        
        const risks = Array.from(this.riskScores.values()).map(r => r.totalRisk);
        return risks.reduce((sum, risk) => sum + risk, 0) / risks.length;
    }

    getFlaggedFrequencies() {
        const flagged = [];
        
        this.riskScores.forEach((riskData, key) => {
            if (riskData.totalRisk > 0.4) {
                flagged.push({
                    frequency_ear: key,
                    risk: riskData.totalRisk,
                    flags: riskData.flags
                });
            }
        });
        
        return flagged;
    }

    getRiskLevel(risk) {
        if (risk < 0.2) return 'Low';
        if (risk < 0.4) return 'Moderate';
        if (risk < 0.6) return 'High';
        return 'Very High';
    }

    generateRecommendations(overallRisk, flaggedFrequencies) {
        const recommendations = [];
        
        if (overallRisk > 0.5) {
            recommendations.push('Consider retesting with different protocol');
            recommendations.push('Evaluate patient motivation and understanding');
        }
        
        if (flaggedFrequencies.length > 3) {
            recommendations.push('Results may not be reliable - consider referral');
        }
        
        if (overallRisk > 0.3) {
            recommendations.push('Document suspicious response patterns');
            recommendations.push('Consider objective testing methods');
        }
        
        return recommendations;
    }
}