import React, { useState, useEffect } from 'react';
import {
    CheckCircle,
    ChevronRight,
    ZoomIn,
    Maximize2,
    X,
    Cpu,
    Smartphone,
    ShieldCheck,
    ShoppingBag,
    MessageCircle,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CatalogLanding - Página de Destino do Produto
 * Focada em conversão e visual premium para a Unitech Distribuidora.
 */
const CatalogLanding = ({ product, settings }) => {
    const [selectedImage, setSelectedImage] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [zoomScale, setZoomScale] = useState(1);
    const [loading, setLoading] = useState(true);

    const handleTalkToSeller = () => {
        const phone = settings?.phone || '5521973145455'; // Use system phone or fallback
        const cleanPhone = phone.replace(/\D/g, '');
        const message = `Olá! Tenho interesse no produto: *${product?.name}*. Pode me ajudar? 🚀`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    // Dynamic data mapping from real product
    const data = {
        companyName: settings?.companyName || "Unitech",
        name: product?.name || "Produto não identificado",
        sku: product?.sku || "N/D",
        brand: product?.brand || "Unitech Original",
        price: product?.retail ? `R$ ${parseFloat(product.retail).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "Sob Consulta",
        availability: (product?.stock > 0) ? "Em Estoque" : "Sob Encomenda",
        condition: "Novo / Grade A+",
        description: (typeof product?.specifications === 'string' ? product.specifications : null) || "Detalhes técnicos sob demanda. Este produto faz parte da linha selecionada Unitech, garantindo máxima performance e durabilidade para seu reparo.",
        images: product?.images || [product?.photo || 'https://placehold.co/800x800?text=Unitech+Distribuidora'],
        compatibility: (product?.compatibility_tags?.length > 0) ? product.compatibility_tags : ["Consulta de compatibilidade disponível no chat"],
        specifications: (Array.isArray(product?.specifications) ? product.specifications : []).concat([
            { label: "Marca", value: product?.brand || "Unitech" },
            { label: "Categoria", value: product?.category || "Geral" },
            { label: "Garantia", value: product?.warrantyMonths ? `${product.warrantyMonths} Meses` : "90 Dias" }
        ]).filter((v, i, a) => v.label !== 'SKU' && a.findIndex(t => t.label === v.label) === i) // Remove SKU and duplicates
    };

    useEffect(() => {
        // Smooth transition to show real data
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, [product]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 overflow-x-hidden">
            {/* Header / Navbar */}
            <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">U</div>
                        <span className="font-black text-xl tracking-tighter text-slate-800 uppercase">{data.companyName.split(' ')[0]} <span className="text-blue-600">{data.companyName.split(' ')[1] || 'Distribuidora'}</span></span>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-slate-500">
                        <a href="#" className="hover:text-blue-600 transition-colors">Produtos</a>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

                    {/* Gallery Section */}
                    <section className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative aspect-square bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 group cursor-zoom-in"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <img
                                src={data.images[selectedImage]}
                                alt={data.name}
                                className="w-full h-full object-contain p-8 md:p-12"
                            />
                            <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur shadow-lg p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                                <Maximize2 size={24} className="text-blue-600" />
                            </div>
                            <div className="absolute top-6 left-6 flex gap-2">
                                <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">Premium High-End</span>
                            </div>
                        </motion.div>

                        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                            {data.images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedImage(idx)}
                                    className={`relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Details Section */}
                    <section className="flex flex-col">
                        <motion.header
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-widest">
                                <Smartphone size={16} />
                                <span>Displays & Telas</span>
                                <ChevronRight size={14} className="text-slate-300" />
                                <span className="text-slate-400">Apple</span>
                            </div>

                            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tighter uppercase">
                                {data.name}
                            </h1>

                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-1.5 text-emerald-600">
                                    <CheckCircle size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">{data.availability}</span>
                                </div>
                            </div>

                            <p className="text-3xl font-black text-blue-600 tracking-tighter">{data.price}</p>
                        </motion.header>

                        <div className="mt-8 space-y-8">
                            {/* Tabs Mockup / Content */}
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                                <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-widest mb-4">
                                    <ShieldCheck size={18} className="text-emerald-500" />
                                    Descrição Técnica
                                </h4>
                                <p className="text-slate-600 leading-relaxed text-sm">
                                    {data.description}
                                </p>

                                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {data.specifications.map((spec, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{spec.label}</span>
                                            <span className="text-xs font-bold text-slate-700">{spec.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Compatibility Section */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-widest">
                                    <Smartphone size={18} className="text-blue-500" />
                                    Modelos Compatíveis
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {data.compatibility.map((model, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:border-blue-300 transition-colors">
                                            {model}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-4 pt-4">
                                <button
                                    onClick={handleTalkToSeller}
                                    className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-2xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-[0.98] uppercase tracking-widest text-sm"
                                >
                                    <MessageCircle size={20} />
                                    Falar com Vendedor
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-8 text-slate-400">
                                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest whitespace-nowrap">
                                    <ShieldCheck size={14} className="text-emerald-500" /> 100% Seguro
                                </div>
                                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest whitespace-nowrap">
                                    <Clock size={14} className="text-blue-500" /> Envio Imediato
                                </div>
                                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest whitespace-nowrap">
                                    <ShoppingBag size={14} className="text-orange-500" /> Retirada Local
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* Modal - Zoom & Gallery Fullscreen */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
                    >
                        <button
                            onClick={() => { setIsModalOpen(false); setZoomScale(1); }}
                            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors bg-white/10 p-4 rounded-full"
                        >
                            <X size={32} />
                        </button>

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: zoomScale, opacity: 1 }}
                            transition={{ type: "spring", damping: 25 }}
                            className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center select-none touch-none"
                        >
                            <img
                                src={data.images[selectedImage]}
                                alt="Zoom view"
                                className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing"
                                onDoubleClick={() => setZoomScale(s => s === 1 ? 2.5 : 1)}
                            />
                        </motion.div>

                        <div className="absolute bottom-12 flex items-center gap-4 bg-white/10 backdrop-blur rounded-full px-6 py-3 border border-white/10">
                            <button onClick={() => setZoomScale(s => Math.max(1, s - 0.5))} className="text-white hover:text-blue-400 p-2">
                                <X size={20} className="rotate-45" /> {/* Use as minus symbol mockup */}
                            </button>
                            <span className="text-white font-mono font-bold text-xs uppercase tracking-widest">Zoom: {zoomScale.toFixed(1)}x</span>
                            <button onClick={() => setZoomScale(s => Math.min(4, s + 0.5))} className="text-white hover:text-blue-400 p-2">
                                <ZoomIn size={20} />
                            </button>
                            <div className="w-px h-6 bg-white/20 mx-2"></div>
                            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest hidden md:block">Use o toque (pinch) ou double-click</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <footer className="mt-20 py-12 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">
                        © 2026 Unitech Cellular Distribuidora - Todos os direitos reservados
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default CatalogLanding;
