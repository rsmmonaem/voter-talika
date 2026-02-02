
import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, MapPin, User, Calendar, Briefcase, ChevronRight, Users, Layers, Map, X, Printer, Download, FilterX, ArrowUpRight, Moon, Sun } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';

const toBanglaDigits = (str, isNumber = false) => {
    const banglaMap = {
        '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
        '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };

    let input = String(str);
    if (isNumber && !isNaN(str)) {
        // Format with commas (South Asian style: 4,13,377)
        input = new Intl.NumberFormat('bn-BD').format(str);
    }

    return input.split('').map(char => banglaMap[char] || char).join('');
};

export default function App() {
    const [voters, setVoters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState({});

    const [selectedUpazila, setSelectedUpazila] = useState('');
    const [selectedUnion, setSelectedUnion] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedDob, setSelectedDob] = useState('');

    const [selectedVoter, setSelectedVoter] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const modalRef = useRef(null);

    const convertDateToBangla = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return toBanglaDigits(`${day}/${month}/${year}`);
    };

    useEffect(() => {
        fetchFilters();
        searchVoters();
    }, []);

    const fetchFilters = async () => {
        try {
            const res = await axios.get(`${API_BASE}/filters`);
            setFilters(res.data);
        } catch (err) { console.error("Filter fetch error", err); }
    };

    const searchVoters = async (pageNum = 1) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/voters`, {
                params: {
                    q: query,
                    upazila: selectedUpazila,
                    union: selectedUnion,
                    ward: selectedWard,
                    area_code: selectedArea,
                    dob: convertDateToBangla(selectedDob),
                    page: pageNum
                }
            });
            if (pageNum === 1) setVoters(res.data.data);
            else setVoters(prev => [...prev, ...res.data.data]);
            setTotal(res.data.total);
            setPage(pageNum);
        } catch (err) { console.error("Search error", err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        searchVoters(1);
    }, [selectedUpazila, selectedUnion, selectedWard, selectedArea, selectedDob]);

    const upazilas = Object.keys(filters);
    const unions = selectedUpazila ? Object.keys(filters[selectedUpazila] || {}) : [];
    const wards = (selectedUpazila && selectedUnion) ? Object.keys(filters[selectedUpazila][selectedUnion] || {}) : [];
    const areas = (selectedUpazila && selectedUnion && selectedWard) ? (filters[selectedUpazila][selectedUnion][selectedWard] || []) : [];

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        if (!modalRef.current) return;
        const canvas = await html2canvas(modalRef.current, {
            scale: 2,
            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
        pdf.save(`voter_${selectedVoter.voter_no}.pdf`);
    };

    return (
        <div className={`min-h-screen pb-20 transition-colors duration-300 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
            {/* Solid Header */}
            <header className={`no-print pt-10 pb-6 px-4 border-b-4 ${isDarkMode ? 'border-white bg-black' : 'border-black bg-white'}`}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
                        <div className="flex items-center gap-6">
                            <div className={`w-20 h-20 flex items-center justify-center border-4 box-content ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`}>
                                <Users size={40} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">ভোটাল তালিকা অনুসন্ধান</h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className={`text-xs font-black px-2 py-1 uppercase tracking-[0.4em] ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>District: Sherpur</span>
                                    <button
                                        onClick={() => setIsDarkMode(!isDarkMode)}
                                        className={`p-1.5 border-2 ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'} transition-all`}
                                    >
                                        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`px-8 py-4 border-2 font-black uppercase tracking-widest transition-all shadow-[4px_4px_0px_0px] hover:shadow-none hover:translate-x-1 hover:translate-y-1 ${isDarkMode ? 'border-white shadow-white ' + (isFilterOpen ? 'bg-white text-black' : 'bg-black text-white') : 'border-black shadow-black ' + (isFilterOpen ? 'bg-black text-white' : 'bg-white text-black')}`}
                            >
                                <Filter size={20} className="inline mr-2" /> ফিল্টার
                            </button>
                            <div className={`px-8 py-3 border-2 shadow-[4px_4px_0px_0px] flex flex-col items-end ${isDarkMode ? 'border-white bg-black shadow-white' : 'border-black bg-white shadow-black'}`}>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">মোট ভোটার</span>
                                <span className="text-2xl font-black">{toBanglaDigits(total, true)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative max-w-4xl mx-auto">
                        <form onSubmit={(e) => { e.preventDefault(); searchVoters(1); }} className="relative group">
                            <Search className={`absolute left-6 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-white' : 'text-black'}`} size={30} strokeWidth={3} />
                            <input
                                type="text"
                                placeholder="নাম বা ভোটার নং দিয়ে অনুসন্ধান..."
                                className={`w-full pl-16 pr-8 py-7 border-4 outline-none text-2xl font-black transition-all shadow-[8px_8px_0px_0px] focus:shadow-none focus:translate-x-2 focus:translate-y-2 ${isDarkMode ? 'bg-black border-white text-white shadow-white placeholder:text-slate-700' : 'bg-white border-black text-black shadow-black placeholder:text-slate-300'}`}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </form>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 mt-12">
                {/* Solid Filter Panel */}
                <AnimatePresence>
                    {isFilterOpen && (
                        <motion.section
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className={`no-print overflow-hidden mb-16 border-b-4 pb-12 ${isDarkMode ? 'border-white' : 'border-black'}`}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 p-1">
                                <FilterGroup label="উপজেলা" icon={<MapPin size={18} />} dark={isDarkMode}>
                                    <select
                                        value={selectedUpazila}
                                        onChange={(e) => { setSelectedUpazila(e.target.value); setSelectedUnion(''); setSelectedWard(''); setSelectedArea(''); }}
                                        className={`w-full px-5 py-4 border-2 font-black text-lg outline-none appearance-none cursor-pointer ${isDarkMode ? 'bg-black border-white text-white' : 'bg-white border-black text-black'}`}
                                    >
                                        <option value="">সকল উপজেলা</option>
                                        {upazilas.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </FilterGroup>

                                <FilterGroup label="ইউনিয়ন" icon={<Layers size={18} />} dark={isDarkMode} disabled={!selectedUpazila}>
                                    <select
                                        value={selectedUnion}
                                        disabled={!selectedUpazila}
                                        onChange={(e) => { setSelectedUnion(e.target.value); setSelectedWard(''); setSelectedArea(''); }}
                                        className={`w-full px-5 py-4 border-2 font-black text-lg outline-none appearance-none disabled:opacity-30 ${isDarkMode ? 'bg-black border-white text-white' : 'bg-white border-black text-black'}`}
                                    >
                                        <option value="">সকল ইউনিয়ন</option>
                                        {unions.map(un => <option key={un} value={un}>{un}</option>)}
                                    </select>
                                </FilterGroup>

                                <FilterGroup label="ওয়ার্ড নং" icon={<Map size={18} />} dark={isDarkMode} disabled={!selectedUnion}>
                                    <select
                                        value={selectedWard}
                                        disabled={!selectedUnion}
                                        onChange={(e) => { setSelectedWard(e.target.value); setSelectedArea(''); }}
                                        className={`w-full px-5 py-4 border-2 font-black text-lg outline-none appearance-none disabled:opacity-30 ${isDarkMode ? 'bg-black border-white text-white' : 'bg-white border-black text-black'}`}
                                    >
                                        <option value="">সকল ওয়ার্ড</option>
                                        {wards.map(w => <option key={w} value={w}>ওয়ার্ড - {toBanglaDigits(w)}</option>)}
                                    </select>
                                </FilterGroup>

                                <FilterGroup label="ভোটার এলাকা" icon={<MapPin size={18} />} dark={isDarkMode} disabled={!selectedWard}>
                                    <select
                                        value={selectedArea}
                                        disabled={!selectedWard}
                                        onChange={(e) => setSelectedArea(e.target.value)}
                                        className={`w-full px-5 py-4 border-2 font-black text-lg outline-none appearance-none disabled:opacity-30 ${isDarkMode ? 'bg-black border-white text-white' : 'bg-white border-black text-black'}`}
                                    >
                                        <option value="">সকল এলাকা</option>
                                        {areas.map((a) => <option key={a.code} value={a.code}>{toBanglaDigits(a.code)} - {a.name}</option>)}
                                    </select>
                                </FilterGroup>

                                <FilterGroup label="জন্ম তারিখ" icon={<Calendar size={18} />} dark={isDarkMode}>
                                    <input
                                        type="date"
                                        value={selectedDob}
                                        onChange={(e) => setSelectedDob(e.target.value)}
                                        className={`w-full px-5 py-4 border-2 font-black text-lg outline-none ${isDarkMode ? 'bg-black border-white text-white color-scheme-dark' : 'bg-white border-black text-black'}`}
                                    />
                                </FilterGroup>

                                <div className="flex items-end">
                                    <button
                                        onClick={() => { setSelectedUpazila(''); setSelectedUnion(''); setSelectedWard(''); setSelectedArea(''); setSelectedDob(''); setQuery(''); }}
                                        className={`w-full px-5 py-4 border-2 font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${isDarkMode ? 'bg-black border-white text-white hover:bg-white hover:text-black' : 'bg-white border-black text-black hover:bg-black hover:text-white'}`}
                                    >
                                        <FilterX size={20} /> রিসেট ফিল্টার
                                    </button>
                                </div>
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

                {/* Responsive Brutalist Result Grid */}
                {/* Mobile: 2, Tablet: 3, Desktop: 4 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-10">
                    <AnimatePresence>
                        {voters.map((voter, index) => (
                            <motion.div
                                key={voter.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index % 12 * 0.03 }}
                                onClick={() => setSelectedVoter(voter)}
                                className={`brutalist-card p-6 md:p-8 cursor-pointer group flex flex-col justify-between min-h-[260px] md:min-h-[300px] transition-colors duration-300 ${isDarkMode ? 'bg-black border-white text-white hover:bg-white hover:text-black hover:shadow-white' : 'bg-white border-black text-black hover:bg-black hover:text-white hover:shadow-black'}`}
                            >
                                <div className="space-y-4 md:space-y-6">
                                    <div className={`flex items-center justify-between border-b-2 pb-3 md:pb-4 ${isDarkMode ? 'border-white group-hover:border-black' : 'border-black group-hover:border-white'}`}>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase opacity-60">Serial</span>
                                            <span className="text-sm font-black">{toBanglaDigits(voter.serial_no)}</span>
                                        </div>
                                        <ArrowUpRight className="transition-all duration-300 group-hover:scale-125" size={20} />
                                    </div>

                                    <div>
                                        <h3 className="text-xl md:text-2xl font-black leading-tight mb-2 group-hover:underline line-clamp-2">{voter.name}</h3>
                                        <p className={`text-[9px] font-black border-2 px-1.5 py-0.5 inline-block uppercase tracking-widest ${isDarkMode ? 'border-white group-hover:border-black' : 'border-black group-hover:border-white'}`}>পিতা: {voter.father}</p>
                                    </div>
                                </div>

                                <div className="pt-6 md:pt-8 space-y-2 opacity-80 group-hover:opacity-100">
                                    <div className="flex items-center gap-2 font-black text-xs">
                                        <User size={14} strokeWidth={3} />
                                        <span className="tracking-widest">{toBanglaDigits(voter.voter_no)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 font-bold text-[9px] md:text-[10px] truncate">
                                        <MapPin size={14} strokeWidth={3} />
                                        <span>{voter.address}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-40 gap-8">
                        <div className={`w-20 h-20 border-8 animate-spin ${isDarkMode ? 'border-slate-800 border-t-white' : 'border-slate-100 border-t-black'}`} />
                        <p className="text-lg font-black uppercase tracking-[1em] animate-pulse">SEARCHING...</p>
                    </div>
                )}

                {!loading && voters.length < total && (
                    <button
                        onClick={() => searchVoters(page + 1)}
                        className={`w-full py-8 mt-20 border-4 font-black uppercase text-xl tracking-[0.5em] shadow-[12px_12px_0px_0px] hover:shadow-none hover:translate-x-3 hover:translate-y-3 transition-all ${isDarkMode ? 'bg-black border-white text-white shadow-white hover:bg-white hover:text-black' : 'bg-white border-black text-black shadow-black hover:bg-black hover:text-white'}`}
                    >
                        Load More
                    </button>
                )}
            </main>

            {/* Brutalist Modal - Smaller Size */}
            <AnimatePresence>
                {selectedVoter && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedVoter(null)}
                            className={`absolute inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className={`relative w-full max-w-lg border-[6px] shadow-[16px_16px_0px_0px] overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-black border-white shadow-white text-white' : 'bg-white border-black shadow-black text-black'}`}
                        >
                            {/* Modal Header - Fixed */}
                            <div className={`p-4 border-b-[6px] flex items-center justify-between no-print flex-shrink-0 ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`}>
                                <div className="flex items-center gap-3">
                                    <User size={20} strokeWidth={3} />
                                    <h2 className="text-lg font-black uppercase tracking-tighter">ভোটার প্রোফাইল</h2>
                                </div>
                                <button
                                    onClick={() => setSelectedVoter(null)}
                                    className="p-1 hover:rotate-90 transition-all duration-300"
                                >
                                    <X size={24} strokeWidth={3} />
                                </button>
                            </div>

                            {/* Modal Content - Scrollable */}
                            <div className="overflow-y-auto flex-grow custom-scrollbar">
                                <div id="print-modal" ref={modalRef} className={`p-6 md:p-8 space-y-6 transition-colors duration-300 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                    <div className={`flex justify-between items-start border-b-4 pb-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black uppercase opacity-60">ভোটার সিরিয়াল নং</span>
                                            <p className="text-2xl font-black">{toBanglaDigits(selectedVoter.serial_no)}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black uppercase opacity-60">জাতীয় পরিচয়পত্র নং</span>
                                            <p className="text-xl font-black">{toBanglaDigits(selectedVoter.voter_no)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <Detail label="নাম (Name)" value={selectedVoter.name} large dark={isDarkMode} />

                                        <div className="grid grid-cols-1 gap-6">
                                            <Detail label="পিতার নাম (Father's Name)" value={selectedVoter.father} dark={isDarkMode} />
                                            <Detail label="মাতার নাম (Mother's Name)" value={selectedVoter.mother} dark={isDarkMode} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Detail label="জন্ম তারিখ (DOB)" value={toBanglaDigits(selectedVoter.dob)} dark={isDarkMode} />
                                            <Detail label="পেশা (Occupation)" value={selectedVoter.occupation} dark={isDarkMode} />
                                        </div>

                                        <div className={`space-y-3 pt-4 border-t-2 ${isDarkMode ? 'border-white/20' : 'border-black/10'}`}>
                                            <div className="flex flex-wrap gap-2">
                                                <Tag label="উপজেলা" value={selectedVoter.upazila} dark={isDarkMode} />
                                                <Tag label="ইউনিয়ন" value={selectedVoter.union_name} dark={isDarkMode} />
                                                <Tag label="ওয়ার্ড" value={toBanglaDigits(selectedVoter.ward)} dark={isDarkMode} />
                                            </div>
                                            <div className={`p-3 border-l-4 ${isDarkMode ? 'bg-white/5 border-white' : 'bg-black/5 border-black'}`}>
                                                <span className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-50">স্থায়ী ঠিকানা</span>
                                                <p className="text-sm font-black leading-snug">{selectedVoter.address}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`pt-4 flex items-center justify-between font-black text-[8px] uppercase tracking-[0.2em] border-t-2 opacity-50 ${isDarkMode ? 'border-white' : 'border-black'}`}>
                                        <p>VOTER SEARCH V4.3</p>
                                        <p>{new Date().toLocaleDateString('bn-BD')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Actions - Fixed at bottom */}
                            <div className={`p-4 border-t-[6px] flex gap-3 no-print flex-shrink-0 ${isDarkMode ? 'bg-black border-white' : 'bg-white border-black'}`}>
                                <button
                                    onClick={handlePrint}
                                    className={`flex-1 py-3 border-4 font-black uppercase text-[10px] tracking-widest transition-all shadow-[4px_4px_0px_0px] hover:shadow-none ${isDarkMode ? 'bg-black border-white text-white shadow-white hover:bg-white hover:text-black' : 'bg-white border-black text-black shadow-black hover:bg-black hover:text-white'}`}
                                >
                                    <Printer size={16} className="inline mr-2" /> প্রিন্ট
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    className={`flex-1 py-3 font-black uppercase text-[10px] tracking-widest border-4 transition-all shadow-[4px_4px_0px_0px] hover:shadow-none ${isDarkMode ? 'bg-white text-black border-white shadow-white hover:bg-black hover:text-white' : 'bg-black text-white border-black shadow-black hover:bg-white hover:text-black'}`}
                                >
                                    <Download size={16} className="inline mr-2" /> PDF
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function FilterGroup({ label, icon, children, disabled, dark }) {
    return (
        <div className={`space-y-3 ${disabled ? 'opacity-20 pointer-events-none' : ''}`}>
            <label className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${dark ? 'text-white' : 'text-black'}`}>
                {icon} {label}
            </label>
            <div className="relative group">
                {children}
            </div>
        </div>
    );
}

function Detail({ label, value, large, dark }) {
    return (
        <div className="space-y-0.5">
            <span className={`text-[9px] font-black uppercase tracking-widest block opacity-50 ${dark ? 'text-white' : 'text-black'}`}>{label}</span>
            <span className={`${large ? 'text-2xl font-black uppercase' : 'text-lg font-black uppercase'} ${dark ? 'text-white' : 'text-black'} block leading-tight`}>{value || '---'}</span>
        </div>
    );
}

function Tag({ label, value, dark }) {
    return (
        <div className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border ${dark ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`}>
            {label}: {value}
        </div>
    );
}

