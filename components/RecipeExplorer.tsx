
import React, { useState } from 'react';
import { searchRecipes } from '../services/geminiService';

const RecipeExplorer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ text: string; sources: { title: string; url: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const globalSuggestions = [
    { name: 'Paneer Butter Masala', flag: '🇮🇳' },
    { name: 'Classic Italian Lasagna', flag: '🇮🇹' },
    { name: 'Thai Green Curry', flag: '🇹🇭' },
    { name: 'Japanese Sushi Rolls', flag: '🇯🇵' },
    { name: 'Mexican Street Tacos', flag: '🇲🇽' },
    { name: 'French Beef Bourguignon', flag: '🇫🇷' },
    { name: 'Korean Bibimbap', flag: '🇰🇷' },
    { name: 'Spanish Paella', flag: '🇪🇸' }
  ];

  const handleSearch = async (e?: React.FormEvent, manualQuery?: string) => {
    if (e) e.preventDefault();
    const finalQuery = manualQuery || query;
    if (!finalQuery) return;
    
    setLoading(true);
    if (manualQuery) setQuery(manualQuery);
    
    try {
      const data = await searchRecipes(finalQuery);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-2">
        <i className="fa-solid fa-earth-americas text-orange-600 text-2xl"></i>
        <h1 className="text-3xl font-bold text-stone-800">Global Recipe Explorer</h1>
      </div>
      <p className="text-stone-600 mb-8">Discover authentic flavors from every corner of the world.</p>

      <form onSubmit={(e) => handleSearch(e)} className="relative mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for any dish, ingredient, or cuisine..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none shadow-sm transition-all"
        />
        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xl"></i>
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-600 text-white px-6 py-2 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 font-bold"
        >
          {loading ? '...' : 'Explore'}
        </button>
      </form>

      <div className="mb-12">
        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <i className="fa-solid fa-fire text-orange-400"></i> Trending Globally
        </h3>
        <div className="flex flex-wrap gap-3">
          {globalSuggestions.map((suggestion) => (
            <button
              key={suggestion.name}
              onClick={() => handleSearch(undefined, suggestion.name)}
              className="px-4 py-2 bg-white border border-stone-200 rounded-full hover:border-orange-500 hover:text-orange-600 transition-all text-sm font-medium shadow-sm flex items-center gap-2 group"
            >
              <span>{suggestion.flag}</span>
              <span>{suggestion.name}</span>
              <i className="fa-solid fa-arrow-right text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
          <p className="text-stone-500 font-medium animate-pulse">Traveling the globe for the best recipe...</p>
        </div>
      )}

      {results && !loading && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 prose prose-stone max-w-none">
            <div dangerouslySetInnerHTML={{ __html: results.text.replace(/\n/g, '<br/>') }} />
          </div>

          {results.sources.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <i className="fa-solid fa-bookmark text-orange-600"></i> Authentic Sources
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-4 bg-white hover:bg-orange-50 rounded-2xl transition-all border border-stone-100 hover:border-orange-200 shadow-sm"
                  >
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-stone-800 truncate">{source.title}</p>
                      <p className="text-xs text-stone-400 truncate mt-1">{source.url}</p>
                    </div>
                    <i className="fa-solid fa-external-link text-stone-300 ml-4"></i>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeExplorer;
