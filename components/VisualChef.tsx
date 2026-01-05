
import React, { useState, useRef } from 'react';
import { analyzeImage } from '../services/geminiService';
import { AnalysisResult } from '../types';

const VisualChef: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setImage(reader.result as string);
        processImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeImage(base64);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-32">
      <h1 className="text-3xl font-bold mb-2 text-stone-800">Visual Chef</h1>
      <p className="text-stone-600 mb-8">Upload a photo of ingredients or a finished dish for AI analysis.</p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square bg-white border-2 border-dashed border-stone-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all overflow-hidden relative"
          >
            {image ? (
              <img src={image} className="w-full h-full object-cover" alt="Food to analyze" />
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up text-4xl text-stone-300 mb-4"></i>
                <span className="text-stone-500 font-medium">Click to upload photo</span>
              </>
            )}
            {loading && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                <i className="fa-solid fa-spinner animate-spin text-3xl text-orange-600 mb-2"></i>
                <span className="text-orange-600 font-bold">Analyzing...</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-stone-100 text-stone-700 rounded-xl font-semibold hover:bg-stone-200"
          >
            Select Different Image
          </button>
        </div>

        <div className="space-y-6">
          {result ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 animate-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-bold text-orange-600 mb-4">{result.dishName}</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-stone-800 flex items-center gap-2 mb-2">
                    <i className="fa-solid fa-list-check text-orange-600"></i> Identified Ingredients
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.ingredients.map((ing, i) => (
                      <span key={i} className="px-3 py-1 bg-stone-100 text-stone-600 text-sm rounded-full">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-orange-800">Estimated Calories</span>
                  <span className="text-orange-600 font-bold text-xl">{result.calories}</span>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border-l-4 border-stone-400">
                  <p className="text-stone-700 italic">" {result.suggestedAction} "</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-stone-100 rounded-3xl opacity-50 border-2 border-stone-200">
              <i className="fa-solid fa-robot text-4xl mb-4"></i>
              <p className="text-center">Analysis results will appear here after upload.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualChef;
