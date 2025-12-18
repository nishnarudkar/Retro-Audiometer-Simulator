// Main application entry point
import { AudioGenerator } from './audio/AudioGenerator.js';
import { AIClinician } from './clinician/AIClinician.js';
import { AudiogramPlotter } from './audiogram/AudiogramPlotter.js';
import { RetroUI } from './ui/RetroUI.js';
import { TestSession } from './state/TestSession.js';

class RetroAudiometerApp {
    constructor() {
        this.audioEngine = new AudioGenerator();
        this.clinician = new AIClinician();
        this.audiogram = new AudiogramPlotter();
        this.ui = new RetroUI();
        this.session = new TestSession();
        
        this.init();
    }

    async init() {
        try {
            await this.audioEngine.initialize();
            this.setupEventListeners();
            this.ui.render();
            console.log('Retro Audiometer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize audiometer:', error);
        }
    }

    setupEventListeners() {
        // Patient response handling
        document.addEventListener('patient-response', (event) => {
            this.clinician.recordResponse(event.detail);
        });

        // Test control events
        document.addEventListener('start-test', () => {
            this.startAudiometricTest();
        });

        document.addEventListener('stop-test', () => {
            this.stopTest();
        });
    }

    async startAudiometricTest() {
        this.session.startNewTest();
        await this.clinician.beginProtocol(this.audioEngine, this.session);
    }

    stopTest() {
        this.clinician.stopTest();
        this.audioEngine.stopAllTones();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new RetroAudiometerApp();
});