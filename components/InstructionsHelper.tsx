
import React, { useState, useCallback, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import type { GroundingChunk } from '../types';

const InstructionsHelper: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [useThinkingMode, setUseThinkingMode] = useState(false);
    const [useGoogleSearch, setUseGoogleSearch] = useState(false);
    const [useGoogleMaps, setUseGoogleMaps] = useState(false);
    const [result, setResult] = useState('');
    const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    useEffect(() => {
        if (useGoogleMaps) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setUserLocation({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        });
                        setLocationError(null);
                    },
                    (error) => {
                        console.error("Geolocation error:", error);
                        setLocationError("Kunde inte hämta plats. Kartsökning kan vara mindre exakt.");
                    }
                );
            } else {
                setLocationError("Geopositionering stöds inte av din webbläsare.");
            }
        }
    }, [useGoogleMaps]);


    const handleSubmit = useCallback(async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setResult('');
        setGroundingChunks([]);

        try {
            const { text, chunks } = await geminiService.generateGroundedText(
                prompt,
                {
                    thinking: useThinkingMode,
                    search: useGoogleSearch,
                    maps: useGoogleMaps,
                },
                userLocation
            );
            setResult(text);
            if(chunks) setGroundingChunks(chunks);
        } catch (error) {
            console.error('Error generating instructions:', error);
            setResult('Ett fel uppstod. Försök igen.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, useThinkingMode, useGoogleSearch, useGoogleMaps, userLocation]);

    const renderChunk = (chunk: GroundingChunk, index: number) => {
        if (chunk.web) {
            return <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{chunk.web.title}</a>;
        }
        if (chunk.maps) {
            return <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{chunk.maps.title}</a>
        }
        return null;
    }

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">Hjälp med Instruktioner</h2>
            <p className="mb-4 text-gray-400">Använd AI för att formulera komplexa eller känsliga instruktioner. Aktivera "Thinking Mode" för svårare uppgifter, eller använd Google Search/Maps för att hämta aktuell information.</p>

            <div className="space-y-4 mb-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Skriv din fråga eller ditt utkast här... t.ex. 'Hjälp mig skriva en guide till mina efterlevande om hur de hanterar mina digitala konton och prenumerationer.'"
                    className="w-full p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 h-32"
                    disabled={isLoading}
                />
                <div className="flex flex-wrap gap-4 items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={useThinkingMode} onChange={() => setUseThinkingMode(!useThinkingMode)} className="form-checkbox h-5 w-5 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
                        <span>Thinking Mode</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={useGoogleSearch} onChange={() => setUseGoogleSearch(!useGoogleSearch)} className="form-checkbox h-5 w-5 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
                        <span>Google Search</span>
                    </label>
                     <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={useGoogleMaps} onChange={() => setUseGoogleMaps(!useGoogleMaps)} className="form-checkbox h-5 w-5 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
                        <span>Google Maps</span>
                    </label>
                </div>
                {locationError && useGoogleMaps && <p className="text-sm text-yellow-500">{locationError}</p>}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !prompt.trim()}
                    className="w-full bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 disabled:bg-gray-500 transition-colors font-semibold"
                >
                    {isLoading ? 'Bearbetar...' : 'Generera Text'}
                </button>
            </div>

            <div className="flex-grow bg-gray-900 p-4 rounded-lg overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                    </div>
                ) : (
                    <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-cyan-400 whitespace-pre-wrap">
                        {result}
                    </div>
                )}
                {groundingChunks.length > 0 && (
                    <div className="mt-6 border-t border-gray-700 pt-4">
                        <h4 className="font-semibold text-lg text-gray-300 mb-2">Källor:</h4>
                        <ul className="list-disc list-inside space-y-1">
                            {groundingChunks.map((chunk, index) => (
                                <li key={index}>{renderChunk(chunk, index)}</li>
                            ))}
                        </ul>
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

export default InstructionsHelper;
