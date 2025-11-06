
import { GoogleGenAI, Chat, GenerateContentResponse, Modality, Type } from "@google/genai";
import type { LiveSession, LiveSessionCallbacks, GroundingOptions, UserLocation, VideoImagePayload } from '../types';
import { decode, encode } from '../utils/helpers';


// Ensure the environment variable is handled gracefully if not set.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Some features may not work.");
}

const getAiClient = () => new GoogleGenAI({ apiKey: API_KEY! });


const geminiService = {
  // === Text & Chat ===
  async generateText(model: string, prompt: string): Promise<string> {
    const ai = getAiClient();
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      return response.text;
    } catch (error) {
      console.error(`Error generating text with ${model}:`, error);
      throw error;
    }
  },

  async generateGroundedText(prompt: string, options: GroundingOptions, location: UserLocation | null) {
    const ai = getAiClient();
    const tools: any[] = [];
    if (options.search) tools.push({ googleSearch: {} });
    if (options.maps) tools.push({ googleMaps: {} });

    const config: any = {
      tools,
    };
    if (options.thinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const toolConfig: any = {};
    if (options.maps && location) {
        toolConfig.retrievalConfig = {
            latLng: {
                latitude: location.latitude,
                longitude: location.longitude,
            }
        }
    }

    try {
      const response = await ai.models.generateContent({
        model: options.thinking ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
        contents: prompt,
        config,
        ...(Object.keys(toolConfig).length > 0 && { toolConfig }),
      });
      return {
          text: response.text,
          chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error) {
      console.error('Error with grounded text generation:', error);
      throw error;
    }
  },

  startChat(model: string, systemInstruction: string): Chat {
    const ai = getAiClient();
    return ai.chats.create({
      model,
      config: { systemInstruction },
    });
  },

  async sendMessageStream(chat: Chat, message: string): Promise<AsyncGenerator<string>> {
    const stream = await chat.sendMessageStream({ message });
    async function* generator() {
      for await (const chunk of stream) {
        yield chunk.text;
      }
    }
    return generator();
  },

  // === Vision ===
  async analyzeImage(base64Data: string, mimeType: string, prompt: string): Promise<string> {
    const ai = getAiClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt },
          ],
        },
      });
      return response.text;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  },

  // === Creative ===
  async generateImage(prompt: string, aspectRatio: string): Promise<string> {
    const ai = getAiClient();
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio,
        },
      });
      return response.generatedImages[0].image.imageBytes;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  },
  
  async editImage(base64Data: string, mimeType: string, prompt: string): Promise<string> {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart && imagePart.inlineData) {
            return imagePart.inlineData.data;
        }
        throw new Error("No image data returned from editImage API");
    } catch (error) {
        console.error('Error editing image:', error);
        throw error;
    }
  },

  async generateVideo(prompt: string, aspectRatio: '16:9' | '9:16', onStatusUpdate: (status: string) => void, image?: VideoImagePayload): Promise<string> {
    // Veo requires its own client instance right before the call to get the latest key
    const ai = getAiClient();
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        ...(image && { image: { imageBytes: image.data, mimeType: image.mimeType } }),
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio,
        }
      });
      
      onStatusUpdate("Videon bearbetas...");
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        onStatusUpdate("Kontrollerar status...");
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error("Video generation completed but no download link was found.");
      }
      onStatusUpdate("Hämtar video...");
      const videoResponse = await fetch(`${downloadLink}&key=${API_KEY}`);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
      }
      const videoBlob = await videoResponse.blob();
      return URL.createObjectURL(videoBlob);

    } catch (error) {
      console.error('Error generating video:', error);
      throw error;
    }
  },
  
  // === Live Audio ===
  async startLiveSession(callbacks: LiveSessionCallbacks): Promise<LiveSession> {
    const ai = getAiClient();

    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);
    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => callbacks.onOpen(),
        onmessage: async (message) => {
          callbacks.onMessage(message);
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            const audioBuffer = await this.decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.addEventListener('ended', () => sources.delete(source));
            source.start(nextStartTime);
            nextStartTime += audioBuffer.duration;
            sources.add(source);
          }
          if (message.serverContent?.interrupted) {
            for (const source of sources.values()) {
              source.stop();
              sources.delete(source);
            }
            nextStartTime = 0;
          }
        },
        onerror: (e) => callbacks.onError(e),
        onclose: (e) => {
          outputAudioContext.close();
          callbacks.onClose(e);
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        systemInstruction: "You are a friendly and helpful AI assistant for the 'Min Sista Hälsning' app. Keep your responses concise and empathetic."
      }
    });

    // Fix: Get user media stream first to avoid used-before-declaration errors.
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    // Fix: Create media stream source from the obtained mediaStream. Removed invalid '.current' access.
    const mediaStreamSource = inputAudioContext.createMediaStreamSource(mediaStream);
    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    scriptProcessor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const l = inputData.length;
      const int16 = new Int16Array(l);
      for (let i = 0; i < l; i++) {
        int16[i] = inputData[i] * 32768;
      }
      const pcmBlob = {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
      };
      sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
    };

    mediaStreamSource.connect(scriptProcessor);
    scriptProcessor.connect(inputAudioContext.destination);

    callbacks.onStream({
        audioContext: inputAudioContext,
        scriptProcessor,
        mediaStreamSource,
    });
    
    return {
      close: async () => {
        const session = await sessionPromise;
        session.close();
        // Fix: Stop media stream tracks to release microphone resource.
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  },

  async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
  }
};

export { geminiService };