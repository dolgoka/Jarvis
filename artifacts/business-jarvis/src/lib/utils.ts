import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatMoney(value: number, currency: string): string {
  if (currency === "RUB") {
    if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} млрд ₽`;
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} млн ₽`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)} тыс ₽`;
    return `${value.toFixed(0)} ₽`;
  }
  return formatCurrency(value);
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}
