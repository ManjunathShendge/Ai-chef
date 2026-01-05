
import React, { useState, useRef, useEffect } from 'react';
import { createLiveCookingSession, decodeAudioBuffer, decodeBase64, encodeBase64 } from '../services/geminiService';
import { LiveServerMessage } from '@google/genai';

interface ChatMessage {
  type: 'user' | 'ai';
  text: string;
}

type AssistantStatus = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking';

const KitchenAssistant: React.FC = () => {
  const [status, setStatus] = useState<AssistantStatus>('disconnected');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [visionEnabled, setVisionEnabled] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const logContainerRef = useRef<HTMLDivElement>(null);
  const thinkingTimeoutRef = useRef<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const appendToLog = (type: 'user' | 'ai', text: string) => {
    setChatLog(prev => {
      const last = prev[prev.length - 1];
      if (last && last.type === type && last.text === text) return prev;
      return [...prev, { type, text }];
    });
    
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const startVisionStream = () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    frameIntervalRef.current = window.setInterval(() => {
      if (!ctx || !videoRef.current || !sessionRef.current) return;
      
      canvasRef.current!.width = 320; // Lower res for latency
      canvasRef.current!.height = 240;
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
      
      canvasRef.current!.toBlob(
        async (blob) => {
          if (blob && sessionRef.current) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              sessionRef.current.sendRealtimeInput({
                media: { data: base64, mimeType: 'image/jpeg' }
              });
            };
            reader.readAsDataURL(blob);
          }
        },
        'image/jpeg',
        0.5
      );
    }, 1000); // Send 1 frame per second for context
  };

  const startSession = async () => {
    setStatus('connecting');
    setChatLog([]);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let videoStream: MediaStream | null = null;
      
      if (visionEnabled) {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
        }
      }
      
      const callbacks = {
        onopen: () => {
          setStatus('listening');
          const source = audioContextRef.current!.createMediaStreamSource(audioStream);
          const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
          
          processor.onaudioprocess = (e: any) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const pcmBase64 = encodeBase64(new Uint8Array(int16.buffer));
            
            if (sessionRef.current) {
                sessionRef.current.sendRealtimeInput({ 
                    media: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' } 
                });
            }
          };

          source.connect(processor);
          processor.connect(audioContextRef.current!.destination);
          
          if (visionEnabled) startVisionStream();
        },
        onmessage: async (message: LiveServerMessage) => {
          const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            setStatus('speaking');
            if (thinkingTimeoutRef.current) window.clearTimeout(thinkingTimeoutRef.current);

            const ctx = outputAudioContextRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const buffer = await decodeAudioBuffer(decodeBase64(audioData), ctx);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
            
            source.onended = () => {
              sourcesRef.current.delete(source);
              if (sourcesRef.current.size === 0) {
                setStatus('listening');
              }
            };
          }

          if (message.serverContent?.inputTranscription) {
            appendToLog('user', message.serverContent.inputTranscription.text);
            setStatus('thinking');
            thinkingTimeoutRef.current = window.setTimeout(() => setStatus('listening'), 5000);
          }
          if (message.serverContent?.outputTranscription) {
            appendToLog('ai', message.serverContent.outputTranscription.text);
          }

          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setStatus('listening');
          }
        },
        onerror: (e: any) => {
          console.error("Live Error:", e);
          stopSession();
        },
        onclose: () => {
          setStatus('disconnected');
          if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        }
      };

      sessionRef.current = await createLiveCookingSession(callbacks);
    } catch (err) {
      console.error(err);
      setStatus('disconnected');
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setStatus('disconnected');
  };

  const suggestedCommands = [
    { en: "Does this look done?", hi: "क्या यह पक गया है?", ta: "இது வெந்துவிட்டதா?" },
    { en: "Identify these ingredients", hi: "इन्हें पहचानें", ta: "இவற்றை அடையாளம் காணவும்" },
    { en: "How should I cut this?", hi: "इसे कैसे काटें?", ta: "இதை எப்படி வெட்டுவது?" },
    { en: "Is the pan hot enough?", hi: "क्या पैन पर्याप्त गर्म है?", ta: "பாத்திரம் சூடாக உள்ளதா?" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-[85vh] flex flex-col pb-32">
      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        
        {/* Assistant Status & Controls */}
        <div className="lg:w-2/5 flex flex-col items-center bg-white rounded-3xl p-6 border border-stone-200 shadow-sm h-fit sticky top-24">
          
          {/* Video Preview */}
          <div className="w-full aspect-video bg-stone-100 rounded-2xl overflow-hidden mb-6 relative border border-stone-200 shadow-inner group">
            {visionEnabled ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-black/50 px-2 py-1 rounded">Vision Active</span>
                </div>
                {status === 'thinking' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-300">
                <i className="fa-solid fa-camera-slash text-4xl mb-4" />
                <p className="text-xs font-medium px-8 text-center">Vision Mode is off. ChefGemini can't see your kitchen.</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-6">
             <button 
              onClick={() => setVisionEnabled(!visionEnabled)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                visionEnabled ? 'bg-orange-600 text-white border-orange-700' : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              <i className={`fa-solid ${visionEnabled ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              {visionEnabled ? 'Vision ON' : 'Vision OFF'}
            </button>
          </div>

          <div className={`w-28 h-28 rounded-full flex items-center justify-center relative transition-all duration-500 mb-6 ${
            status !== 'disconnected' ? 'bg-orange-50 scale-105 shadow-inner' : 'bg-stone-50'
          }`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center bg-white shadow-md text-2xl transition-colors duration-300 ${
              status === 'speaking' ? 'text-green-600' : 
              status === 'listening' ? 'text-orange-600' : 
              status === 'thinking' ? 'text-orange-400' : 'text-stone-300'
            }`}>
              <i className={`fa-solid ${
                status === 'disconnected' ? 'fa-microphone-slash' : 
                status === 'speaking' ? 'fa-volume-high animate-bounce' : 'fa-microphone'
              }`}></i>
            </div>
          </div>

          <h2 className="text-lg font-bold text-stone-800 mb-1 text-center">
            {status === 'disconnected' ? 'ChefGemini Assistant' : 
             status === 'thinking' ? 'Analyzing Scene...' : 
             status === 'speaking' ? 'ChefGemini explaining...' : 'Listening...'}
          </h2>

          <button
            onClick={status === 'disconnected' ? startSession : stopSession}
            disabled={status === 'connecting'}
            className={`w-full py-4 mt-6 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-3 ${
              status !== 'disconnected'
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {status === 'connecting' ? (
              <><i className="fa-solid fa-spinner animate-spin"></i><span>Linking...</span></>
            ) : (
              <>{status !== 'disconnected' ? 'End Cooking' : 'Start Session'}</>
            )}
          </button>
        </div>

        {/* Live Transcript & Suggestions */}
        <div className="lg:w-3/5 flex flex-col gap-6">
          
          <div className="bg-stone-900 rounded-3xl p-6 flex flex-col h-[450px] shadow-2xl overflow-hidden border border-stone-800">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-800">
              <span className="text-stone-500 text-[10px] font-bold uppercase tracking-widest">Vision-Powered Assistant</span>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${status !== 'disconnected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[10px] text-stone-600 font-bold uppercase">{status}</span>
              </div>
            </div>
            
            <div 
              ref={logContainerRef}
              className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-stone-700"
            >
              {chatLog.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-700 gap-4">
                  <div className="relative">
                    <i className="fa-solid fa-hat-chef text-5xl opacity-10"></i>
                    {visionEnabled && <i className="fa-solid fa-eye absolute -bottom-2 -right-2 text-xl opacity-20 text-orange-500 animate-pulse"></i>}
                  </div>
                  <p className="italic text-sm opacity-50">
                    {status === 'disconnected' ? 'Session inactive' : 'Try: "Hey, look at my ingredients"'}
                  </p>
                </div>
              ) : (
                chatLog.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                  >
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                      msg.type === 'user' 
                        ? 'bg-orange-600 text-white rounded-tr-none' 
                        : 'bg-stone-800 text-stone-200 rounded-tl-none border border-stone-700'
                    }`}>
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-stone-700 font-bold flex items-center gap-2 text-sm">
              <i className="fa-solid fa-camera-retro text-orange-600"></i>
              Ask about what I see
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedCommands.map((cmd, i) => (
                <div 
                  key={i} 
                  className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-1 hover:border-orange-300 transition-all cursor-default group"
                >
                  <div className="flex items-center gap-2 text-stone-800 text-sm font-semibold">
                    <i className="fa-solid fa-sparkles text-orange-200 group-hover:text-orange-400"></i>
                    <span>"{cmd.en}"</span>
                  </div>
                  <div className="text-[10px] text-stone-400 font-medium flex gap-4 pl-6">
                    <span className="italic">Hi: "{cmd.hi}"</span>
                    <span className="italic text-red-400">Ta: "{cmd.ta}"</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default KitchenAssistant;
