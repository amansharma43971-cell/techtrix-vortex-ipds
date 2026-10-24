import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { formatQuantity } from '../../lib/formatters';

interface QuantityTextProps {
  qtyGrams: number | bigint;
  includeUnit?: boolean;
  className?: string;
}

export const QuantityText: React.FC<QuantityTextProps> = ({ qtyGrams, includeUnit = true, className = '' }) => {
  const { unitPreference } = useUIStore();
  const formatted = formatQuantity(qtyGrams, unitPreference, includeUnit);

  return (
    <span className={`tabular-nums font-mono font-semibold tracking-tight ${className}`}>
      {formatted}
    </span>
  );
};

