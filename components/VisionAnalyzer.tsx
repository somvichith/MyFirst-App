
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { VisionResult } from '../types';

const VisionAnalyzer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
    }
  };

  const analyzeImage = async () => {
    if (!file) return;
    setIsAnalyzing(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: 'Describe this image in extreme detail. Identify objects, colors, people, and context. Then, perform OCR and extract all readable text clearly separated at the end of your response.' }
            ]
          }
        });

        const text = response.text || '';
        const ocrSplit = text.split(/OCR|Extracted Text/i);
        
        setResult({
          description: ocrSplit[0].trim(),
          ocrText: ocrSplit.length > 1 ? ocrSplit[1].trim() : undefined,
          imageUrl: preview!
        });
      };
    } catch (error) {
      console.error('Vision analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Vision & OCR</h2>
        <p className="text-gray-400">Deep analysis and text extraction from any image.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload & Preview */}
        <div className="space-y-4">
          <div 
            onClick={() => !isAnalyzing && fileInputRef.current?.click()}
            className={`aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden relative ${
              preview ? 'border-indigo-500' : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
            }`}
          >
            {preview ? (
              <div className="relative w-full h-full">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-indigo-400 font-bold animate-pulse">Analyzing...</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up text-4xl text-gray-600 mb-4"></i>
                <p className="text-gray-500 font-medium">Click to upload or capture</p>
                <p className="text-gray-600 text-xs mt-1">Supports PNG, JPG, WebP</p>
              </>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </div>

          <button
            onClick={analyzeImage}
            disabled={!file || isAnalyzing}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
          >
            {isAnalyzing ? (
              <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Analyzing...</>
            ) : 'Analyze Image'}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {!result && !isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 border border-gray-800 rounded-3xl p-8 text-center">
              <i className="fa-solid fa-magnifying-glass text-3xl mb-4 opacity-20"></i>
              <p>Upload an image to see analysis details and extracted text here.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="space-y-4">
              <div className="h-4 bg-gray-800 rounded-full animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-800 rounded-full animate-pulse w-full"></div>
              <div className="h-4 bg-gray-800 rounded-full animate-pulse w-5/6"></div>
              <div className="h-32 bg-gray-800 rounded-2xl animate-pulse w-full mt-8"></div>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-info-circle"></i> Scene Description
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">{result.description}</p>
              </div>

              {result.ocrText && (
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-6">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-font"></i> Extracted Text (OCR)
                  </h4>
                  <pre className="text-sm text-indigo-100 whitespace-pre-wrap font-mono leading-relaxed bg-black/30 p-4 rounded-xl">
                    {result.ocrText}
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(result.ocrText || '')}
                    className="mt-3 text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 uppercase tracking-tighter"
                  >
                    <i className="fa-solid fa-copy"></i> Copy Text
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisionAnalyzer;
