
import React, { useState, useCallback, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';

const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
);

const CreativeKeepsakes: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [imageResult, setImageResult] = useState<string | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [editedImageResult, setEditedImageResult] = useState<string | null>(null);
    const [isLoadingEdit, setIsLoadingEdit] = useState(false);
    
    const [videoPrompt, setVideoPrompt] = useState('');
    const [videoImageFile, setVideoImageFile] = useState<File | null>(null);
    const [videoImagePreview, setVideoImagePreview] = useState<string | null>(null);
    const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [videoResult, setVideoResult] = useState<string | null>(null);
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);
    const [videoStatus, setVideoStatus] = useState('');
    const [isApiKeySelected, setIsApiKeySelected] = useState(false);
    
    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsApiKeySelected(hasKey);
            }
        };
        checkKey();
    }, []);

    const handleSelectApiKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            // Assume selection is successful to avoid race condition
            setIsApiKeySelected(true); 
        }
    };

    const handleGenerateImage = useCallback(async () => {
        if (!prompt.trim()) return;
        setIsLoadingImage(true);
        setImageResult(null);
        try {
            const base64Image = await geminiService.generateImage(prompt, aspectRatio);
            setImageResult(`data:image/jpeg;base64,${base64Image}`);
        } catch (error) {
            console.error("Error generating image:", error);
            alert("Kunde inte generera bild. Försök igen.");
        } finally {
            setIsLoadingImage(false);
        }
    }, [prompt, aspectRatio]);
    
    const handleEditImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEditImageFile(file);
            setEditedImageResult(null);
            const reader = new FileReader();
            reader.onloadend = () => setEditImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleEditImage = useCallback(async () => {
        if (!editImageFile || !editPrompt.trim()) return;
        setIsLoadingEdit(true);
        setEditedImageResult(null);
        try {
            const base64Data = await fileToBase64(editImageFile);
            const result = await geminiService.editImage(base64Data, editImageFile.type, editPrompt);
            setEditedImageResult(`data:image/png;base64,${result}`);
        } catch (error) {
            console.error("Error editing image:", error);
            alert("Kunde inte redigera bild. Försök igen.");
        } finally {
            setIsLoadingEdit(false);
        }
    }, [editImageFile, editPrompt]);
    
    const handleVideoImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setVideoImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleGenerateVideo = useCallback(async () => {
        if (!videoPrompt.trim() && !videoImageFile) return;
        setIsLoadingVideo(true);
        setVideoResult(null);
        setVideoStatus("Startar videogenerering...");
        try {
            const imagePayload = videoImageFile ? {
                mimeType: videoImageFile.type,
                data: await fileToBase64(videoImageFile)
            } : undefined;
            
            const onStatusUpdate = (status: string) => setVideoStatus(status);

            const videoUrl = await geminiService.generateVideo(videoPrompt, videoAspectRatio, onStatusUpdate, imagePayload);
            setVideoResult(videoUrl);
            setVideoStatus("Video klar!");

        } catch (error: any) {
            console.error("Error generating video:", error);
            let errorMessage = "Kunde inte generera video. Försök igen.";
            if(error.message && error.message.includes("Requested entity was not found.")){
                errorMessage = "API-nyckeln hittades inte. Vänligen välj en nyckel igen.";
                setIsApiKeySelected(false);
            }
            alert(errorMessage);
            setVideoStatus("Fel uppstod.");
        } finally {
            setIsLoadingVideo(false);
        }
    }, [videoPrompt, videoImageFile, videoAspectRatio]);
    
    return (
        <div className="space-y-12">
            {/* Image Generation */}
            <section>
                <h3 className="text-xl font-semibold mb-3 text-cyan-400">Skapa ett minnesporträtt</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-4">
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Beskriv en bild du vill skapa, t.ex. 'ett vackert porträtt av en gammal man som tittar ut över havet i solnedgången'" className="w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 h-24" />
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md">
                            <option value="1:1">Kvadrat (1:1)</option>
                            <option value="16:9">Landskap (16:9)</option>
                            <option value="9:16">Porträtt (9:16)</option>
                            <option value="4:3">Standard (4:3)</option>
                            <option value="3:4">Standard porträtt (3:4)</option>
                        </select>
                        <button onClick={handleGenerateImage} disabled={isLoadingImage} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors">
                            {isLoadingImage ? 'Genererar...' : 'Skapa Bild'}
                        </button>
                    </div>
                    <div className="flex justify-center items-center bg-gray-900 rounded-md min-h-[256px]">
                        {isLoadingImage && <LoadingSpinner />}
                        {imageResult && <img src={imageResult} alt="Generated" className="max-w-full max-h-64 rounded-md" />}
                    </div>
                </div>
            </section>
            
            {/* Image Editing */}
            <section>
                <h3 className="text-xl font-semibold mb-3 text-cyan-400">Redigera ett foto</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                     <div className="space-y-4">
                        <input type="file" accept="image/*" onChange={handleEditImageFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" />
                        {editImagePreview && <img src={editImagePreview} alt="Preview" className="max-w-full max-h-48 rounded-md mx-auto" />}
                        <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="Beskriv ändringen, t.ex. 'lägg till ett retrofilter' eller 'ta bort personen i bakgrunden'" className="w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 h-24" />
                        <button onClick={handleEditImage} disabled={isLoadingEdit || !editImageFile} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors">
                            {isLoadingEdit ? 'Redigerar...' : 'Redigera Bild'}
                        </button>
                    </div>
                     <div className="flex justify-center items-center bg-gray-900 rounded-md min-h-[256px]">
                         {isLoadingEdit && <LoadingSpinner />}
                         {editedImageResult && <img src={editedImageResult} alt="Edited" className="max-w-full max-h-64 rounded-md" />}
                     </div>
                 </div>
            </section>

            {/* Video Generation */}
            <section>
                <h3 className="text-xl font-semibold mb-3 text-cyan-400">Skapa en minnesvideo</h3>
                {!isApiKeySelected ? (
                    <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">API-nyckel krävs!</strong>
                        <span className="block sm:inline"> För att generera video behöver du välja en API-nyckel. Detta kan medföra kostnader.</span>
                         <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline ml-1">Läs mer om prissättning</a>.
                        <button onClick={handleSelectApiKey} className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
                            Välj API-nyckel
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-4">
                            <textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} placeholder="Beskriv videon, t.ex. 'en kort film av en person som går längs en strand'" className="w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 h-24" />
                            <input type="file" accept="image/*" onChange={handleVideoImageFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" />
                            {videoImagePreview && <img src={videoImagePreview} alt="Video start" className="max-w-full max-h-32 rounded-md mx-auto" />}
                            <select value={videoAspectRatio} onChange={e => setVideoAspectRatio(e.target.value as '16:9' | '9:16')} className="w-full p-2 bg-gray-700 rounded-md">
                                <option value="16:9">Landskap (16:9)</option>
                                <option value="9:16">Porträtt (9:16)</option>
                            </select>
                            <button onClick={handleGenerateVideo} disabled={isLoadingVideo} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors">
                                {isLoadingVideo ? 'Genererar Video...' : 'Skapa Video'}
                            </button>
                        </div>
                        <div className="flex flex-col justify-center items-center bg-gray-900 rounded-md min-h-[256px]">
                            {isLoadingVideo && (
                                <div className="text-center">
                                    <LoadingSpinner />
                                    <p className="mt-4 text-cyan-300">{videoStatus}</p>
                                    <p className="mt-2 text-sm text-gray-400">Detta kan ta några minuter.</p>
                                </div>
                            )}
                            {videoResult && <video src={videoResult} controls className="max-w-full max-h-64 rounded-md" />}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default CreativeKeepsakes;
