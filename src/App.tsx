import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Tag as TagIcon, 
  StickyNote, 
  Loader2,
  ShoppingBag,
  ArrowRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// Types
interface Product {
  id: string;
  url: string;
  title: string;
  price: number;
  imageUrl: string;
  notes: string;
  tags: string[];
  createdAt: number;
}

const STORAGE_KEY = 'shopping_list_data';

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load products", e);
      return [];
    }
  });
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save data whenever products change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const total = useMemo(() => {
    return products.reduce((acc, p) => acc + p.price, 0);
  }, [products]);

  const extractProductData = async (url: string) => {
    if (!url.startsWith('http')) {
      setError("Por favor, insira uma URL válida.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      const prompt = `Extract product information from this URL: ${url}. 
      Return the product title, price (as a number), and a representative image URL.
      If the price is not clear, estimate it or put 0.
      Use the provided URL to find the information.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ urlContext: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              price: { type: Type.NUMBER },
              imageUrl: { type: Type.STRING }
            },
            required: ["title", "price", "imageUrl"]
          }
        }
      });

      const data = JSON.parse(response.text);
      
      const newProduct: Product = {
        id: Math.random().toString(36).substring(7),
        url,
        title: data.title || "Produto sem título",
        price: data.price || 0,
        imageUrl: data.imageUrl || `https://picsum.photos/seed/${Math.random()}/400/400`,
        notes: "",
        tags: [],
        createdAt: Date.now()
      };

      setProducts(prev => [newProduct, ...prev]);
      setNewUrl('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      setError("Não foi possível extrair os dados do link automaticamente. Tente outro link ou verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  const removeProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-[#1C1C1E] pb-24">
      {/* iOS Header */}
      <header className="sticky top-0 z-10 bg-[#F2F2F7]/80 backdrop-blur-md px-4 pt-12 pb-4 border-b border-[#D1D1D6]">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Lista de Compras</h1>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="w-10 h-10 bg-[#007AFF] rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      <main className="px-4 mt-6 max-w-2xl mx-auto">
        {/* Total Card */}
        <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-[#E5E5EA]">
          <div className="flex justify-between items-center">
            <span className="text-[#8E8E93] font-medium">Total Estimado</span>
            <span className="text-2xl font-bold text-[#007AFF]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              className="h-full bg-[#007AFF] opacity-20"
            />
          </div>
        </div>

        {/* Product List */}
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {products.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-[#8E8E93]"
              >
                <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                  <ShoppingBag size={48} strokeWidth={1.5} className="opacity-40" />
                </div>
                <p className="text-center px-10 font-medium">Sua lista está vazia.</p>
                <p className="text-center px-10 text-sm mt-1">Adicione links de produtos para começar.</p>
              </motion.div>
            ) : (
              products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onRemove={() => removeProduct(product.id)}
                  onUpdate={(updates) => updateProduct(product.id, updates)}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoading && setIsAdding(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Adicionar Link</h2>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-2 bg-[#F2F2F7] rounded-full text-[#8E8E93]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-[#8E8E93] text-sm">Cole o link do produto de qualquer loja (Amazon, Mercado Livre, etc.)</p>
                <div className="relative">
                  <input 
                    autoFocus
                    type="url"
                    placeholder="https://..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full bg-[#F2F2F7] border-none rounded-xl px-4 py-4 text-base focus:ring-2 focus:ring-[#007AFF] transition-all"
                  />
                </div>

                {error && (
                  <p className="text-[#FF3B30] text-sm bg-[#FF3B30]/10 p-3 rounded-lg">{error}</p>
                )}

                <button 
                  disabled={!newUrl || isLoading}
                  onClick={() => extractProductData(newUrl)}
                  className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                    !newUrl || isLoading ? 'bg-[#D1D1D6]' : 'bg-[#007AFF] active:scale-[0.98]'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Extraindo dados...</span>
                    </>
                  ) : (
                    <>
                      <span>Adicionar à Lista</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductCard({ product, onRemove, onUpdate }: { 
  product: Product, 
  onRemove: () => void,
  onUpdate: (updates: Partial<Product>) => void,
  key?: string | number
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(product.notes);
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagInput.trim() && !product.tags.includes(tagInput.trim())) {
      onUpdate({ tags: [...product.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    onUpdate({ tags: product.tags.filter(t => t !== tag) });
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E5EA]"
    >
      <div className="p-4 flex gap-4">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#F2F2F7] flex-shrink-0 border border-[#E5E5EA]">
          <img 
            src={product.imageUrl} 
            alt={product.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${product.id}/400/400`;
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-base leading-tight line-clamp-2 pr-2">{product.title}</h3>
            <button 
              onClick={onRemove}
              className="text-[#FF3B30] p-1 active:scale-90 transition-transform"
            >
              <Trash2 size={18} />
            </button>
          </div>
          <p className="text-lg font-bold text-[#007AFF] mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <a 
              href={product.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[13px] text-[#8E8E93] flex items-center gap-1 hover:text-[#007AFF] transition-colors"
            >
              Ver anúncio <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {product.tags.map(tag => (
            <span 
              key={tag} 
              className="bg-[#E5E5EA] text-[#1C1C1E] text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-[#FF3B30] transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-[#007AFF] text-[11px] font-semibold flex items-center gap-1 hover:underline"
          >
            <TagIcon size={12} /> {isEditing ? 'Fechar' : 'Notas / Etiquetas'}
          </button>
        </div>

        {/* Notes Preview */}
        {!isEditing && product.notes && (
          <div className="bg-[#F2F2F7] p-3 rounded-xl flex gap-2 items-start">
            <StickyNote size={14} className="text-[#8E8E93] mt-0.5" />
            <p className="text-[13px] text-[#3A3A3C] italic line-clamp-2">{product.notes}</p>
          </div>
        )}

        {/* Edit Section */}
        <AnimatePresence>
          {isEditing && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3 pt-2 border-t border-[#F2F2F7]"
            >
              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] uppercase mb-1.5 block">Notas</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={() => onUpdate({ notes: note })}
                  placeholder="Adicione observações sobre o produto..."
                  className="w-full bg-[#F2F2F7] rounded-xl p-3 text-[13px] border-none focus:ring-1 focus:ring-[#007AFF] min-h-[80px] resize-none transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] uppercase mb-1.5 block">Nova Etiqueta</label>
                <form onSubmit={handleAddTag} className="flex gap-2">
                  <input 
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Ex: Presente, Urgente..."
                    className="flex-1 bg-[#F2F2F7] rounded-xl px-3 py-2 text-[13px] border-none focus:ring-1 focus:ring-[#007AFF] transition-all"
                  />
                  <button 
                    type="submit"
                    className="bg-[#007AFF] text-white px-4 py-2 rounded-xl text-[13px] font-bold active:scale-95 transition-transform"
                  >
                    Add
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
