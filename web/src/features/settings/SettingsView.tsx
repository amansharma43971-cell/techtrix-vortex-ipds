import React, { useState } from 'react';
import { Settings, RotateCcw, ShieldCheck, Database, HelpCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { runFifoUnitTests } from '../../lib/fifo.test';

export const SettingsView: React.FC = () => {
  const { resetDemoData } = useStore();
  const [shelfLifeDays, setShelfLifeDays] = useState(360);
  const [unitPreference, setUnitPreference] = useState('Bags');
  const [testResults, setTestResults] = useState<{ name: string; passed: boolean; message?: string }[] | null>(null);

  const handleRunTests = () => {
    const res = runFifoUnitTests();
    setTestResults(res);
  };

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto">
      <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E6F0FE] text-[#1D6FE8] flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#0F172A]">Godown Settings &amp; System Configuration</h2>
            <p className="text-[13px] text-[#64748B]">Configure operational rules, test FIFO suites, and manage demo data</p>
          </div>
        </div>

        <button
          onClick={resetDemoData}
          className="px-4 py-2 rounded-lg border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 text-xs font-semibold flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Demo Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Settings Card */}
        <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-4">
          <h3 className="text-[16px] font-bold text-[#0F172A]">Operational Parameters</h3>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Shelf Life Threshold (Days before Warning Alert)
            </label>
            <input
              type="number"
              value={shelfLifeDays}
              onChange={(e) => setShelfLifeDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Batches reaching 80% of this threshold trigger an amber priority alert.
            </span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Stock Unit Display</label>
            <select
              value={unitPreference}
              onChange={(e) => setUnitPreference(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            >
              <option value="Bags">Bags (Standard 50kg bag)</option>
              <option value="Quintal">Quintals (100 kg)</option>
            </select>
          </div>
        </div>

        {/* Embedded Unit Test Runner */}
        <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[#0F172A]">FIFO Engine Verification Suite</h3>
            <button
              onClick={handleRunTests}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Run Unit Tests
            </button>
          </div>
          <p className="text-slate-600">
            Executes pure algorithmic verification of FIFO allocation, tie-breaks, hold exclusions, and shortfall bounds.
          </p>

          {testResults && (
            <div className="space-y-2 pt-2">
              {testResults.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    t.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="font-mono font-bold">{t.passed ? 'PASSED ✓' : 'FAILED ✗'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

