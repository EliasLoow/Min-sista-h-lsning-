
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import type { LiveSession, TranscriptionEntry } from '../types';

const LiveAssistant: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [status, setStatus] = useState('Inaktiv');
  const sessionRef = useRef<LiveSession | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const addTranscription = (role: 'user' | 'model', text: string, isFinal: boolean) => {
    setTranscriptions(prev => {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry && lastEntry.role === role && !lastEntry.isFinal) {
            // Update last entry
            const newEntries = [...prev.slice(0, -1)];
            newEntries.push({ role, text: lastEntry.text + text, isFinal });
            return newEntries;
        } else {
             // Add new entry
             return [...prev, { role, text, isFinal }];
        }
    });
  };

  const finalizeLastTranscription = (role: 'user' | 'model') => {
      setTranscriptions(prev => {
          const lastEntry = prev[prev.length - 1];
          if (lastEntry && lastEntry.role === role && !lastEntry.isFinal) {
              return [...prev.slice(0, -1), { ...lastEntry, isFinal: true }];
          }
          return prev;
      })
  }

  const startSession = useCallback(async () => {
    if (isSessionActive) return;

    setStatus('Startar session...');
    setTranscriptions([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const newSession = await geminiService.startLiveSession({
        onOpen: () => setStatus('Ansluten. Börja prata...'),
        onMessage: (message) => {
          if (message.serverContent?.inputTranscription?.text) {
              addTranscription('user', message.serverContent.inputTranscription.text, false);
          }
          if (message.serverContent?.outputTranscription?.text) {
              addTranscription('model', message.serverContent.outputTranscription.text, false);
          }
          if (message.serverContent?.turnComplete) {
              finalizeLastTranscription('user');
              finalizeLastTranscription('model');
          }
        },
        onError: (e) => {
            console.error('Live session error:', e);
            setStatus(`Fel: ${e.type}`);
            stopSession();
        },
        onClose: () => {
            setStatus('Anslutning stängd.');
            setIsSessionActive(false);
        },
        onStream: (stream) => {
            audioContextRef.current = stream.audioContext;
            scriptProcessorRef.current = stream.scriptProcessor;
            mediaStreamSourceRef.current = stream.mediaStreamSource;
        }
      });
      sessionRef.current = newSession;
      setIsSessionActive(true);
    } catch (err) {
      console.error('Failed to start session:', err);
      setStatus('Kunde inte starta. Kontrollera mikrofonbehörigheter.');
    }
  }, [isSessionActive]);


  const stopSession = useCallback(() => {
    if (!isSessionActive) return;

    setStatus('Avslutar...');
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if(mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsSessionActive(false);
    setStatus('Inaktiv');
  }, [isSessionActive]);
  
  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      if (isSessionActive) {
        stopSession();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionActive]);

  return (
    <div className="flex flex-col h-[calc(100vh-250px)]">
      <h2 className="text-2xl font-bold mb-2 text-cyan-400">Live Assistent</h2>
      <p className="mb-4 text-gray-400">Prata direkt med din AI-assistent för att spela in meddelanden eller få hjälp i realtid. Klicka på "Starta Samtal" och börja prata.</p>
      
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={isSessionActive ? stopSession : startSession}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors w-48 text-center ${
            isSessionActive 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-cyan-600 hover:bg-cyan-700'
          }`}
        >
          {isSessionActive ? 'Avsluta Samtal' : 'Starta Samtal'}
        </button>
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isSessionActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-gray-300">{status}</span>
        </div>
      </div>

      <div className="flex-grow bg-gray-900 p-4 rounded-lg overflow-y-auto custom-scrollbar">
        {transcriptions.map((t, index) => (
          <div key={index} className={`mb-3 ${t.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block px-3 py-1 rounded-lg ${t.role === 'user' ? 'bg-gray-700 text-cyan-300' : 'bg-gray-700 text-gray-200'}`}>
                <strong>{t.role === 'user' ? 'Du' : 'Assistent'}:</strong> {t.text}
              </span>
          </div>
        ))}
        {transcriptions.length === 0 && (
          <div className="text-center text-gray-500 h-full flex items-center justify-center">
            Transkriptionen av ert samtal kommer att visas här.
          </div>
        )}
      </div>
      <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #374151; border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default LiveAssistant;
