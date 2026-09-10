import React, { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive || !stream) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioContextRef.current;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128; // 64 bins
    analyserRef.current = analyser;

    try {
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
    } catch (e) {
      console.error('[AudioVisualizer] Failed to connect stream:', e);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvasCtx = canvas.getContext('2d')!;

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const W = canvas.width;
      const H = canvas.height;
      const centerX = W / 2;
      const centerY = H / 2;
      const baseRadius = 60; // Base size of the circle
      
      canvasCtx.clearRect(0, 0, W, H);

      // Accent color #5B7FDB
      canvasCtx.strokeStyle = '#5B7FDB';
      canvasCtx.lineWidth = 3;
      canvasCtx.shadowBlur = 15;
      canvasCtx.shadowColor = 'rgba(91, 127, 219, 0.8)';
      
      canvasCtx.beginPath();
      
      // Draw circular visualizer
      const points = 64;
      const angleStep = (Math.PI * 2) / points;
      
      for (let i = 0; i <= points; i++) {
        // Wrap around at the end
        const dataIdx = i === points ? 0 : i;
        const val = dataArray[dataIdx] / 255.0;
        
        // Boost the visual effect slightly
        const spike = val * 50; 
        const r = baseRadius + spike;
        
        const angle = i * angleStep - Math.PI / 2; // Start at top
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
      }
      
      canvasCtx.closePath();
      canvasCtx.stroke();
      
      // Draw inner glowing circle
      canvasCtx.beginPath();
      canvasCtx.arc(centerX, centerY, baseRadius - 5, 0, Math.PI * 2);
      canvasCtx.fillStyle = 'rgba(91, 127, 219, 0.15)';
      canvasCtx.fill();
    };

    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
    };
  }, [stream, isActive]);

  return (
    <div className="flex flex-col items-center justify-center py-6 w-full relative">
      <div className="relative flex items-center justify-center w-64 h-64">
        {/* Background ambient glow pulse when active */}
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-accent/10 blur-3xl animate-pulse-slow" />
        )}
        
        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          className="absolute inset-0 z-10 w-full h-full"
        />
        
        {/* Center Icon */}
        <div className="relative z-20 flex items-center justify-center w-24 h-24 rounded-full bg-bg-surface border-2 border-accent shadow-[0_0_20px_rgba(91,127,219,0.3)]">
          {isActive ? (
            <Mic className="w-8 h-8 text-accent animate-pulse" />
          ) : (
            <MicOff className="w-8 h-8 text-text-muted" />
          )}
        </div>
      </div>
      <p className="mt-4 text-xs font-bold tracking-widest text-accent uppercase">
        {isActive ? 'OpsEcho Observer Active' : 'Observer Standby'}
      </p>
    </div>
  );
};

export default AudioVisualizer;
