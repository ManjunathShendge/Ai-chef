
import React, { useState, useRef } from 'react';
import { editFoodImage } from '../services/geminiService';

const ImageLab: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setEditedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!sourceImage || !prompt) return;
    setIsEditing(true);
    try {
      const base64 = sourceImage.split(',')[1];
      const result = await editFoodImage(base64, prompt);
      if (result) setEditedImage(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEditing(false);
    }
  };

  const presets = [
    "Make it look professionally plated",
    "Add a rustic wooden table background",
    "Brighten the colors and add steam",
    "Convert to a retro cookbook style",
    "Add a glass of wine next to the plate",
    "Make it look like a street food stall at night"
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-32">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800">AI Food Lab</h1>
        <p className="text-stone-600">Use text prompts to remix and style your food photography.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">Original</h3>
              <div 
                onClick={() => !isEditing && fileInputRef.current?.click()}
                className="aspect-square bg-stone-100 rounded-3xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center border-2 border-dashed border-stone-200"
              >
                {sourceImage ? (
                  <img src={sourceImage} className="w-full h-full object-cover" alt="Original" />
                ) : (
                  <span className="text-stone-400 font-medium">Click to upload</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">AI Generated</h3>
              <div className="aspect-square bg-stone-200 rounded-3xl overflow-hidden flex items-center justify-center relative shadow-inner">
                {editedImage ? (
                  <img src={editedImage} className="w-full h-full object-cover animate-in fade-in" alt="Edited" />
                ) : isEditing ? (
                  <div className="flex flex-col items-center">
                    <i className="fa-solid fa-wand-magic-sparkles animate-pulse text-4xl text-orange-600 mb-2"></i>
                    <span className="text-orange-600 font-bold">Refining Image...</span>
                  </div>
                ) : (
                  <span className="text-stone-400 font-medium">Waiting for prompt</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
            <label className="block text-stone-700 font-bold mb-3">Generation Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the changes you want to see..."
              className="w-full h-24 p-4 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none mb-4"
            />
            <button
              onClick={handleEdit}
              disabled={!sourceImage || !prompt || isEditing}
              className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold shadow-lg hover:bg-orange-700 transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 flex items-center justify-center space-x-2"
            >
              <i className="fa-solid fa-wand-sparkles"></i>
              <span>{isEditing ? 'Magic in Progress...' : 'Generate New Version'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-stone-800 text-white p-6 rounded-3xl h-fit">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <i className="fa-solid fa-lightbulb text-yellow-400"></i> Pro Tip
            </h3>
            <p className="text-stone-300 text-sm leading-relaxed">
              Gemini 2.5 Flash Image is great at understanding lighting and context. Use descriptors like 
              <span className="text-orange-400 font-medium"> "golden hour lighting"</span> or 
              <span className="text-orange-400 font-medium"> "blurred background"</span> for better results.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-stone-700">Quick Styles</h3>
            {presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(preset)}
                className="w-full text-left p-3 bg-white border border-stone-200 rounded-xl hover:border-orange-500 hover:text-orange-600 text-sm transition-all"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
};

export default ImageLab;
