/**
 * Enhanced Audiogram Plotting Module
 * Renders audiogram charts with comprehensive confidence metrics and visual indicators
 */
export class AudiogramPlotter {
    constructor(containerId = 'audiogram-container') {
        this.containerId = containerId;
        this.canvas = null;
        this.ctx = null;
        this.width = 400;  // Reduced default size for viewport constraints
        this.height = 300; // Reduced default size for viewport constraints
        
        // Audiogram parameters
        this.frequencies = [125, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000];
        this.dbRange = { min: -10, max: 120 };
        
        // Plotting margins
        this.margins = { top: 50, right: 180, bottom: 80, left: 80 }; // Increased right margin for confidence legend
        
        // Colors (retro theme with confidence indicators)
        this.colors = {
            background: '#2a2a2a',
            grid: '#4a4a4a',
            leftEar: '#ff6b6b',
            rightEar: '#4ecdc4',
            confidence: '#ffd93d',
            text: '#ffffff',
            normalRange: '#666666',
            // Confidence level colors
            excellentConfidence: '#00ff00',    // Green - 90-100%
            goodConfidence: '#7fff00',        // Yellow-green - 80-89%
            moderateConfidence: '#ffff00',    // Yellow - 70-79%
            fairConfidence: '#ffa500',        // Orange - 60-69%
            poorConfidence: '#ff4500',        // Red-orange - 50-59%
            veryPoorConfidence: '#ff0000'     // Red - <50%
        };
        
        // Enhanced threshold data structure
        this.thresholdData = new Map(); // key -> ThresholdPoint object
        
        // Confidence visualization settings
        this.confidenceSettings = {
            showErrorBars: true,
            showOpacityGradient: true,
            showConfidenceColors: true,
            showReversalCount: true,
            showResponseCount: true,
            errorBarWidth: 8,
            symbolSize: 12
        };
    }

    /**
     * Enhanced threshold data structure
     * @typedef {Object} ThresholdPoint
     * @property {number} threshold - dB HL value
     * @property {number} confidence - Confidence score (0-100)
     * @property {number} originalConfidence - Original confidence before enhancement (0-1)
     * @property {number} reversals - Number of reversals during threshold search
     * @property {number} responses - Total number of responses collected
     * @property {number} responseConsistency - Response consistency score (0-1)
     * @property {Array} responsePattern - Pattern of responses at each level
     * @property {number} reactionTimeAvg - Average reaction time (ms)
     * @property {number} reactionTimeStd - Reaction time standard deviation
     * @property {Object} falseResponseAnalysis - False response detection results
     * @property {string} decisionBasis - How threshold was determined
     * @property {number} timestamp - When threshold was established
     * @property {number} testDuration - Time spent testing this frequency (ms)
     */

