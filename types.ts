
import type { LiveServerMessage, CloseEvent, ErrorEvent } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GroundingChunk {
    web?: {
        uri: string;
        title: string;
    };
    maps?: {
        uri: string;
        title: string;
    };
}

export interface GroundingOptions {
    thinking: boolean;
    search: boolean;
    maps: boolean;
}

export interface UserLocation {
    latitude: number;
    longitude: number;
}

export interface VideoImagePayload {
    data: string;
    mimeType: string;
}

// Live API types
export interface LiveSession {
    close: () => void;
}

export interface StreamRefs {
    audioContext: AudioContext;
    scriptProcessor: ScriptProcessorNode;
    mediaStreamSource: MediaStreamAudioSourceNode;
}

export interface LiveSessionCallbacks {
    onOpen: () => void;
    onMessage: (message: LiveServerMessage) => void;
    onError: (e: ErrorEvent) => void;
    onClose: (e: CloseEvent) => void;
    onStream: (stream: StreamRefs) => void;
}

export interface TranscriptionEntry {
    role: 'user' | 'model';
    text: string;
    isFinal: boolean;
}
