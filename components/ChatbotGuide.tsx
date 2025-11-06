
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import type { ChatMessage } from '../types';

const ChatbotGuide: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    if (!chatRef.current) {
      chatRef.current = geminiService.startChat('gemini-2.5-flash', "Du är en empatisk och hjälpsam guide för appen 'Min Sista Hälsning'. Ditt syfte är att vägleda användare genom den känsliga processen att dokumentera sina sista önskningar, minnen och meddelanden. Var lugn, stöttande och proaktiv. Fråga vägledande frågor som 'Vill du skriva ett brev till dina barn?' eller 'Behöver du hjälp att strukturera dina tankar kring ekonomiska instruktioner?'.");
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const stream = await geminiService.sendMessageStream(chatRef.current, input);
      let botMessage: ChatMessage = { role: 'model', content: '' };
      
      // Add bot message placeholder
      setMessages(prev => [...prev, botMessage]);

      for await (const chunk of stream) {
          botMessage.content += chunk;
          setMessages(prev => [...prev.slice(0, -1), { ...botMessage }]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = { role: 'model', content: 'Ursäkta, något gick fel. Försök igen.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-250px)]">
      <h2 className="text-2xl font-bold mb-4 text-cyan-400">Din Personliga Guide</h2>
      <p className="mb-4 text-gray-400">Här kan du få hjälp och vägledning. Fråga mig vad som helst om att skapa dina meddelanden, organisera minnen eller formulera instruktioner.</p>
      <div ref={chatContainerRef} className="flex-grow bg-gray-900 p-4 rounded-lg overflow-y-auto mb-4 custom-scrollbar">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${msg.role === 'user' ? 'bg-cyan-700 text-white' : 'bg-gray-700 text-gray-200'}`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
         {isLoading && messages[messages.length - 1]?.role !== 'model' && (
             <div className="flex justify-start mb-3">
                 <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-xl bg-gray-700 text-gray-200">
                    <div className="flex items-center">
                        <div className="dot-flashing"></div>
                    </div>
                 </div>
             </div>
        )}
      </div>
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Skriv ditt meddelande..."
          className="flex-grow p-3 bg-gray-700 text-white rounded-l-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="bg-cyan-600 text-white px-6 py-3 rounded-r-lg hover:bg-cyan-700 disabled:bg-gray-500 transition-colors"
        >
          {isLoading ? '...' : 'Skicka'}
        </button>
      </div>
       <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #1f2937;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #374151;
            border-radius: 4px;
          }
          .dot-flashing {
            position: relative;
            width: 10px;
            height: 10px;
            border-radius: 5px;
            background-color: #9880ff;
            color: #9880ff;
            animation: dot-flashing 1s infinite linear alternate;
            animation-delay: 0.5s;
          }
          .dot-flashing::before, .dot-flashing::after {
            content: '';
            display: inline-block;
            position: absolute;
            top: 0;
          }
          .dot-flashing::before {
            left: -15px;
            width: 10px;
            height: 10px;
            border-radius: 5px;
            background-color: #9880ff;
            color: #9880ff;
            animation: dot-flashing 1s infinite alternate;
            animation-delay: 0s;
          }
          .dot-flashing::after {
            left: 15px;
            width: 10px;
            height: 10px;
            border-radius: 5px;
            background-color: #9880ff;
            color: #9880ff;
            animation: dot-flashing 1s infinite alternate;
            animation-delay: 1s;
          }
          @keyframes dot-flashing {
            0% { background-color: #9880ff; }
            50%, 100% { background-color: rgba(152, 128, 255, 0.2); }
          }
      `}</style>
    </div>
  );
};

export default ChatbotGuide;
