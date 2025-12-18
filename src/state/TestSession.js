/**
 * Test Session State Management
 * Manages current test state and data persistence
 */
export class TestSession {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = null;
        this.endTime = null;
        this.status = 'ready'; // ready, active, paused, completed, cancelled
        
        this.patientInfo = {
            id: null,
            name: null,
            dateOfBirth: null,
            testDate: new Date().toISOString().split('T')[0]
        };
        
        this.testResults = {
            left: new Map(),
            right: new Map()
        };
        
        this.testParameters = {
            protocol: 'hughson-westlake',
            frequencies: [125, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000],
            calibration: new Map()
        };
        
        this.qualityMetrics = {
            reliability: 0,
            consistency: 0,
            malingeringRisk: 0,
            testDuration: 0
        };
        
        this.events = []; // Log of all test events
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    startNewTest(patientInfo = null) {
        this.startTime = new Date();
        this.status = 'active';
        
        if (patientInfo) {
            this.patientInfo = { ...this.patientInfo, ...patientInfo };
        }
        
        this.logEvent('test_started', {
            sessionId: this.sessionId,
            startTime: this.startTime,
            patientInfo: this.patientInfo
        });
        
        // Clear previous results
        this.testResults.left.clear();
        this.testResults.right.clear();
        this.events = [];
        
        console.log(`Test session started: ${this.sessionId}`);
    }

    updateThreshold(ear, frequency, thresholdData) {
        if (!['left', 'right'].includes(ear)) {
            throw new Error('Invalid ear specification');
        }
        
        this.testResults[ear].set(frequency, {
            threshold: thresholdData.threshold,
            confidence: thresholdData.confidence,
            responses: thresholdData.responses,
            malingeringRisk: thresholdData.malingeringRisk,
            timestamp: new Date()
        });
        
        this.logEvent('threshold_updated', {
            ear,
            frequency,
            threshold: thresholdData.threshold,
            confidence: thresholdData.confidence
        });
        
        // Update session storage
        this.saveToStorage();
    }

    getThreshold(ear, frequency) {
        return this.testResults[ear].get(frequency);
    }

    getAllThresholds() {
        const results = {};
        
        ['left', 'right'].forEach(ear => {
            results[ear] = {};
            this.testResults[ear].forEach((data, frequency) => {
                results[ear][frequency] = data;
            });
        });
        
        return results;
    }

    updateQualityMetrics(metrics) {
        this.qualityMetrics = { ...this.qualityMetrics, ...metrics };
        
        this.logEvent('quality_metrics_updated', {
            metrics: this.qualityMetrics
        });
    }

    completeTest() {
        this.endTime = new Date();
        this.status = 'completed';
        this.qualityMetrics.testDuration = this.endTime - this.startTime;
        
        this.logEvent('test_completed', {
            endTime: this.endTime,
            duration: this.qualityMetrics.testDuration,
            finalResults: this.getAllThresholds()
        });
        
        this.saveToStorage();
        
        console.log(`Test session completed: ${this.sessionId}`);
        return this.generateFinalReport();
    }

    cancelTest() {
        this.endTime = new Date();
        this.status = 'cancelled';
        
        this.logEvent('test_cancelled', {
            endTime: this.endTime,
            partialResults: this.getAllThresholds()
        });
        
        console.log(`Test session cancelled: ${this.sessionId}`);
    }

    pauseTest() {
        if (this.status === 'active') {
            this.status = 'paused';
            this.logEvent('test_paused', { timestamp: new Date() });
        }
    }

    resumeTest() {
        if (this.status === 'paused') {
            this.status = 'active';
            this.logEvent('test_resumed', { timestamp: new Date() });
        }
    }

    logEvent(eventType, data) {
        const event = {
            type: eventType,
            timestamp: new Date(),
            data: data || {}
        };
        
        this.events.push(event);
        
        // Dispatch event for UI updates
        document.dispatchEvent(new CustomEvent('session-event', {
            detail: event
        }));
    }

    generateFinalReport() {
        const report = {
            sessionInfo: {
                id: this.sessionId,
                startTime: this.startTime,
                endTime: this.endTime,
                duration: this.qualityMetrics.testDuration,
                status: this.status
            },
            patientInfo: this.patientInfo,
            testResults: this.getAllThresholds(),
            qualityMetrics: this.qualityMetrics,
            summary: this.generateSummary(),
            recommendations: this.generateRecommendations(),
            events: this.events
        };
        
        return report;
    }

    generateSummary() {
        const thresholds = this.getAllThresholds();
        const summary = {
            left: this.calculateEarSummary('left', thresholds.left),
            right: this.calculateEarSummary('right', thresholds.right),
            bilateral: this.calculateBilateralSummary(thresholds)
        };
        
        return summary;
    }

