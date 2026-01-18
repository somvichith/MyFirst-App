
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

// Fix: Updated component to accept lang and t props as passed from App.tsx
const ClothSwapper: React.FC<{ lang: string; t: any }> = ({ lang, t }) => {
  const [personImg, setPersonImg] = useState<string | null>(null);
  const [clothImg, setClothImg] = useState<string | null>(null);
  const [resultImg, setResultImg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedRatio, setDetectedRatio] = useState<"1:1" | "3:4" | "4:3" | "9:16" | "16:9">("1:1");

  const personInputRef = useRef<HTMLInputElement>(null);
  const clothInputRef = useRef<HTMLInputElement>(null);

  // Helper to find the absolute closest supported aspect ratio to prevent ANY cropping
  const calculateAspectRatio = (img: HTMLImageElement) => {
    const ratio = img.width / img.height;
    // Thresholds for standard ratios
    if (ratio >= 1.5) return "16:9";    // Landscape
    if (ratio >= 1.15) return "4:3";   // Standard Landscape
    if (ratio >= 0.85) return "1:1";   // Square
    if (ratio >= 0.65) return "3:4";   // Portrait
    return "9:16";                     // Tall Portrait
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'person' | 'cloth') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (type === 'person') {
          setPersonImg(dataUrl);
          const img = new Image();
          img.onload = () => {
            const ratio = calculateAspectRatio(img);
            setDetectedRatio(ratio);
          };
          img.src = dataUrl;
        } else {
          setClothImg(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const checkAndSelectKey = async () => {
    if ((window as any).aistudio) {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      if (!selected) {
        await (window as any).aistudio.openSelectKey();
      }
    }
  };

  const performSwap = async () => {
    if (!personImg || !clothImg) return;
    
    await checkAndSelectKey();
    setIsProcessing(true);
    setResultImg(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const personBase64 = personImg.split(',')[1];
      const clothBase64 = clothImg.split(',')[1];

      // Highly technical prompt for 4K realism and strict background/framing preservation
      const prompt = `You are a world-class AI fashion photographer and master image retoucher. 
      TASK: Perform a seamless, hyper-realistic 4K virtual clothing swap.
      
      INPUT 1 (MODEL/REFERENCE): The person whose clothing needs to be changed.
      INPUT 2 (GARMENT): The target clothing item.
      
      STRICT COMPOSITION RULES:
      1. NO CROPPING: The final image MUST maintain the exact same framing, field of view, and composition as Input 1.
      2. BACKGROUND LOCK: Every pixel of the background from Input 1 must be perfectly preserved and untouched.
      3. PERSON PRESERVATION: Maintain the model's face, hair, skin textures, pose, and lighting environment with 100% fidelity.
      
      TECHNICAL INTEGRATION:
      - Map the garment from Input 2 onto the model's body.
      - Ensure physically accurate fabric drape, creases, and folding patterns based on the model's pose.
      - Match the scene's ambient lighting, shadows, and subsurface scattering on the fabric and skin.
      - The transition between skin and clothing must be sharp and seamless.
      - Output a professional, studio-grade 4K photograph with zero artifacts.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            { inlineData: { data: personBase64, mimeType: 'image/png' } },
            { inlineData: { data: clothBase64, mimeType: 'image/png' } },
            { text: prompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: detectedRatio,
            imageSize: "4K" // Upgraded to maximum 4K Ultra-HD quality
          }
        }
      });

      let finalUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          finalUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (finalUrl) {
        setResultImg(finalUrl);
      } else {
        throw new Error("Empty response parts");
      }
    } catch (error) {
      console.error('HD Swap failed:', error);
      alert('High-quality processing failed. Please ensure you have selected a valid paid API key and try smaller file sizes if the problem persists.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10 pb-32">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-2">
          <i className="fa-solid fa-crown"></i> 4K Ultra-HD Processing
        </div>
        <h2 className="text-4xl font-extrabold tracking-tight">{t.clothSwap}</h2>
        <p className="text-gray-400 max-w-xl mx-auto">Seamlessly transfer garments while preserving your original photo's full background and quality.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Person Upload */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{t.uploadPerson}</label>
            {personImg && <span className="text-[10px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded shadow-lg shadow-indigo-500/20">Original Ratio: {detectedRatio}</span>}
          </div>
          <div 
            onClick={() => !isProcessing && personInputRef.current?.click()}
            className={`aspect-[4/5] bg-gray-800 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${
              personImg ? 'border-indigo-500/50' : 'border-gray-700 hover:border-indigo-500'
            }`}
          >
            {personImg ? (
              <img src={personImg} className="w-full h-full object-contain bg-black/40" alt="Model" />
            ) : (
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-600 transition-colors">
                  <i className="fa-solid fa-user-astronaut text-2xl text-gray-500 group-hover:text-white"></i>
                </div>
                <span className="text-sm font-bold text-gray-400">{t.uploadPerson}</span>
                <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-tighter">Full body or portrait</p>
              </div>
            )}
          </div>
          <input type="file" ref={personInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'person')} accept="image/*" />
        </div>

        {/* Cloth Upload */}
        <div className="space-y-4">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{t.uploadCloth}</label>
          <div 
            onClick={() => !isProcessing && clothInputRef.current?.click()}
            className={`aspect-[4/5] bg-gray-800 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${
              clothImg ? 'border-purple-500/50' : 'border-gray-700 hover:border-purple-500'
            }`}
          >
            {clothImg ? (
              <img src={clothImg} className="w-full h-full object-contain bg-black/40" alt="Garment" />
            ) : (
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-600 transition-colors">
                  <i className="fa-solid fa-shirt text-2xl text-gray-500 group-hover:text-white"></i>
                </div>
                <span className="text-sm font-bold text-gray-400">{t.uploadCloth}</span>
                <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-tighter">Flat lay or product shot</p>
              </div>
            )}
          </div>
          <input type="file" ref={clothInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'cloth')} accept="image/*" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-8 pt-6">
        <button
          onClick={performSwap}
          disabled={!personImg || !clothImg || isProcessing}
          className="relative group px-16 py-6 bg-white text-black font-black text-lg rounded-[2rem] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:shadow-[0_25px_60px_rgba(99,102,241,0.4)] disabled:bg-gray-800 disabled:text-gray-600 transform active:scale-95 overflow-hidden"
        >
          {isProcessing ? (
            <div className="flex items-center gap-4">
              <i className="fa-solid fa-sync fa-spin text-indigo-600"></i>
              <span>Generating 4K HD...</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <i className="fa-solid fa-sparkles text-indigo-600"></i>
              <span>Synthesize 4K Result</span>
            </div>
          )}
        </button>

        {resultImg && (
          <div className="w-full space-y-8 animate-fadeIn">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-800 flex-1"></div>
              <h3 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                <span className="text-indigo-500 underline decoration-4">4K</span> HD Output
              </h3>
              <div className="h-px bg-gray-800 flex-1"></div>
            </div>
            
            <div className="max-w-3xl mx-auto rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/5 relative group">
              <img src={resultImg} alt="4K HD Result" className="w-full h-auto" />
              
              {/* Floating Download Action */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = resultImg;
                    link.download = `Vicheat-4K-Master-${Date.now()}.png`;
                    link.click();
                  }}
                  className="px-8 py-4 bg-white text-black font-black rounded-full shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform"
                >
                  <i className="fa-solid fa-download"></i>
                  Download 4K Master
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4">
        <div className="bg-gray-800/30 p-4 rounded-2xl border border-gray-700/50 flex gap-3">
          <i className="fa-solid fa-crop-simple text-indigo-400 mt-1"></i>
          <div>
            <h5 className="text-[10px] font-black uppercase text-gray-500">Aspect Matching</h5>
            <p className="text-[11px] text-gray-400">Original framing is locked and preserved.</p>
          </div>
        </div>
        <div className="bg-gray-800/30 p-4 rounded-2xl border border-gray-700/50 flex gap-3">
          <i className="fa-solid fa-wand-magic text-purple-400 mt-1"></i>
          <div>
            <h5 className="text-[10px] font-black uppercase text-gray-500">Physics Aware</h5>
            <p className="text-[11px] text-gray-400">Garments fold and crease naturally.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClothSwapper;
