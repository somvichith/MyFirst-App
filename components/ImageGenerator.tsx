
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GeneratedImage } from '../types';

// Fix: Updated component to accept lang and t props as passed from App.tsx
const ImageGenerator: React.FC<{ lang: string; t: any }> = ({ lang, t }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [style, setStyle] = useState('Realistic photography');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);

  const generateImage = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const fullPrompt = `${style}: ${prompt}. High quality, detailed, professional grade.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: fullPrompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setGallery(prev => [{
          id: Date.now().toString(),
          url: imageUrl,
          prompt: prompt,
          timestamp: Date.now()
        }, ...prev]);
        setPrompt('');
      }
    } catch (error) {
      console.error('Image generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const styles = [
    'Realistic photography',
    '3D Render',
    'Oil Painting',
    'Digital Illustration',
    'Anime / Manga',
    'Cinematic Lighting',
    'Cyberpunk'
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      {/* Controls */}
      <div className="lg:w-1/3 space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">{t.imageGen}</h2>
          <p className="text-gray-400">Bring your ideas to life with សំ វិចិត្រ.</p>
        </div>

        <div className="space-y-4 bg-gray-800/50 border border-gray-700 p-6 rounded-3xl">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Describe your image</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A futuristic city with floating neon structures..."
              className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Art Style</label>
            <div className="flex flex-wrap gap-2">
              {styles.map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`px-3 py-1.5 rounded-full text-[10px] border transition-all ${
                    style === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-2">
              {(['1:1', '16:9', '9:16'] as const).map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-2 rounded-xl text-xs border transition-all ${
                    aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateImage}
            disabled={!prompt.trim() || isGenerating}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
          >
            {isGenerating ? (
              <><i className="fa-solid fa-wand-sparkles fa-spin mr-2"></i> Creating Magic...</>
            ) : 'Generate Now'}
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="lg:flex-1 space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <i className="fa-solid fa-images text-indigo-400"></i> Generated Gallery
        </h3>
        
        {gallery.length === 0 && !isGenerating ? (
          <div className="h-[400px] border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center text-gray-600">
            <i className="fa-solid fa-palette text-5xl mb-4 opacity-20"></i>
            <p>Your AI creations will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isGenerating && (
              <div className="aspect-square bg-gray-800 rounded-3xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 animate-pulse"></div>
                <div className="text-center space-y-2 z-10">
                  <i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-400"></i>
                  <p className="text-xs text-indigo-300 font-medium">Imagining...</p>
                </div>
              </div>
            )}
            {gallery.map(img => (
              <div key={img.id} className="group relative rounded-3xl overflow-hidden bg-gray-800 shadow-xl border border-gray-700 transition-transform hover:scale-[1.02]">
                <img src={img.url} alt={img.prompt} className="w-full h-full object-cover aspect-square" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                  <p className="text-xs text-white line-clamp-2">{img.prompt}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-gray-400">Style: {style}</span>
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = img.url;
                        link.download = `សំ-វិចិត្រ-${Date.now()}.png`;
                        link.click();
                      }}
                      className="w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center backdrop-blur-md"
                    >
                      <i className="fa-solid fa-download text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;
