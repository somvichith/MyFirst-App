
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import * as docx from 'docx';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js Worker with hardcoded version matching importmap for production stability
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

interface VisionAnalyzerProps {
  lang: string;
  t: any;
}

const VisionAnalyzer: React.FC<VisionAnalyzerProps> = ({ lang, t }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<{current: number, total: number}>({current: 0, total: 0});
  const [wordBlob, setWordBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setWordBlob(null);
      setPreviews([]);
      if (selected.type === 'application/pdf') {
        renderAllPdfPages(selected);
      } else {
        const url = URL.createObjectURL(selected);
        setPreviews([url]);
      }
    }
  };

  const renderAllPdfPages = async (pdfFile: File) => {
    setIsProcessing(true);
    setStatus('High-Speed Rendering...');
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      
      const pagePromises = Array.from({ length: numPages }, async (_, i) => {
        const page = await pdf.getPage(i + 1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        // Fix: Added required 'canvas' property to RenderParameters for PDF.js v4 compatibility
        await page.render({ canvasContext: context!, viewport, canvas }).promise;
        return canvas.toDataURL('image/jpeg', 0.8);
      });

      const pageImages = await Promise.all(pagePromises);
      setPreviews(pageImages);
    } catch (err) {
      console.error("PDF Render Error:", err);
      setStatus("Error rendering PDF");
    } finally {
      setIsProcessing(false);
      setStatus('');
    }
  };

  const convertToWord = async () => {
    if (!file || previews.length === 0) return;
    setIsProcessing(true);
    setWordBlob(null);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const totalPages = previews.length;
    setProgress({ current: 0, total: totalPages });

    const pageResults: any[][] = new Array(totalPages);
    const BATCH_SIZE = 4;

    try {
      for (let i = 0; i < totalPages; i += BATCH_SIZE) {
        const currentBatchSize = Math.min(BATCH_SIZE, totalPages - i);
        const batchIndices = Array.from({ length: currentBatchSize }, (_, k) => i + k);
        
        setStatus(`Analyzing Pages ${i + 1} - ${Math.min(i + BATCH_SIZE, totalPages)}...`);

        const batchPromises = batchIndices.map(async (idx) => {
          const base64Data = previews[idx].split(',')[1];
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: {
                parts: [
                  { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
                  { text: `Extract all Khmer text and tables from this document page. 
                    Output a JSON array of blocks. 
                    Types: 'heading', 'paragraph', 'table'. 
                    Fonts: 'Moul' or 'Siemreap'.
                    Return tableData as row/cell array if type is 'table'.` }
                ]
              },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, enum: ['paragraph', 'heading', 'table'] },
                      content: { type: Type.STRING },
                      font: { type: Type.STRING },
                      level: { type: Type.NUMBER },
                      tableData: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              text: { type: Type.STRING },
                              isHeader: { type: Type.BOOLEAN },
                              font: { type: Type.STRING }
                            }
                          }
                        }
                      }
                    },
                    required: ['type']
                  }
                }
              }
            });
            
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            return { idx, data: JSON.parse(response.text || '[]') };
          } catch (e) {
            console.error(`Page ${idx + 1} failed:`, e);
            return { idx, data: [{ type: 'paragraph', content: `[Error processing page ${idx + 1}]` }] };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(res => {
          pageResults[res.idx] = res.data;
        });
      }

      setStatus('Assembling Document...');
      const docChildren: any[] = [];
      const getKhmerFont = (fontHint?: string) => {
        if (!fontHint) return 'Khmer OS Siemreap';
        const h = fontHint.toLowerCase();
        if (h.includes('moul')) return 'Khmer OS Moul';
        return 'Khmer OS Siemreap';
      };

      pageResults.forEach((structuredData, pageIdx) => {
        structuredData.forEach((block: any) => {
          if (block.type === 'table' && block.tableData) {
            const rows = block.tableData.map((row: any[]) => {
              return new docx.TableRow({
                children: row.map((cell: any) => {
                  const cellFont = getKhmerFont(cell.font || block.font);
                  return new docx.TableCell({
                    children: [new docx.Paragraph({
                      children: [new docx.TextRun({
                        text: cell.text || "",
                        font: cellFont,
                        size: cell.isHeader ? 22 : 20,
                        bold: cell.isHeader || cellFont === 'Khmer OS Moul'
                      })],
                      alignment: docx.AlignmentType.CENTER
                    })],
                    shading: cell.isHeader ? { fill: "F9F9F9" } : undefined,
                    verticalAlign: docx.VerticalAlign.CENTER,
                  });
                })
              });
            });

            docChildren.push(new docx.Table({
              rows: rows,
              width: { size: 100, type: docx.WidthType.PERCENTAGE }
            }));
            docChildren.push(new docx.Paragraph({ text: "" }));
          } else {
            const blockFont = getKhmerFont(block.font);
            docChildren.push(new docx.Paragraph({
              children: [new docx.TextRun({
                text: block.content || "",
                font: blockFont,
                size: block.type === 'heading' ? 30 : 22,
                bold: block.type === 'heading' || blockFont === 'Khmer OS Moul'
              })],
              heading: block.type === 'heading' ? (block.level === 1 ? docx.HeadingLevel.HEADING_1 : docx.HeadingLevel.HEADING_2) : undefined,
              spacing: { before: 150, after: 100 }
            }));
          }
        });

        if (pageIdx < totalPages - 1) {
          docChildren.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
        }
      });

      const doc = new docx.Document({
        sections: [{
          properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
          children: docChildren
        }]
      });

      const blob = await docx.Packer.toBlob(doc);
      setWordBlob(blob);
      setStatus('Conversion Complete');
    } catch (error) {
      console.error('Speed conversion error:', error);
      setStatus('Error in processing');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!wordBlob) return;
    const url = window.URL.createObjectURL(wordBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Khmer-Rapid-Export-${Date.now()}.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-32">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
          <i className="fa-solid fa-bolt-lightning"></i> Turbo Conversion
        </div>
        <h2 className="text-4xl font-black tracking-tight uppercase">{t.pdfToWord}</h2>
        <p className="text-gray-400 max-w-lg mx-auto">Ultra-fast parallel processing for multi-page documents.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`aspect-[3/4] rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
              previews.length > 0 ? 'border-indigo-500 bg-gray-900' : 'border-gray-700 bg-gray-800/30 hover:border-indigo-400 hover:bg-gray-800/50'
            }`}
          >
            {previews.length > 0 ? (
              <div className="relative w-full h-full overflow-y-auto bg-gray-950 p-4 space-y-4 scrollbar-hide">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative group/page">
                    <img src={src} alt={`Page ${idx + 1}`} className="w-full rounded-xl shadow-lg border border-gray-800" />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-white">
                      PAGE {idx + 1}
                    </div>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="fixed inset-0 lg:absolute z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 border-4 border-indigo-500/20 rounded-full"></div>
                      <div 
                        className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
                        style={{ animationDuration: '0.6s' }}
                      ></div>
                      {progress.total > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-indigo-400">
                          {Math.round((progress.current / progress.total) * 100)}%
                        </div>
                      )}
                    </div>
                    <p className="text-lg font-black text-white uppercase tracking-widest animate-pulse">{status}</p>
                    <p className="text-xs text-gray-400 mt-2">Processing in parallel for maximum speed</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-10">
                <div className="w-20 h-20 bg-gray-700/50 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-file-pdf text-4xl text-gray-400 group-hover:text-indigo-400"></i>
                </div>
                <h4 className="text-lg font-bold text-gray-300">Upload Multi-Page PDF</h4>
                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest font-black">Parallel Extraction Enabled</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="hidden" />
          </div>

          <button
            onClick={convertToWord}
            disabled={previews.length === 0 || isProcessing}
            className="w-full py-5 bg-white text-black font-black rounded-3xl transition-all shadow-xl hover:shadow-indigo-500/20 active:scale-95 disabled:bg-gray-800 disabled:text-gray-600 flex items-center justify-center gap-3"
          >
            <i className={`fa-solid ${isProcessing ? 'fa-bolt-lightning animate-pulse' : 'fa-rocket'}`}></i>
            <span>{isProcessing ? t.processing : `Start Rapid Conversion (${previews.length} Pages)`}</span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-[2.5rem] p-8 min-h-full flex flex-col justify-center items-center text-center space-y-6">
            {!wordBlob && !isProcessing && (
              <div className="opacity-30">
                <i className="fa-solid fa-gauge-high text-6xl mb-4"></i>
                <p className="text-sm font-bold uppercase tracking-widest">Instant Analytics</p>
                <p className="text-[10px] mt-2 max-w-[200px]">We use multi-threading to process your PDF up to 4x faster than standard conversion.</p>
              </div>
            )}

            {isProcessing && (
              <div className="w-full space-y-6 py-10">
                <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <span>Parallel Stream</span>
                  <span>{progress.current}/{progress.total} Finished</span>
                </div>
                <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {wordBlob && (
              <div className="animate-fadeIn space-y-8 w-full">
                <div className="w-24 h-24 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto text-green-400 text-4xl shadow-2xl shadow-green-500/20">
                  <i className="fa-solid fa-check-double"></i>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white">Batch Success</h3>
                  <p className="text-gray-400 text-xs">Full document OCR and formatting optimized for Khmer script.</p>
                </div>
                
                <button
                  onClick={downloadFile}
                  className="w-full py-5 bg-green-600 hover:bg-green-500 text-white font-black rounded-3xl transition-all shadow-xl flex items-center justify-center gap-3 uppercase"
                >
                  <i className="fa-solid fa-file-word"></i>
                  <span>Download .docx</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default VisionAnalyzer;
