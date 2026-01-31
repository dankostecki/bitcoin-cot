import React from 'react';
import { EDUCATIONAL_CONTENT, COMMERCIAL_VS_NONCOMM } from '../constants';
import { X, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EducationDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-slate-900 h-full border-l border-orange-500/30 overflow-y-auto shadow-2xl p-6 transform transition-transform duration-300">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-orange-500 flex items-center gap-2">
            <Info className="w-6 h-6" />
            Uczestnicy Rynku (Słownik)
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-800 pb-2">Klasyfikacja CFTC</h3>
            <div className="space-y-6">
              {Object.values(EDUCATIONAL_CONTENT).map((item) => (
                <div key={item.name} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-orange-500/30 transition-colors">
                  <h4 className="font-bold text-orange-400 mb-2">{item.plName}</h4>
                  <p className="text-sm text-gray-300 mb-3 leading-relaxed">{item.description}</p>
                  <div className="bg-orange-500/10 p-3 rounded border-l-2 border-orange-500">
                    <p className="text-xs text-orange-200 italic">
                      <span className="font-bold text-orange-500 not-italic">Analityk: </span>
                      {item.insight}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-800 pb-2">Grupy Agregowane</h3>
            <div className="space-y-4">
              {COMMERCIAL_VS_NONCOMM.map((item) => (
                <div key={item.name} className="p-4 rounded-lg border border-slate-700">
                  <h4 className="font-bold text-gray-200">{item.plName}</h4>
                  <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-2 italic text-orange-400/80">{item.insight}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default EducationDrawer;