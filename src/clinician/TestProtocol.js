/**
 * Test Protocol Module
 * Implements standard audiometric testing protocols with precise Hughson-Westlake rules
 */
export class TestProtocol {
    constructor() {
        this.protocols = {
            'hughson-westlake': {
                name: 'Hughson-Westlake Method',
                description: 'Standard clinical threshold procedure with 2/3 response rule',
                initialLevel: 40,           // Start at 40 dB HL
                stepUp: 10,                 // Increase by 10 dB on no response
                stepDown: 5,                // Decrease by 5 dB on response
                confirmationRule: '2of3',   // 2 out of 3 responses at same level
                maxLevel: 120,              // Safety limit
                minLevel: -10,              // Minimum testable level
                responseTimeout: 3000,      // 3 second response window
                frequencies: [1000, 2000, 4000, 500, 250, 8000], // Standard sequence
                earOrder: ['right', 'left'], // Right ear first
                familiarizationFreq: 1000,  // Familiarization frequency
                familiarizationLevel: 60    // Familiarization level
            },
            'modified-hughson-westlake': {
                name: 'Modified Hughson-Westlake',
                description: 'Extended frequency range with additional test points',
                initialLevel: 40,
                stepUp: 10,
                stepDown: 5,
                confirmationRule: '2of3',
                maxLevel: 120,
                minLevel: -10,
                responseTimeout: 3000,
                frequencies: [1000, 2000, 4000, 500, 250, 8000, 6000, 3000, 1500, 750, 125],
                earOrder: ['right', 'left'],
                familiarizationFreq: 1000,
                familiarizationLevel: 60
            },
            'screening': {
                name: 'Hearing Screening',
                description: 'Quick pass/fail screening at 25 dB HL',
                screeningLevel: 25,
                frequencies: [1000, 2000, 4000],
                earOrder: ['right', 'left'],
                responseTimeout: 2000
            },
            'bekesy': {
                name: 'Békésy Audiometry',
                description: 'Continuous threshold tracking',
                initialLevel: 40,
                stepSize: 2,
                trackingMode: 'continuous',
                frequencies: [500, 1000, 2000, 4000],
                responseTimeout: 1000
            }
        };
        
        this.currentProtocol = 'hughson-westlake';
    }

    /**
     * Set the active protocol
     */
    setProtocol(protocolName) {
        if (this.protocols[protocolName]) {
            this.currentProtocol = protocolName;
            console.log(`📋 Protocol set to: ${this.protocols[protocolName].name}`);
            return true;
        }
        console.warn(`❌ Unknown protocol: ${protocolName}`);
        return false;
    }

    /**
     * Get current protocol configuration
     */
    getCurrentProtocol() {
        return this.protocols[this.currentProtocol];
    }

    /**
     * Get protocol by name
     */
    getProtocol(protocolName) {
        return this.protocols[protocolName] || null;
    }

    /**
     * Get all available protocols
     */
    getAllProtocols() {
        return Object.keys(this.protocols).map(key => ({
            id: key,
            ...this.protocols[key]
        }));
    }

    /**
     * Get test sequence for specific ear
     */
    getTestSequence(ear = 'right') {
        const protocol = this.getCurrentProtocol();
        
        return {
            ear,
            frequencies: protocol.frequencies || [1000, 2000, 4000, 500, 250, 8000],
            startingLevel: protocol.initialLevel || 40,
            parameters: protocol
        };
    }

    /**
     * Get complete test plan for both ears
     */
    getFullTestPlan() {
        const protocol = this.getCurrentProtocol();
        const plan = {
            protocol: this.currentProtocol,
            name: protocol.name,
            ears: protocol.earOrder || ['right', 'left'],
            frequencies: protocol.frequencies || [1000, 2000, 4000, 500, 250, 8000],
            totalTests: (protocol.earOrder?.length || 2) * (protocol.frequencies?.length || 6),
            estimatedDuration: this.estimateTestDuration(),
            parameters: protocol
        };
        
        return plan;
    }

    /**
     * Estimate test duration in minutes
     */
    estimateTestDuration() {
        const protocol = this.getCurrentProtocol();
        const numEars = protocol.earOrder?.length || 2;
        const numFreqs = protocol.frequencies?.length || 6;
        
        // Estimate based on protocol type
        let avgTimePerFreq = 60; // seconds
        
        switch (this.currentProtocol) {
            case 'hughson-westlake':
            case 'modified-hughson-westlake':
                avgTimePerFreq = 45; // 45 seconds per frequency
                break;
            case 'screening':
                avgTimePerFreq = 15; // 15 seconds per frequency
                break;
            case 'bekesy':
                avgTimePerFreq = 90; // 90 seconds per frequency
                break;
        }
        
        const totalSeconds = numEars * numFreqs * avgTimePerFreq;
        return Math.round(totalSeconds / 60); // Convert to minutes
    }

    /**
     * Validate response according to protocol rules
     */
    validateResponse(response, context) {
        const protocol = this.getCurrentProtocol();
        
        const validation = {
            valid: typeof response === 'boolean',
            timestamp: Date.now(),
            context: context || {},
            protocol: this.currentProtocol
        };
        
        // Protocol-specific validation
        if (protocol.responseTimeout && context?.responseTime) {
            validation.timeoutExceeded = context.responseTime > protocol.responseTimeout;
        }
        
        return validation;
    }

    /**
     * Check if threshold is confirmed according to protocol rules
     */
    isThresholdConfirmed(responses, level) {
        const protocol = this.getCurrentProtocol();
        
        if (protocol.confirmationRule === '2of3') {
            // Count responses at this specific level
            const responsesAtLevel = responses.filter(r => r.level === level);
            
            if (responsesAtLevel.length >= 3) {
                const positiveResponses = responsesAtLevel.filter(r => r.response).length;
                return positiveResponses >= 2; // 2 out of 3 rule
            }
        }
        
        return false;
    }

    /**
     * Get next level according to protocol rules
     */
    getNextLevel(currentLevel, lastResponse, protocol = null) {
        const p = protocol || this.getCurrentProtocol();
        
        let nextLevel;
        
        if (lastResponse) {
            // Response detected - decrease level
            nextLevel = currentLevel - (p.stepDown || 5);
        } else {
            // No response - increase level
            nextLevel = currentLevel + (p.stepUp || 10);
        }
        
        // Apply safety limits
        const maxLevel = p.maxLevel || 120;
        const minLevel = p.minLevel || -10;
        
        return Math.max(minLevel, Math.min(maxLevel, nextLevel));
    }

    /**
     * Get familiarization parameters
     */
    getFamiliarizationParams() {
        const protocol = this.getCurrentProtocol();
        
        return {
            frequency: protocol.familiarizationFreq || 1000,
            level: protocol.familiarizationLevel || 60,
            ear: 'both',
            duration: 1000
        };
    }

    /**
     * Export protocol configuration
     */
    exportProtocol(protocolName = null) {
        const name = protocolName || this.currentProtocol;
        const protocol = this.protocols[name];
        
        if (!protocol) return null;
        
        return {
            name,
            ...protocol,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import custom protocol
     */
    importProtocol(protocolData) {
        if (!protocolData.name || !protocolData.frequencies) {
            throw new Error('Invalid protocol data: missing required fields');
        }
        
        const protocolId = protocolData.name.toLowerCase().replace(/\s+/g, '-');
        this.protocols[protocolId] = { ...protocolData };
        
        console.log(`📥 Imported protocol: ${protocolData.name}`);
        return protocolId;
    }
}