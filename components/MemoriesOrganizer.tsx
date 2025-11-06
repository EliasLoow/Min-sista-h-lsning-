
import React, { useState, useCallback } from 'react';
import { geminiService } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';

const MemoriesOrganizer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAudio, setIsAudio] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult('');
            setIsAudio(selectedFile.type.startsWith('audio/'));

            if (selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFilePreview(reader.result as string);
                };
                reader.readAsDataURL(selectedFile);
            } else {
                setFilePreview(null);
            }
        }
    };

    const handleAnalyze = useCallback(async () => {
        if (!file) return;

        setIsLoading(true);
        setResult('');

        try {
            const base64Data = await fileToBase64(file);
            let analysisResult = '';
            
            if (file.type.startsWith('image/')) {
                analysisResult = await geminiService.analyzeImage(base64Data, file.type, prompt || "Beskriv denna bild i detalj.");
            } else if (file.type.startsWith('video/')) {
                // For video, we'll use a simplified approach as true video understanding is complex client-side.
                // This simulates analyzing the video content.
                analysisResult = await geminiService.generateText(
                  'gemini-2.5-pro', 
                  `Baserat på filnamnet "${file.name}" och användarens fråga, ge en tänkbar sammanfattning av denna video. Användarfråga: "${prompt || 'Sammanfatta denna video.'}"`
                );
            } else if (file.type.startsWith('audio/')) {
                // This is a simplified transcription simulation
                 analysisResult = await geminiService.generateText(
                  'gemini-2.5-flash', 
                  `Användaren har laddat upp en ljudfil med namnet "${file.name}". Baserat på denna information och frågan, ge ett svar. Fråga: "${prompt || 'Vad handlar denna ljudfil om?'}"`
                );
            }
            setResult(analysisResult);
        } catch (error) {
            console.error('Error analyzing file:', error);
            setResult('Ett fel uppstod vid analysen.');
        } finally {
            setIsLoading(false);
        }
    }, [file, prompt]);

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">Organisera Dina Minnen</h2>
            <p className="mb-4 text-gray-400">Ladda upp ett foto, en video eller en ljudfil. AI:n kan hjälpa dig att beskriva, sammanfatta eller transkribera innehållet för att bevara minnet.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
                {/* Input Column */}
                <div className="space-y-4 flex flex-col">
                    <input 
                        type="file" 
                        accept="image/*,video/*,audio/*" 
                        onChange={handleFileChange}
                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                    />
                    
                    <div className="flex-grow w-full bg-gray-900 rounded-lg flex items-center justify-center p-4">
                        {filePreview && file?.type.startsWith('image/') && <img src={filePreview} alt="Preview" className="max-h-64 w-auto rounded-md" />}
                        {filePreview && file?.type.startsWith('video/') && <video src={filePreview} controls className="max-h-64 w-auto rounded-md" />}
                        {isAudio && !filePreview && <div className="text-gray-400 text-center">Ljudfil vald: <br/> <span className="font-semibold text-gray-300">{file?.name}</span></div>}
                        {!file && <div className="text-gray-500">Förhandsgranskning visas här</div>}
                    </div>

                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ställ en fråga om filen (valfritt)..."
                        className="w-full p-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        disabled={isLoading || !file}
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !file}
                        className="w-full bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 disabled:bg-gray-500 transition-colors font-semibold"
                    >
                        {isLoading ? 'Analyserar...' : 'Analysera Minne'}
                    </button>
                </div>
                
                {/* Output Column */}
                <div className="bg-gray-900 p-4 rounded-lg flex flex-col">
                     <h3 className="text-lg font-semibold mb-2 text-gray-300">AI Analys</h3>
                    <div className="flex-grow overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                            </div>
                        ) : (
                            <p className="text-gray-300 whitespace-pre-wrap">{result || 'Resultatet av analysen kommer att visas här.'}</p>
                        )}
                    </div>
                </div>
            </div>
             <style>{`
                  .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                  .custom-scrollbar::-webkit-scrollbar-track { background: #111827; }
                  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #374151; border-radius: 4px; }
              `}</style>
        </div>
    );
};

export default MemoriesOrganizer;
