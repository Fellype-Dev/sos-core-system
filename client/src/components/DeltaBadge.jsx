import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

// Badge de variação percentual vs. período anterior.
function DeltaBadge({ value, suffix = '', label }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;

  const flat = value === 0;
  const up = value > 0;
  const color = flat
    ? 'text-slate-400 bg-slate-100'
    : up
      ? 'text-emerald-600 bg-emerald-50'
      : 'text-red-600 bg-red-50';
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${color}`}
      title={label ? `${label} vs. período anterior` : 'Variação vs. período anterior'}
    >
      <Icon className="h-3 w-3" />
      {up ? '+' : ''}{value}{suffix}
    </span>
  );
}

export default DeltaBadge;
