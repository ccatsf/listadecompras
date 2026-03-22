import { GoogleGenerativeAI } from "@google/generative-ai";]
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ExternalLink, Loader2, ShoppingBag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

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
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
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
    setIsLoading(true);
    setError(null);
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) throw new Error("Chave não encontrada no ambiente.");

      // Inicialização simplificada para evitar bloqueio de segurança do navegador
      const genAI = new GoogleGenAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Extract product information from this URL: ${url}. 
      Return ONLY a JSON object: {"title": "string", "price": number, "imageUrl": "string"}. 
      Do not include markdown formatting.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Limpeza robusta para garantir que o JSON.parse não falhe
      const cleanJson = text.replace(/```json|```/g, "").trim();
      const data = JSON.parse(cleanJson);

      const newProduct: Product = {
        id: Math.random().toString(36).substr(2, 9),
        url,
        title: data.title || "Produto",
        price: data.price || 0,
        imageUrl: data.imageUrl || "https://picsum.photos/200",
        notes: '',
        tags: [],
        createdAt: Date.now()
      };

      setProducts(prev => [newProduct, ...prev]);
      setNewUrl('');
      setIsAdding(false);
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      // Mensagem amigável que ajuda a identificar se é a chave ou a conexão
      setError("Erro na conexão com a IA. Tente fazer um Redeploy sem cache no Vercel.");
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
          <button onClick={() => setIsAdding(true)} className="w-10 h-10 bg-[#007AFF] rounded-full flex items-center justify-center text-white shadow-lg">
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
          <AnimatePresence>
            {products.map((product) => (
              <motion.div key={product.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm border border-[#E5E5EA]">
                <img src={product.imageUrl} className="w-20 h-20 rounded-lg object-cover bg-gray-100" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-bold line-clamp-1">{product.title}</h3>
                    <button onClick={() => removeProduct(product.id)} className="text-red-500"><Trash2 size={18} /></button>
                  </div>
                  <p className="text-[#007AFF] font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</p>
                  <a href={product.url} target="_blank" className="text-xs text-gray-400 flex items-center gap-1 mt-1">Ver link <ExternalLink size={10} /></a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={() => !isLoading && setIsAdding(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-2xl">
              <input 
                type="url" 
                placeholder="Cole o link aqui..." 
                className="w-full bg-gray-100 border-none rounded-xl p-4 mb-4" 
                value={newUrl} 
                onChange={(e) => setNewUrl(e.target.value)} 
              />
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <button disabled={isLoading} onClick={() => extractProductData(newUrl)} className="w-full bg-[#007AFF] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" /> : "Adicionar"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
