import { Filter, Building } from 'lucide-react';
import { PERIOD_PRESETS } from '../lib/analytics';
import { Card, CardContent } from './ui/card';

// Barra de filtros compartilhada: presets de período + intervalo custom + seletor de unidade.
function DashboardFilters({
  periodPreset,
  setPeriodPreset,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  unitFilter,
  setUnitFilter,
  availablePrograms = [],
  showUnitFilter = true,
}) {
  return (
    <Card className="border-slate-100 shadow-lg shadow-slate-100/40 bg-white rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-5">
          {/* Presets de período */}
          <div className="space-y-2 flex-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-indigo-500" /> Período de análise
            </label>
            <div className="flex flex-wrap gap-2">
              {PERIOD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPeriodPreset(preset.id)}
                  className={`px-3.5 h-9 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    periodPreset === preset.id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {periodPreset === 'custom' && (
              <div className="flex flex-wrap items-end gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">De</label>
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd || undefined}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Até</label>
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart || undefined}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Seletor de unidade */}
          {showUnitFilter && (
            <div className="space-y-2 lg:w-64">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-indigo-500" /> Unidade
              </label>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="h-9 px-3 w-full rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="all">Todas as unidades</option>
                {availablePrograms.map((program) => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DashboardFilters;
