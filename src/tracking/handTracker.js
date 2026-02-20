/** Hand Tracker — MediaPipe Hands integration */

import { CONFIG } from '../game/config.js';

const { CANVAS_HEIGHT, PADDLE_HEIGHT } = CONFIG;

class HandTracker {
  constructor() {
    this.position = { x: 0, y: CANVAS_HEIGHT / 2, detected: false };
    this.rawPosition = { x: 0, y: 0 };
    this.hands = null;
    this.camera = null;
    this.running = false;
    this.onDetectionChange = null;
    this.alpha = CONFIG.SMOOTHING_ALPHA;
  }

  /** Initialize MediaPipe Hands and start webcam */
  async init(videoElement) {
    // Load MediaPipe scripts dynamically
    await this._loadScripts();

    /* global Hands, Camera */
    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results) => this._onResults(results));

    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this.running) {
          await this.hands.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480,
    });
  }

  /** Start tracking */
  async start() {
    this.running = true;
    await this.camera.start();
  }

  /** Stop tracking */
  stop() {
    this.running = false;
    if (this.camera) {
      this.camera.stop();
    }
  }

  /** Process hand detection results */
  _onResults(results) {
    const wasDetected = this.position.detected;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      // Landmark 9 = middle finger MCP (palm center)
      const palmCenter = landmarks[9];

      // MediaPipe gives normalized coords (0-1), mirror X
      this.rawPosition.x = 1 - palmCenter.x;
      this.rawPosition.y = palmCenter.y;

      // Map to canvas coordinates
      const targetY = this.rawPosition.y * CANVAS_HEIGHT;

      // Exponential smoothing
      this.position.y = this.position.y + this.alpha * (targetY - this.position.y);
      this.position.detected = true;

      // Clamp to paddle bounds
      const halfH = PADDLE_HEIGHT / 2;
      this.position.y = Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, this.position.y));
    } else {
      this.position.detected = false;
    }

    // Notify on detection change
    if (wasDetected !== this.position.detected && this.onDetectionChange) {
      this.onDetectionChange(this.position.detected);
    }
  }

  /** Dynamically load MediaPipe scripts from CDN */
  async _loadScripts() {
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
    ];

    for (const src of scripts) {
      await new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  }

  /** Get current smoothed position */
  getPosition() {
    return { ...this.position };
  }
}

export const handTracker = new HandTracker();