    calculateEarSummary(ear, thresholds) {
        const frequencies = Object.keys(thresholds).map(f => parseInt(f));
        if (frequencies.length === 0) return null;
        
        // Calculate Pure Tone Average (PTA) for speech frequencies
        const speechFreqs = [500, 1000, 2000].filter(f => thresholds[f]);
        const pta = speechFreqs.length > 0 
            ? Math.round(speechFreqs.reduce((sum, f) => sum + thresholds[f].threshold, 0) / speechFreqs.length)
            : null;
        
        // Classify hearing loss
        let classification = 'Normal';
        if (pta > 90) classification = 'Profound';
        else if (pta > 70) classification = 'Severe';
        else if (pta > 55) classification = 'Moderately Severe';
        else if (pta > 40) classification = 'Moderate';
        else if (pta > 25) classification = 'Mild';
        
        // Calculate average confidence
        const confidenceValues = Object.values(thresholds).map(t => t.confidence);
        const avgConfidence = confidenceValues.length > 0
            ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
            : 0;
        
        return {
            pta,
            classification,
            averageConfidence: Math.round(avgConfidence * 100),
            frequenciesTested: frequencies.length,
            thresholdRange: {
                min: Math.min(...Object.values(thresholds).map(t => t.threshold)),
                max: Math.max(...Object.values(thresholds).map(t => t.threshold))
            }
        };
    }

    calculateBilateralSummary(thresholds) {
        const leftSummary = this.calculateEarSummary('left', thresholds.left);
        const rightSummary = this.calculateEarSummary('right', thresholds.right);
        
        if (!leftSummary || !rightSummary) return null;
        
        const asymmetry = Math.abs(leftSummary.pta - rightSummary.pta);
        
        return {
            asymmetry,
            asymmetrySignificant: asymmetry > 15,
            bilateralPTA: Math.round((leftSummary.pta + rightSummary.pta) / 2),
            worseEar: leftSummary.pta > rightSummary.pta ? 'left' : 'right'
        };
    }

    generateRecommendations() {
        const recommendations = [];
        const summary = this.generateSummary();
        
        // Check reliability
        if (this.qualityMetrics.reliability < 0.7) {
            recommendations.push({
                type: 'reliability',
                priority: 'high',
                message: 'Test reliability is questionable. Consider retesting.'
            });
        }
        
        // Check malingering risk
        if (this.qualityMetrics.malingeringRisk > 0.5) {
            recommendations.push({
                type: 'malingering',
                priority: 'high',
                message: 'High risk of non-organic hearing loss detected. Consider objective testing.'
            });
        }
        
        // Check for significant hearing loss
        if (summary.bilateral && summary.bilateral.bilateralPTA > 25) {
            recommendations.push({
                type: 'hearing_loss',
                priority: 'medium',
                message: 'Hearing loss detected. Consider hearing aid evaluation.'
            });
        }
        
        // Check for asymmetry
        if (summary.bilateral && summary.bilateral.asymmetrySignificant) {
            recommendations.push({
                type: 'asymmetry',
                priority: 'high',
                message: 'Significant asymmetry detected. Consider medical referral.'
            });
        }
        
        return recommendations;
    }

    saveToStorage() {
        try {
            const sessionData = {
                sessionId: this.sessionId,
                startTime: this.startTime,
                endTime: this.endTime,
                status: this.status,
                patientInfo: this.patientInfo,
                testResults: this.getAllThresholds(),
                qualityMetrics: this.qualityMetrics,
                events: this.events.slice(-50) // Keep last 50 events
            };
            
            localStorage.setItem(`audiometer_session_${this.sessionId}`, JSON.stringify(sessionData));
            localStorage.setItem('audiometer_current_session', this.sessionId);
        } catch (error) {
            console.warn('Failed to save session to storage:', error);
        }
    }

    static loadFromStorage(sessionId) {
        try {
            const sessionData = localStorage.getItem(`audiometer_session_${sessionId}`);
            if (sessionData) {
                const data = JSON.parse(sessionData);
                const session = new TestSession();
                
                // Restore session data
                Object.assign(session, data);
                
                // Restore Maps
                session.testResults.left = new Map(Object.entries(data.testResults.left || {}));
                session.testResults.right = new Map(Object.entries(data.testResults.right || {}));
                
                return session;
            }
        } catch (error) {
            console.warn('Failed to load session from storage:', error);
        }
        
        return null;
    }

    static getCurrentSession() {
        const currentSessionId = localStorage.getItem('audiometer_current_session');
        if (currentSessionId) {
            return TestSession.loadFromStorage(currentSessionId);
        }
        return null;
    }

    exportData(format = 'json') {
        const report = this.generateFinalReport();
        
        switch (format) {
            case 'json':
                return JSON.stringify(report, null, 2);
            case 'csv':
                return this.convertToCSV(report);
            default:
                return report;
        }
    }

    convertToCSV(report) {
        const csvLines = [];
        
        // Header
        csvLines.push('Ear,Frequency,Threshold,Confidence,Malingering Risk');
        
        // Data rows
        ['left', 'right'].forEach(ear => {
            Object.entries(report.testResults[ear]).forEach(([frequency, data]) => {
                csvLines.push(`${ear},${frequency},${data.threshold},${data.confidence},${data.malingeringRisk}`);
            });
        });
        
        return csvLines.join('\n');
    }
}