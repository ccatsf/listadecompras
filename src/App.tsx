import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Loader2,
  ShoppingBag,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const total = useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
  }, [products]);

  const extractProductData = async (url: string) => {
    if (!url.startsWith('http')) {
      setError("Por favor, insira uma URL válida.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Configuração da IA
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Chave API não encontrada. Verifique as configurações do Vercel.");
}
const genAI = new GoogleGenAI(apiKey);      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Extract product information from this URL: ${url}. 
      Return ONLY a JSON object with: "title" (string), "price" (number), and "imageUrl" (string). 
      If price is unknown, use 0.`;

      // 2. Chamada da IA
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Limpa possíveis marcações de Markdown que a IA as vezes coloca
      const cleanJson = text.replace(/```json|```/g, "").trim();
      const data = JSON.parse(cleanJson);
      
      // 3. Criação do Produto
      const newProduct: Product = {
        id: Math.random().toString(36).substr(2, 9),
        url: url,
        title: data.title || "Produto sem título",
        price: data.price || 0,
        imageUrl: data.imageUrl || `https://picsum.photos/seed/${Math.random()}/400/400`,
        notes: '',
        tags: [],
        createdAt: Date.now()
      };

      setProducts(prev => [newProduct, ...prev]);
      setNewUrl('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      setError("Erro ao extrair dados. Verifique sua chave no Vercel ou preencha manualmente.");
    } finally {
      setIsLoading(false);
    }
  };

  const removeProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-[#1C1C1E] pb-24">
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
        <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-[#E5E5EA]">
          <div className="flex justify-between items-center">
            <span className="text-[#8E8E93] font-medium">Total Estimado</span>
            <span className="text-2xl font-bold text-[#007AFF]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#8E8E93]">
                <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                  <ShoppingBag size={48} strokeWidth={1.5} className="opacity-40" />
                </div>
                <p className="text-center px-10 font-medium">Sua lista está vazia.</p>
              </div>
            ) : (
              products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onRemove={() => removeProduct(product.id)}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

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
              className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Adicionar Link</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 bg-[#F2F2F7] rounded-full text-[#8E8E93]">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <input 
                  autoFocus
                  type="url"
                  placeholder="Cole o link da Kabum, Amazon..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-[#F2F2F7] border-none rounded-xl px-4 py-4 text-base focus:ring-2 focus:ring-[#007AFF]"
                />

                {error && (
                  <p className="text-[#FF3B30] text-sm bg-[#FF3B30]/10 p-3 rounded-lg">{error}</p>
                )}

                <button 
                  disabled={!newUrl || isLoading}
                  onClick={() => extractProductData(newUrl)}
                  className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 ${
                    !newUrl || isLoading ? 'bg-[#D1D1D6]' : 'bg-[#007AFF]'
                  }`}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <span>Adicionar à Lista</span>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductCard({ product, onRemove }: { product: Product, onRemove: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E5EA]">
      <div className="p-4 flex gap-4">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#F2F2F7] flex-shrink-0">
          <img 
            src={product.imageUrl} 
            alt={product.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/200'; }}
          />
        </div>
        <div className="flex-1">
          <div className="flex justify-between">
            <h3 className="font-bold text-base line-clamp-2">{product.title}</h3>
            <button onClick={onRemove} className="text-[#FF3B30]"><Trash2 size={18} /></button>
          </div>
          <p className="text-lg font-bold text-[#007AFF] mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
          </p>
          <a href={product.url} target="_blank" rel="noreferrer" className="text-xs text-[#8E8E93] flex items-center gap-1 mt-2">
            Ver anúncio <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
