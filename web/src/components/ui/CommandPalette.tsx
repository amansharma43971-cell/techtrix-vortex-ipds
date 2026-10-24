import React, { useState, useEffect } from 'react';
import { Search, X, Building2, Send, Truck, Layers, ShieldAlert, Scale, Inbox, ShieldCheck, BarChart3, QrCode } from 'lucide-react';
import { useUIStore, ScreenId } from '../../stores/uiStore';
import { MOCK_BATCHES, MOCK_RATION_SHOPS, MOCK_BINS } from '../../mocks/mockData';

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setCommandPaletteOpen, setActiveScreen } = useUIStore();
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const navigateTo = (screen: ScreenId) => {
    setActiveScreen(screen);
    setCommandPaletteOpen(false);
    setQuery('');
  };

  const filteredBatches = MOCK_BATCHES.filter(b => 
    b.batch_no.toLowerCase().includes(query.toLowerCase()) || 
    b.supplier.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const filteredShops = MOCK_RATION_SHOPS.filter(s => 
    s.fps_code.toLowerCase().includes(query.toLowerCase()) || 
    s.owner_name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const filteredBins = MOCK_BINS.filter(b => 
    b.bin_code.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search batches, FPS shops, bins..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent px-3 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button 
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-3 text-xs">
          
          {/* Quick Screen Navigation */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block mb-1">
              Operational Navigation
            </span>
            <div className="grid grid-cols-2 gap-1">
              <button 
                onClick={() => navigateTo('tower')} 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-left"
              >
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Control Tower</span>
              </button>
              <button 
                onClick={() => navigateTo('dispatch')} 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-left"
              >
                <Send className="w-4 h-4 text-amber-400" />
                <span>FIFO Dispatch Engine</span>
              </button>
              <button 
                onClick={() => navigateTo('stock-allocation')} 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-left"
              >
                <Truck className="w-4 h-4 text-blue-400" />
                <span>Stock Allocation</span>
              </button>
              <button 
                onClick={() => navigateTo('inventory')} 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-left"
              >
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Inventory Ledger</span>
              </button>
              <button 
                onClick={() => navigateTo('quality')} 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-left"
              >
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Quality & Recalls</span>
              </button>
              <button 
                onClick={() => navigateTo('audit')} 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-left"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Forensic Audit Trace</span>
              </button>
            </div>
          </div>

          {/* Batches Search */}
          {filteredBatches.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block mb-1">
                Batches
              </span>
              {filteredBatches.map(b => (
                <div 
                  key={b.id}
                  onClick={() => navigateTo('inventory')}
                  className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-800 cursor-pointer font-mono text-slate-300 hover:text-white"
                >
                  <span className="font-bold">{b.batch_no}</span>
                  <span className="text-slate-500 text-[11px]">{b.bin_code} | {b.current_qty_g / 1000} kg</span>
                </div>
              ))}
            </div>
          )}

          {/* Ration Shops Search */}
          {filteredShops.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block mb-1">
                Fair Price Shops (FPS)
              </span>
              {filteredShops.map(s => (
                <div 
                  key={s.id}
                  onClick={() => navigateTo('dispatch')}
                  className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-800 cursor-pointer text-slate-300 hover:text-white"
                >
                  <span className="font-mono font-bold">{s.fps_code}</span>
                  <span className="text-slate-400">{s.owner_name} ({s.village_ward})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="bg-slate-950 px-4 py-2 text-[11px] text-slate-500 flex justify-between border-t border-slate-800">
          <span>Navigate with mouse or keys</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};

