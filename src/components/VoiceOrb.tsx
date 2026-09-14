import React, { useEffect, useRef } from 'react';
import { ConnectionStatus } from '../types';

interface VoiceOrbProps {
  status: ConnectionStatus;
  inputVolume: number; // 0 to 1
  outputVolume: number; // 0 to 1
  isMuted: boolean;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  status,
  inputVolume,
  outputVolume,
  isMuted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Determine active volume
      const activeVolume = status === 'speaking' ? outputVolume : (!isMuted ? inputVolume : 0);
      const scale = 1 + activeVolume * 0.45;

      phase += 0.04 + activeVolume * 0.08;

      // Base radius
      const baseRadius = 58 * scale;

      // Outer ambient glow rings
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.2,
        centerX,
        centerY,
        baseRadius * 2.2
      );

      if (status === 'speaking') {
        // Teal/cyan energetic glow for HAVEN AI speaking
        glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
        glowGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.25)');
        glowGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      } else if (status === 'listening' && !isMuted) {
        // Amber/gold glow when listening to visitor
        glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
        glowGrad.addColorStop(0.6, 'rgba(234, 88, 12, 0.2)');
        glowGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      } else if (status === 'connecting') {
        glowGrad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        glowGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
      } else {
        // Soft slate/indigo idle glow
        glowGrad.addColorStop(0, 'rgba(79, 70, 229, 0.18)');
        glowGrad.addColorStop(1, 'rgba(79, 70, 229, 0)');
      }

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic waveform perimeter lines
      const numPoints = 64;
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const theta = (i / numPoints) * Math.PI * 2;
        const wave1 = Math.sin(theta * 3 + phase) * (8 + activeVolume * 24);
        const wave2 = Math.cos(theta * 5 - phase * 1.3) * (5 + activeVolume * 16);
        const r = baseRadius + wave1 + wave2;
        const x = centerX + Math.cos(theta) * r;
        const y = centerY + Math.sin(theta) * r;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Fill main organic orb
      const orbGrad = ctx.createLinearGradient(
        centerX - baseRadius,
        centerY - baseRadius,
        centerX + baseRadius,
        centerY + baseRadius
      );

      if (status === 'speaking') {
        orbGrad.addColorStop(0, '#059669');
        orbGrad.addColorStop(0.5, '#0d9488');
        orbGrad.addColorStop(1, '#0284c7');
      } else if (status === 'listening' && !isMuted) {
        orbGrad.addColorStop(0, '#d97706');
        orbGrad.addColorStop(0.5, '#ea580c');
        orbGrad.addColorStop(1, '#c026d3');
      } else if (status === 'connecting') {
        orbGrad.addColorStop(0, '#4f46e5');
        orbGrad.addColorStop(1, '#7c3aed');
      } else {
        orbGrad.addColorStop(0, '#1e293b');
        orbGrad.addColorStop(1, '#334155');
      }

      ctx.fillStyle = orbGrad;
      ctx.fill();

      // Accent border
      ctx.lineWidth = 2 + activeVolume * 3;
      ctx.strokeStyle = status === 'speaking' ? '#6ee7b7' : (status === 'listening' && !isMuted ? '#fde047' : '#94a3b8');
      ctx.stroke();

      // Inner pulsating core
      ctx.beginPath();
      const innerRadius = (baseRadius * 0.45) + Math.sin(phase * 2) * 4;
      ctx.arc(centerX, centerY, Math.max(2, innerRadius), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [status, inputVolume, outputVolume, isMuted]);

  const getStatusLabel = () => {
    switch (status) {
      case 'speaking':
        return 'HAVEN Voice Agent Speaking';
      case 'listening':
        return isMuted ? 'Microphone Muted' : 'Listening to Visitor...';
      case 'connecting':
        return 'Connecting to Gemini Live...';
      case 'connected':
        return 'Live Voice Ready • Tap to Speak';
      case 'error':
        return 'Connection Error • Ready to Retry';
      default:
        return 'HAVEN AI Voice Agent • haven.pntr.dev';
    }
  };

  const getStatusBadgeColor = () => {
    switch (status) {
      case 'speaking':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'listening':
        return isMuted
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
          : 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 animate-pulse';
      case 'connecting':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
      case 'connected':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
    }
  };

  return (
    <div id="voice-orb-container" className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px]"
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          id="orb-status-badge"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor()}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'speaking'
                ? 'bg-emerald-500 animate-ping'
                : status === 'listening' && !isMuted
                ? 'bg-amber-500 animate-pulse'
                : status === 'connected'
                ? 'bg-blue-500'
                : 'bg-slate-400'
            }`}
          />
          {getStatusLabel()}
        </span>
      </div>
    </div>
  );
};
