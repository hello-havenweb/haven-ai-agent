/**
 * Audio utilities for Gemini Live API and TTS
 * Live API requirements:
 * - Input: 16kHz 16-bit PCM little-endian
 * - Output: 24kHz 16-bit PCM little-endian
 */

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private onAudioChunk: ((base64Pcm: string) => void) | null = null;
  private onVolumeChange: ((volume: number) => void) | null = null;
  private animationFrameId: number | null = null;

  async start(
    onChunk: (base64Pcm: string) => void,
    onVolume?: (volume: number) => void
  ): Promise<void> {
    this.onAudioChunk = onChunk;
    this.onVolumeChange = onVolume || null;

    // Use 16kHz audio context for microphone input matching Gemini Live expectations
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true,
      },
    });

    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    // ScriptProcessor for real-time PCM chunk extraction (buffer size 4096 gives ~256ms per chunk at 16kHz)
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.onAudioChunk) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = this.floatTo16BitPCM(inputData);
      const base64 = this.arrayBufferToBase64(pcm16.buffer);
      this.onAudioChunk(base64);
    };

    this.source.connect(this.analyser);
    this.analyser.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.startVolumeMonitoring();
  }

  private startVolumeMonitoring() {
    if (!this.analyser || !this.onVolumeChange) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const checkVolume = () => {
      if (!this.analyser || !this.onVolumeChange) return;
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1, avg / 100);
      this.onVolumeChange(normalized);
      this.animationFrameId = requestAnimationFrame(checkVolume);
    };
    checkVolume();
  }

  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.onAudioChunk = null;
    this.onVolumeChange = null;
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onVolumeChange: ((volume: number) => void) | null = null;
  private animationFrameId: number | null = null;
  private onPlaybackStateChange: ((isPlaying: boolean) => void) | null = null;

  constructor(
    onVolume?: (volume: number) => void,
    onStateChange?: (isPlaying: boolean) => void
  ) {
    this.onVolumeChange = onVolume || null;
    this.onPlaybackStateChange = onStateChange || null;
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      // Output sample rate 24kHz for Gemini Live API audio
      this.audioContext = new AudioContextClass({ sampleRate: 24000 });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.audioContext.destination);
      this.startVolumeMonitoring();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  private startVolumeMonitoring() {
    if (!this.analyser || !this.onVolumeChange) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const checkVolume = () => {
      if (!this.analyser || !this.onVolumeChange) return;
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1, avg / 100);
      this.onVolumeChange(normalized);
      this.animationFrameId = requestAnimationFrame(checkVolume);
    };
    checkVolume();
  }

  playChunk(base64Pcm: string): void {
    const ctx = this.ensureContext();
    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Decode 16-bit PCM little endian into Float32
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser || ctx.destination);

    const currentTime = ctx.currentTime;
    const startTime = Math.max(currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    this.activeSources.push(source);
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(true);
    }

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      if (this.activeSources.length === 0 && this.onPlaybackStateChange) {
        this.onPlaybackStateChange(false);
      }
    };
  }

  stopAll(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // already stopped
      }
    }
    this.activeSources = [];
    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    }
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(false);
    }
    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  destroy(): void {
    this.stopAll();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