    initialize() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            throw new Error(`Container ${this.containerId} not found`);
        }

        // Create responsive canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.border = '2px solid #666';
        this.canvas.style.borderRadius = '8px';
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '100%';
        this.canvas.style.width = 'auto';
        this.canvas.style.height = 'auto';
        
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        // Set up responsive sizing
        this.setupResponsiveCanvas();
        
        // Initial draw
        this.drawAudiogramGrid();
        
        // Add resize listener for responsive behavior
        window.addEventListener('resize', () => this.handleResize());
    }

    setupResponsiveCanvas() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`AudiogramPlotter: Container '${this.containerId}' not found`);
            return;
        }
        
        // Get container dimensions
        const containerRect = container.getBoundingClientRect();
        let containerWidth = containerRect.width - 20; // Account for padding
        let containerHeight = containerRect.height - 20;
        
        // Fallback dimensions if container has no size
        if (containerWidth <= 0) containerWidth = 380;
        if (containerHeight <= 0) containerHeight = 280;
        
        // Calculate responsive dimensions while maintaining aspect ratio
        const aspectRatio = this.width / this.height;
        let canvasWidth = Math.min(containerWidth, this.width);
        let canvasHeight = canvasWidth / aspectRatio;
        
        // If height exceeds container, scale by height instead
        if (canvasHeight > containerHeight) {
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * aspectRatio;
        }
        
        // Set canvas dimensions
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        // Update internal dimensions for drawing calculations
        this.currentWidth = canvasWidth;
        this.currentHeight = canvasHeight;
        
        // Scale margins proportionally
        const scale = Math.min(canvasWidth / this.width, canvasHeight / this.height);
        this.scaledMargins = {
            top: this.margins.top * scale,
            right: this.margins.right * scale,
            bottom: this.margins.bottom * scale,
            left: this.margins.left * scale
        };
    }

    handleResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.setupResponsiveCanvas();
            this.drawAudiogramGrid();
            this.redrawAllThresholds();
        }, 100);
    }

    drawAudiogramGrid() {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        const width = this.currentWidth || this.canvas.width;
        const height = this.currentHeight || this.canvas.height;
        const margins = this.scaledMargins || this.margins;
        
        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, width, height);
        
        // Calculate plotting area using responsive dimensions
        const plotWidth = width - margins.left - margins.right;
        const plotHeight = height - margins.top - margins.bottom;
        
        // Draw grid
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        
        // Frequency lines (vertical)
        this.frequencies.forEach((freq, index) => {
            const x = margins.left + (index / (this.frequencies.length - 1)) * plotWidth;
            
            ctx.beginPath();
            ctx.moveTo(x, margins.top);
            ctx.lineTo(x, margins.top + plotHeight);
            ctx.stroke();
        });
        
        // dB HL lines (horizontal)
        for (let db = this.dbRange.min; db <= this.dbRange.max; db += 10) {
            const y = margins.top + ((db - this.dbRange.min) / (this.dbRange.max - this.dbRange.min)) * plotHeight;
            
            ctx.beginPath();
            ctx.moveTo(margins.left, y);
            ctx.lineTo(margins.left + plotWidth, y);
            ctx.stroke();
            
            // Highlight normal hearing range
            if (db >= -10 && db <= 25) {
                ctx.strokeStyle = this.colors.normalRange;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.strokeStyle = this.colors.grid;
                ctx.lineWidth = 1;
            }
        }
        
        // Draw labels
        this.drawLabels();
        
        // Draw legend
        this.drawLegend();
    }

    redrawAllThresholds() {
        if (!this.ctx) return;
        
        // Redraw the grid first
        this.drawAudiogramGrid();
        
        // Redraw all existing thresholds
        this.plotThresholds();
    }

    drawLabels() {
        const ctx = this.ctx;
        const width = this.currentWidth || this.canvas.width;
        const height = this.currentHeight || this.canvas.height;
        const margins = this.scaledMargins || this.margins;
        
        ctx.fillStyle = this.colors.text;
        ctx.font = '12px monospace'; // Slightly smaller for responsive layout
        ctx.textAlign = 'center';
        
        // Frequency labels
        this.frequencies.forEach((freq, index) => {
            const x = margins.left + (index / (this.frequencies.length - 1)) * (width - margins.left - margins.right);
            ctx.fillText(freq.toString(), x, height - margins.bottom + 20);
        });
        
        // dB HL labels
        ctx.textAlign = 'right';
        for (let db = this.dbRange.min; db <= this.dbRange.max; db += 20) {
            const y = margins.top + ((db - this.dbRange.min) / (this.dbRange.max - this.dbRange.min)) * (height - margins.top - margins.bottom);
            ctx.fillText(db.toString(), margins.left - 8, y + 4);
        }
        
        // Axis labels (responsive font size)
        ctx.textAlign = 'center';
        const axisFont = Math.max(10, Math.min(14, width / 40));
        ctx.font = `${axisFont}px monospace`;
        ctx.fillText('Frequency (Hz)', width / 2, height - 15);
        
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Hearing Level (dB HL)', 0, 0);
        ctx.restore();
        
        // Title (responsive font size)
        const titleFont = Math.max(12, Math.min(16, width / 30));
        ctx.font = `bold ${titleFont}px monospace`;
        ctx.fillText('AUDIOGRAM', width / 2, 25);
    }

    drawLegend() {
        const ctx = this.ctx;
        const width = this.currentWidth || this.canvas.width;
        const height = this.currentHeight || this.canvas.height;
        
        // Responsive legend positioning
        const legendWidth = Math.min(140, width * 0.25);
        const legendX = width - legendWidth - 10;
        const legendY = 50;
        
        // Legend background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(legendX - 10, legendY - 10, 160, 280);
        
        ctx.font = '11px monospace';
        let yOffset = 0;
        
        // Title
        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 12px monospace';
        ctx.fillText('LEGEND', legendX, legendY + yOffset);
        yOffset += 20;
        
        ctx.font = '11px monospace';
        
        // Ear symbols
        ctx.fillStyle = this.colors.leftEar;
        ctx.fillRect(legendX, legendY + yOffset, 15, 3);
        ctx.fillStyle = this.colors.text;
        ctx.fillText('● Left Ear', legendX + 20, legendY + yOffset + 8);
        yOffset += 18;
        
        ctx.fillStyle = this.colors.rightEar;
        ctx.fillRect(legendX, legendY + yOffset, 15, 3);
        ctx.fillStyle = this.colors.text;
        ctx.fillText('▲ Right Ear', legendX + 20, legendY + yOffset + 8);
        yOffset += 25;
        
        // Confidence levels
        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 11px monospace';
        ctx.fillText('CONFIDENCE', legendX, legendY + yOffset);
        yOffset += 15;
        
        ctx.font = '10px monospace';
        
        const confidenceLevels = [
            { range: '90-100%', color: this.colors.excellentConfidence, label: 'Excellent' },
            { range: '80-89%', color: this.colors.goodConfidence, label: 'Good' },
            { range: '70-79%', color: this.colors.moderateConfidence, label: 'Moderate' },
            { range: '60-69%', color: this.colors.fairConfidence, label: 'Fair' },
            { range: '50-59%', color: this.colors.poorConfidence, label: 'Poor' },
            { range: '<50%', color: this.colors.veryPoorConfidence, label: 'Very Poor' }
        ];
        
        confidenceLevels.forEach(level => {
            ctx.fillStyle = level.color;
            ctx.fillRect(legendX, legendY + yOffset, 12, 12);
            ctx.fillStyle = this.colors.text;
            ctx.fillText(`${level.range}`, legendX + 18, legendY + yOffset + 9);
            ctx.fillText(`${level.label}`, legendX + 70, legendY + yOffset + 9);
            yOffset += 15;
        });
        
        yOffset += 10;
        
        // Visual indicators
        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 11px monospace';
        ctx.fillText('INDICATORS', legendX, legendY + yOffset);
        yOffset += 15;
        
        ctx.font = '10px monospace';
        
        // Error bars
        ctx.strokeStyle = this.colors.confidence;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(legendX, legendY + yOffset + 5);
        ctx.lineTo(legendX + 12, legendY + yOffset + 5);
        ctx.moveTo(legendX + 6, legendY + yOffset + 2);
        ctx.lineTo(legendX + 6, legendY + yOffset + 8);
        ctx.stroke();
        ctx.fillStyle = this.colors.text;
        ctx.fillText('Error Bars', legendX + 18, legendY + yOffset + 9);
        yOffset += 15;
        
        // Opacity
        ctx.fillStyle = this.colors.leftEar;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(legendX, legendY + yOffset, 12, 12);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = this.colors.text;
        ctx.fillText('Low Confidence', legendX + 18, legendY + yOffset + 9);
        yOffset += 15;
        
        // Normal range
        ctx.fillStyle = this.colors.normalRange;
        ctx.fillRect(legendX, legendY + yOffset, 15, 3);
        ctx.fillStyle = this.colors.text;
        ctx.fillText('Normal Range', legendX + 20, legendY + yOffset + 8);
    }

    /**
     * Plot threshold immediately for real-time audiogram updates
     * @param {string} ear - 'left' or 'right'
     * @param {number} frequency - Frequency in Hz
     * @param {number} threshold - Threshold in dB HL
     * @param {number} confidence - Confidence percentage (0-100)
     * @param {Object} additionalData - Optional additional threshold data
     */
    plotThreshold(ear, frequency, threshold, confidence = 80, additionalData = {}) {
        const key = `${ear}_${frequency}`;
        
        // Create threshold point with defaults for real-time plotting
        const thresholdPoint = {
            // Core threshold data
            threshold: threshold,
            confidence: confidence,
            originalConfidence: confidence / 100,
            
            // Default values for real-time plotting
            reversals: additionalData.reversals || 0,
            responses: additionalData.responses || 3,
            responseConsistency: additionalData.responseConsistency || 0.8,
            responsePattern: additionalData.responsePattern || [],
            
            // Timing metrics (defaults)
            reactionTimeAvg: additionalData.reactionTimeAvg || 500,
            reactionTimeStd: additionalData.reactionTimeStd || 100,
            
            // Quality metrics
            falseResponseAnalysis: additionalData.falseResponseAnalysis || null,
            decisionBasis: additionalData.decisionBasis || 'Real-time update',
            
            // Metadata
            timestamp: Date.now(),
            testDuration: additionalData.testDuration || 0,
            
            // Visual properties
            opacity: this.calculateOpacity(confidence),
            color: this.getConfidenceColor(confidence),
            errorBarSize: this.calculateErrorBarSize(confidence)
        };
        
        this.thresholdData.set(key, thresholdPoint);
        
        console.log(`📊 Real-time plot: ${frequency} Hz (${ear}) = ${threshold} dB HL (${confidence}% confidence)`);
        
        // Immediate redraw for real-time updates
        this.redrawAudiogram();
        
        // Dispatch update event
        document.dispatchEvent(new CustomEvent('audiogram-updated', {
            detail: { ear, frequency, thresholdPoint, realTime: true }
        }));
        
        return thresholdPoint;
    }

    /**
     * Update threshold with comprehensive confidence metrics
     * @param {string} ear - 'left' or 'right'
     * @param {number} frequency - Frequency in Hz
     * @param {Object} thresholdData - Enhanced threshold data
     */
    updateThreshold(ear, frequency, thresholdData) {
        const key = `${ear}_${frequency}`;
        
        // Create comprehensive threshold point
        const thresholdPoint = {
            // Core threshold data
            threshold: thresholdData.threshold,
            confidence: thresholdData.enhancedConfidence || Math.round((thresholdData.confidence || 0.5) * 100),
            originalConfidence: thresholdData.confidence || 0.5,
            
            // Test procedure metrics
            reversals: this.calculateReversals(thresholdData.responsePattern || []),
            responses: thresholdData.responses || 0,
            responseConsistency: this.calculateResponseConsistency(thresholdData.responsePattern || []),
            responsePattern: thresholdData.responsePattern || [],
            
            // Timing metrics
            reactionTimeAvg: this.calculateAverageReactionTime(thresholdData.responsePattern || []),
            reactionTimeStd: this.calculateReactionTimeStd(thresholdData.responsePattern || []),
            
            // Quality metrics
            falseResponseAnalysis: thresholdData.falseResponseAnalysis || null,
            decisionBasis: thresholdData.decisionBasis || 'Standard procedure',
            
            // Metadata
            timestamp: Date.now(),
            testDuration: thresholdData.testDuration || 0,
            
            // Visual properties (calculated)
            opacity: this.calculateOpacity(thresholdData.enhancedConfidence || Math.round((thresholdData.confidence || 0.5) * 100)),
            color: this.getConfidenceColor(thresholdData.enhancedConfidence || Math.round((thresholdData.confidence || 0.5) * 100)),
            errorBarSize: this.calculateErrorBarSize(thresholdData.enhancedConfidence || Math.round((thresholdData.confidence || 0.5) * 100))
        };
        
        this.thresholdData.set(key, thresholdPoint);
        
        console.log(`📊 Updated threshold: ${frequency} Hz (${ear}) = ${thresholdPoint.threshold} dB HL (${thresholdPoint.confidence}% confidence)`);
        
        this.redrawAudiogram();
        
        // Dispatch update event with detailed information
        document.dispatchEvent(new CustomEvent('audiogram-updated', {
            detail: { ear, frequency, thresholdPoint }
        }));
    }

    /**
     * Calculate number of reversals from response pattern
     */
    calculateReversals(responsePattern) {
        if (!responsePattern || responsePattern.length < 2) return 0;
        
        let reversals = 0;
        let lastDirection = null;
        
        for (let i = 1; i < responsePattern.length; i++) {
            const currentLevel = responsePattern[i].level;
            const previousLevel = responsePattern[i - 1].level;
            
            if (currentLevel !== previousLevel) {
                const direction = currentLevel > previousLevel ? 'up' : 'down';
                
                if (lastDirection && lastDirection !== direction) {
                    reversals++;
                }
                
                lastDirection = direction;
            }
        }
        
        return reversals;
    }

    /**
     * Calculate response consistency from pattern
     */
    calculateResponseConsistency(responsePattern) {
        if (!responsePattern || responsePattern.length < 3) return 0.5;
        
        // Group responses by level
        const levelGroups = {};
        responsePattern.forEach(r => {
            const level = Math.round(r.level / 5) * 5; // 5 dB bins
            if (!levelGroups[level]) {
                levelGroups[level] = [];
            }
            levelGroups[level].push(r.response === 'Y' || r.response === true);
        });
        
        // Calculate consistency within each level group
        let totalConsistency = 0;
        let groupCount = 0;
        
        for (const responses of Object.values(levelGroups)) {
            if (responses.length >= 2) {
                const positiveCount = responses.filter(r => r).length;
                const consistency = Math.max(positiveCount, responses.length - positiveCount) / responses.length;
                totalConsistency += consistency;
                groupCount++;
            }
        }
        
        return groupCount > 0 ? totalConsistency / groupCount : 0.5;
    }

    /**
     * Calculate average reaction time from response pattern
     */
    calculateAverageReactionTime(responsePattern) {
        if (!responsePattern || responsePattern.length === 0) return null;
        
        const reactionTimes = responsePattern
            .filter(r => r.reactionTime && r.reactionTime > 0)
            .map(r => r.reactionTime);
        
        if (reactionTimes.length === 0) return null;
        
        return Math.round(reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length);
    }

    /**
     * Calculate reaction time standard deviation
     */
    calculateReactionTimeStd(responsePattern) {
        const avg = this.calculateAverageReactionTime(responsePattern);
        if (!avg) return null;
        
        const reactionTimes = responsePattern
            .filter(r => r.reactionTime && r.reactionTime > 0)
            .map(r => r.reactionTime);
        
        if (reactionTimes.length < 2) return null;
        
        const variance = reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - avg, 2), 0) / reactionTimes.length;
        return Math.round(Math.sqrt(variance));
    }

    /**
     * Calculate opacity based on confidence score
     */
    calculateOpacity(confidence) {
        // Map confidence (0-100) to opacity (0.3-1.0)
        return Math.max(0.3, Math.min(1.0, 0.3 + (confidence / 100) * 0.7));
    }

    /**
     * Get color based on confidence level
     */
    getConfidenceColor(confidence) {
        if (confidence >= 90) return this.colors.excellentConfidence;
        if (confidence >= 80) return this.colors.goodConfidence;
        if (confidence >= 70) return this.colors.moderateConfidence;
        if (confidence >= 60) return this.colors.fairConfidence;
        if (confidence >= 50) return this.colors.poorConfidence;
        return this.colors.veryPoorConfidence;
    }

    /**
     * Calculate error bar size based on confidence
     */
    calculateErrorBarSize(confidence) {
        // Map confidence (0-100) to error bar size (2-15 dB)
        const maxErrorBar = 15;
        const minErrorBar = 2;
        const errorBar = maxErrorBar - ((confidence / 100) * (maxErrorBar - minErrorBar));
        return Math.max(minErrorBar, Math.min(maxErrorBar, errorBar));
    }

    redrawAudiogram() {
        this.drawAudiogramGrid();
        this.drawConfidenceVisualization();
        this.plotThresholds();
        this.drawConfidenceStatistics();
    }

    plotThresholds() {
        const ctx = this.ctx;
        const width = this.currentWidth || this.canvas.width;
        const height = this.currentHeight || this.canvas.height;
        const margins = this.scaledMargins || this.margins;
        const plotWidth = width - margins.left - margins.right;
        const plotHeight = height - margins.top - margins.bottom;
        
        // Plot left ear
        this.plotEarData('left', this.colors.leftEar, '●');
        
        // Plot right ear
        this.plotEarData('right', this.colors.rightEar, '▲');
    }

    plotEarData(ear, baseColor, symbol) {
        const ctx = this.ctx;
        const width = this.currentWidth || this.canvas.width;
        const height = this.currentHeight || this.canvas.height;
        const margins = this.scaledMargins || this.margins;
        const plotWidth = width - margins.left - margins.right;
        const plotHeight = height - margins.top - margins.bottom;
        
        const points = [];
        
        // Collect points for this ear with enhanced data
        this.frequencies.forEach((freq, index) => {
            const key = `${ear}_${freq}`;
            const thresholdPoint = this.thresholdData.get(key);
            
            if (thresholdPoint) {
                const x = margins.left + (index / (this.frequencies.length - 1)) * plotWidth;
                const y = margins.top + ((thresholdPoint.threshold - this.dbRange.min) / (this.dbRange.max - this.dbRange.min)) * plotHeight;
                
                points.push({ 
                    x, y, 
                    freq, 
                    thresholdPoint,
                    index
                });
            }
        });
        
        // Draw connecting lines with confidence-based styling
        if (points.length > 1) {
            points.forEach((point, i) => {
                if (i < points.length - 1) {
                    const nextPoint = points[i + 1];
                    
                    // Use average confidence for line segment
                    const avgConfidence = (point.thresholdPoint.confidence + nextPoint.thresholdPoint.confidence) / 2;
                    const lineOpacity = this.calculateOpacity(avgConfidence);
                    
                    ctx.strokeStyle = this.confidenceSettings.showConfidenceColors 
                        ? this.getConfidenceColor(avgConfidence)
                        : baseColor;
                    ctx.globalAlpha = this.confidenceSettings.showOpacityGradient ? lineOpacity : 1.0;
                    ctx.lineWidth = 2;
                    
                    ctx.beginPath();
                    ctx.moveTo(point.x, point.y);
                    ctx.lineTo(nextPoint.x, nextPoint.y);
                    ctx.stroke();
                }
            });
            
            ctx.globalAlpha = 1.0; // Reset alpha
        }
        
        // Draw error bars first (behind symbols)
        if (this.confidenceSettings.showErrorBars) {
            points.forEach(point => {
                this.drawErrorBars(ctx, point.x, point.y, point.thresholdPoint);
            });
        }
        
        // Draw symbols with confidence-based styling
        points.forEach(point => {
            this.drawEnhancedSymbol(ctx, point.x, point.y, symbol, baseColor, point.thresholdPoint);
            
            // Draw threshold value with confidence indicator
            this.drawThresholdLabel(ctx, point.x, point.y, point.thresholdPoint);
            
            // Draw additional metrics if enabled
            if (this.confidenceSettings.showReversalCount || this.confidenceSettings.showResponseCount) {
                this.drawMetricsLabel(ctx, point.x, point.y, point.thresholdPoint);
            }
        });
    }

    /**
     * Draw error bars based on confidence level
     */
    drawErrorBars(ctx, x, y, thresholdPoint) {
        const errorBarSize = thresholdPoint.errorBarSize;
        const height = this.currentHeight || this.canvas.height;
        const margins = this.scaledMargins || this.margins;
        const plotHeight = height - margins.top - margins.bottom;
        const errorBarPixels = (errorBarSize / (this.dbRange.max - this.dbRange.min)) * plotHeight;
        
        ctx.strokeStyle = this.colors.confidence;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        
        // Vertical error bar
        ctx.beginPath();
        ctx.moveTo(x, y - errorBarPixels / 2);
        ctx.lineTo(x, y + errorBarPixels / 2);
        ctx.stroke();
        
        // Horizontal caps
        const capWidth = this.confidenceSettings.errorBarWidth;
        ctx.beginPath();
        ctx.moveTo(x - capWidth / 2, y - errorBarPixels / 2);
        ctx.lineTo(x + capWidth / 2, y - errorBarPixels / 2);
        ctx.moveTo(x - capWidth / 2, y + errorBarPixels / 2);
        ctx.lineTo(x + capWidth / 2, y + errorBarPixels / 2);
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw enhanced symbol with confidence-based styling
     */
    drawEnhancedSymbol(ctx, x, y, symbol, baseColor, thresholdPoint) {
        const symbolSize = this.confidenceSettings.symbolSize;
        
        // Set color based on confidence if enabled
        const symbolColor = this.confidenceSettings.showConfidenceColors 
            ? thresholdPoint.color 
            : baseColor;
        
        // Set opacity based on confidence if enabled
        const opacity = this.confidenceSettings.showOpacityGradient 
            ? thresholdPoint.opacity 
            : 1.0;
        
        ctx.fillStyle = symbolColor;
        ctx.globalAlpha = opacity;
        ctx.font = `${symbolSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(symbol, x, y + symbolSize / 3);
        
        // Add confidence ring around symbol
        if (thresholdPoint.confidence < 70) {
            ctx.strokeStyle = this.colors.confidence;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(x, y, symbolSize / 2 + 2, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw threshold label with confidence percentage
     */
    drawThresholdLabel(ctx, x, y, thresholdPoint) {
        ctx.fillStyle = this.colors.text;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        
        // Main threshold value
        ctx.fillText(thresholdPoint.threshold.toString(), x, y - 20);
        
        // Confidence percentage (smaller text)
        ctx.font = '8px monospace';
        ctx.fillStyle = thresholdPoint.color;
        ctx.fillText(`${thresholdPoint.confidence}%`, x, y - 10);
    }

    /**
     * Draw additional metrics (reversals, responses)
     */
    drawMetricsLabel(ctx, x, y, thresholdPoint) {
        ctx.font = '7px monospace';
        ctx.fillStyle = this.colors.text;
        ctx.textAlign = 'center';
        
        let yOffset = 15;
        
        if (this.confidenceSettings.showReversalCount && thresholdPoint.reversals > 0) {
            ctx.fillText(`R:${thresholdPoint.reversals}`, x, y + yOffset);
            yOffset += 10;
        }
        
        if (this.confidenceSettings.showResponseCount && thresholdPoint.responses > 0) {
            ctx.fillText(`N:${thresholdPoint.responses}`, x, y + yOffset);
        }
    }

    drawSymbol(ctx, x, y, symbol, color) {
        ctx.fillStyle = color;
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(symbol, x, y + 5);
    }

    /**
     * Draw enhanced confidence visualization
     */
    drawConfidenceVisualization() {
        if (!this.ctx || !this.canvas) {
            console.warn('Canvas not initialized for confidence visualization');
            return;
        }
        
        const ctx = this.ctx;
        const width = this.currentWidth || this.canvas.width || 400;
        const height = this.currentHeight || this.canvas.height || 300;
        const margins = this.scaledMargins || this.margins;
        
        if (!width || !height) {
            console.warn('Invalid canvas dimensions for confidence visualization');
            return;
        }
        
        const plotWidth = width - margins.left - margins.right;
        const plotHeight = height - margins.top - margins.bottom;
        
        // Draw confidence bands/regions
        ['left', 'right'].forEach(ear => {
            this.frequencies.forEach((freq, index) => {
                const key = `${ear}_${freq}`;
                const thresholdPoint = this.thresholdData.get(key);
                
                if (thresholdPoint) {
                    const x = margins.left + (index / (this.frequencies.length - 1)) * plotWidth;
                    const y = margins.top + ((thresholdPoint.threshold - this.dbRange.min) / (this.dbRange.max - this.dbRange.min)) * plotHeight;
                    
                    // Draw confidence region (uncertainty band)
                    const bandSize = thresholdPoint.errorBarSize;
                    const bandHeight = (bandSize / (this.dbRange.max - this.dbRange.min)) * plotHeight;
                    
                    ctx.fillStyle = thresholdPoint.color;
                    ctx.globalAlpha = 0.15;
                    ctx.fillRect(x - 12, y - bandHeight/2, 24, bandHeight);
                    
                    // Draw gradient confidence indicator
                    if (this.confidenceSettings.showOpacityGradient) {
                        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
                        gradient.addColorStop(0, thresholdPoint.color);
                        gradient.addColorStop(1, 'transparent');
                        
                        ctx.fillStyle = gradient;
                        ctx.globalAlpha = 0.3 * (thresholdPoint.confidence / 100);
                        ctx.beginPath();
                        ctx.arc(x, y, 20, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            });
        });
        
        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw confidence statistics panel
     */
    drawConfidenceStatistics() {
        const ctx = this.ctx;
        const statsX = 20;
        const statsY = this.height - 60;
        
        // Calculate overall statistics
        const stats = this.calculateConfidenceStatistics();
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(statsX - 10, statsY - 25, 300, 50);
        
        // Statistics text
        ctx.fillStyle = this.colors.text;
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        
        ctx.fillText(`Overall Confidence: ${stats.averageConfidence}%`, statsX, statsY - 10);
        ctx.fillText(`Reliable Measurements: ${stats.reliableCount}/${stats.totalCount}`, statsX, statsY + 5);
        ctx.fillText(`Test Quality: ${stats.qualityRating}`, statsX, statsY + 20);
        
        // Quality indicator
        const qualityColor = this.getConfidenceColor(stats.averageConfidence);
        ctx.fillStyle = qualityColor;
        ctx.fillRect(statsX + 200, statsY - 15, 15, 15);
    }

    /**
     * Calculate comprehensive confidence statistics
     */
    calculateConfidenceStatistics() {
        const allPoints = Array.from(this.thresholdData.values());
        
        if (allPoints.length === 0) {
            return {
                averageConfidence: 0,
                reliableCount: 0,
                totalCount: 0,
                qualityRating: 'No Data'
            };
        }
        
        const totalConfidence = allPoints.reduce((sum, point) => sum + point.confidence, 0);
        const averageConfidence = Math.round(totalConfidence / allPoints.length);
        
        const reliableCount = allPoints.filter(point => point.confidence >= 70).length;
        
        let qualityRating;
        if (averageConfidence >= 85) qualityRating = 'Excellent';
        else if (averageConfidence >= 75) qualityRating = 'Good';
        else if (averageConfidence >= 65) qualityRating = 'Acceptable';
        else if (averageConfidence >= 50) qualityRating = 'Questionable';
        else qualityRating = 'Poor';
        
        return {
            averageConfidence,
            reliableCount,
            totalCount: allPoints.length,
            qualityRating,
            confidenceDistribution: this.calculateConfidenceDistribution(allPoints)
        };
    }

    /**
     * Calculate confidence distribution
     */
    calculateConfidenceDistribution(points) {
        const distribution = {
            excellent: 0, // 90-100%
            good: 0,      // 80-89%
            moderate: 0,  // 70-79%
            fair: 0,      // 60-69%
            poor: 0,      // 50-59%
            veryPoor: 0   // <50%
        };
        
        points.forEach(point => {
            const confidence = point.confidence;
            if (confidence >= 90) distribution.excellent++;
            else if (confidence >= 80) distribution.good++;
            else if (confidence >= 70) distribution.moderate++;
            else if (confidence >= 60) distribution.fair++;
            else if (confidence >= 50) distribution.poor++;
            else distribution.veryPoor++;
        });
        
        return distribution;
    }

    /**
     * Export comprehensive audiogram data with confidence metrics
     */
    exportAudiogramData() {
        const enhancedData = {};
        
        this.thresholdData.forEach((thresholdPoint, key) => {
            enhancedData[key] = {
                // Core threshold data
                threshold: thresholdPoint.threshold,
                confidence: thresholdPoint.confidence,
                originalConfidence: thresholdPoint.originalConfidence,
                
                // Test procedure metrics
                reversals: thresholdPoint.reversals,
                responses: thresholdPoint.responses,
                responseConsistency: thresholdPoint.responseConsistency,
                
                // Timing metrics
                reactionTimeAvg: thresholdPoint.reactionTimeAvg,
                reactionTimeStd: thresholdPoint.reactionTimeStd,
                
                // Quality metrics
                decisionBasis: thresholdPoint.decisionBasis,
                testDuration: thresholdPoint.testDuration,
                
                // Visual properties
                opacity: thresholdPoint.opacity,
                errorBarSize: thresholdPoint.errorBarSize,
                
                // Metadata
                timestamp: thresholdPoint.timestamp
            };
        });
        
        return {
            thresholds: enhancedData,
            statistics: this.calculateConfidenceStatistics(),
            settings: this.confidenceSettings,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get detailed threshold information for a specific point
     */
    getThresholdDetails(ear, frequency) {
        const key = `${ear}_${frequency}`;
        const thresholdPoint = this.thresholdData.get(key);
        
        if (!thresholdPoint) return null;
        
        return {
            basic: {
                ear,
                frequency,
                threshold: thresholdPoint.threshold,
                confidence: thresholdPoint.confidence
            },
            procedure: {
                reversals: thresholdPoint.reversals,
                responses: thresholdPoint.responses,
                responseConsistency: Math.round(thresholdPoint.responseConsistency * 100),
                decisionBasis: thresholdPoint.decisionBasis
            },
            timing: {
                averageReactionTime: thresholdPoint.reactionTimeAvg,
                reactionTimeStd: thresholdPoint.reactionTimeStd,
                testDuration: thresholdPoint.testDuration
            },
            quality: {
                confidenceLevel: this.getConfidenceLevel(thresholdPoint.confidence),
                errorBarSize: Math.round(thresholdPoint.errorBarSize),
                reliability: thresholdPoint.confidence >= 70 ? 'Reliable' : 'Questionable'
            },
            visual: {
                color: thresholdPoint.color,
                opacity: Math.round(thresholdPoint.opacity * 100),
                symbol: ear === 'left' ? '●' : '▲'
            }
        };
    }

    /**
     * Get confidence level description
     */
    getConfidenceLevel(confidence) {
        if (confidence >= 90) return 'Excellent';
        if (confidence >= 80) return 'Good';
        if (confidence >= 70) return 'Moderate';
        if (confidence >= 60) return 'Fair';
        if (confidence >= 50) return 'Poor';
        return 'Very Poor';
    }

    /**
     * Toggle confidence visualization settings
     */
    toggleConfidenceVisualization(setting, value = null) {
        if (value !== null) {
            this.confidenceSettings[setting] = value;
        } else {
            this.confidenceSettings[setting] = !this.confidenceSettings[setting];
        }
        
        this.redrawAudiogram();
        
        console.log(`📊 Confidence visualization updated: ${setting} = ${this.confidenceSettings[setting]}`);
    }

    /**
     * Set confidence visualization mode
     */
    setVisualizationMode(mode) {
        switch (mode) {
            case 'full':
                this.confidenceSettings.showErrorBars = true;
                this.confidenceSettings.showOpacityGradient = true;
                this.confidenceSettings.showConfidenceColors = true;
                this.confidenceSettings.showReversalCount = true;
                this.confidenceSettings.showResponseCount = true;
                break;
                
            case 'minimal':
                this.confidenceSettings.showErrorBars = false;
                this.confidenceSettings.showOpacityGradient = true;
                this.confidenceSettings.showConfidenceColors = false;
                this.confidenceSettings.showReversalCount = false;
                this.confidenceSettings.showResponseCount = false;
                break;
                
            case 'standard':
                this.confidenceSettings.showErrorBars = true;
                this.confidenceSettings.showOpacityGradient = false;
                this.confidenceSettings.showConfidenceColors = false;
                this.confidenceSettings.showReversalCount = false;
                this.confidenceSettings.showResponseCount = false;
                break;
                
            case 'research':
                this.confidenceSettings.showErrorBars = true;
                this.confidenceSettings.showOpacityGradient = true;
                this.confidenceSettings.showConfidenceColors = true;
                this.confidenceSettings.showReversalCount = true;
                this.confidenceSettings.showResponseCount = true;
                break;
        }
        
        this.redrawAudiogram();
        console.log(`📊 Visualization mode set to: ${mode}`);
    }

    generateReport() {
        const report = {
            summary: this.generateSummary(),
            recommendations: this.generateRecommendations(),
            data: this.exportAudiogramData()
        };
        
        return report;
    }

    generateSummary() {
        const leftEarAvg = this.calculatePTA('left');
        const rightEarAvg = this.calculatePTA('right');
        
        return {
            leftEarPTA: leftEarAvg,
            rightEarPTA: rightEarAvg,
            hearingLossType: this.classifyHearingLoss(),
            asymmetry: Math.abs(leftEarAvg - rightEarAvg)
        };
    }

    calculatePTA(ear) {
        // Pure Tone Average (500, 1000, 2000 Hz)
        const ptaFreqs = [500, 1000, 2000];
        const thresholds = ptaFreqs.map(freq => {
            const key = `${ear}_${freq}`;
            return this.thresholdData.get(key) || 0;
        });
        
        return Math.round(thresholds.reduce((sum, t) => sum + t, 0) / thresholds.length);
    }

    classifyHearingLoss() {
        const leftPTA = this.calculatePTA('left');
        const rightPTA = this.calculatePTA('right');
        const avgPTA = (leftPTA + rightPTA) / 2;
        
        if (avgPTA <= 25) return 'Normal';
        if (avgPTA <= 40) return 'Mild';
        if (avgPTA <= 55) return 'Moderate';
        if (avgPTA <= 70) return 'Moderately Severe';
        if (avgPTA <= 90) return 'Severe';
        return 'Profound';
    }

    generateRecommendations() {
        const recommendations = [];
        const summary = this.generateSummary();
        const stats = this.calculateConfidenceStatistics();
        
        // Hearing loss recommendations
        if (summary.asymmetry > 15) {
            recommendations.push({
                type: 'medical',
                priority: 'high',
                message: 'Significant asymmetry detected - consider medical referral'
            });
        }
        
        if (summary.leftEarPTA > 25 || summary.rightEarPTA > 25) {
            recommendations.push({
                type: 'rehabilitation',
                priority: 'medium',
                message: 'Hearing loss detected - recommend hearing aid evaluation'
            });
        }
        
        // Confidence-based recommendations
        if (stats.averageConfidence < 50) {
            recommendations.push({
                type: 'reliability',
                priority: 'high',
                message: 'Very low overall confidence - results may not be reliable'
            });
        } else if (stats.averageConfidence < 70) {
            recommendations.push({
                type: 'reliability',
                priority: 'medium',
                message: 'Moderate confidence - consider additional validation'
            });
        }
        
        // Check for specific low-confidence measurements
        const lowConfidencePoints = Array.from(this.thresholdData.entries())
            .filter(([key, point]) => point.confidence < 60);
        
        if (lowConfidencePoints.length > 0) {
            const frequencies = lowConfidencePoints.map(([key, point]) => {
                const [ear, freq] = key.split('_');
                return `${freq} Hz (${ear})`;
            }).join(', ');
            
            recommendations.push({
                type: 'retest',
                priority: 'medium',
                message: `Low confidence at: ${frequencies} - consider retesting these frequencies`
            });
        }
        
        // Check for insufficient responses
        const insufficientResponsePoints = Array.from(this.thresholdData.values())
            .filter(point => point.responses < 6);
        
        if (insufficientResponsePoints.length > 2) {
            recommendations.push({
                type: 'procedure',
                priority: 'medium',
                message: 'Multiple frequencies with insufficient responses - extend testing time'
            });
        }
        
        // Check for high reaction time variability
        const highVariabilityPoints = Array.from(this.thresholdData.values())
            .filter(point => point.reactionTimeStd && point.reactionTimeStd > 200);
        
        if (highVariabilityPoints.length > 2) {
            recommendations.push({
                type: 'attention',
                priority: 'medium',
                message: 'High reaction time variability - check patient attention and understanding'
            });
        }
        
        // Overall quality assessment
        if (stats.qualityRating === 'Poor' || stats.qualityRating === 'Questionable') {
            recommendations.push({
                type: 'overall',
                priority: 'high',
                message: `Overall test quality is ${stats.qualityRating.toLowerCase()} - consider comprehensive retest`
            });
        }
        
        return recommendations;
    }
}