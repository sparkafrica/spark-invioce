'use client';

import { type RefObject, useEffect, useState } from 'react';

/**
 * Actual-measured shrink step for money columns. Measures the widest text
 * with canvas (Archivo once loaded) against the real container width and
 * returns the first sizesPx index that fits. Re-measures on resize and font
 * load. Never below the last (floor) size — residual overflow wraps via
 * <wbr> breaks and is clipped by overflow-hidden on the cell.
 */
export function useFittedMoneyStep(
	containerRef: RefObject<HTMLElement | null>,
	texts: Array<string>,
	colPct: number,
	sizesPx: Array<number>,
	weight: number,
): number {
	const [step, setStep] = useState(0);
	const key = texts.join('￾');

	// biome-ignore lint/correctness/useExhaustiveDependencies: key carries texts
	useEffect(() => {
		const el = containerRef.current;
		if (!el || typeof document === 'undefined') return;
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		let cancelled = false;
		const compute = () => {
			if (cancelled) return;
			const avail = el.clientWidth * (colPct / 100) - 8;
			let next = sizesPx.length - 1;
			for (let s = 0; s < sizesPx.length; s++) {
				ctx.font = `${weight} ${sizesPx[s]}px Archivo, sans-serif`;
				let widest = 0;
				for (const t of texts) {
					const w = ctx.measureText(t).width;
					if (w > widest) widest = w;
				}
				if (widest <= avail) {
					next = s;
					break;
				}
			}
			setStep(next);
		};
		compute();
		const ro = new ResizeObserver(compute);
		ro.observe(el);
		document.fonts?.ready.then(compute).catch(() => {});
		return () => {
			cancelled = true;
			ro.disconnect();
		};
	}, [containerRef, colPct, key]);

	return step;
}

/** Split a money string after commas with <wbr> so browsers wrap cleanly. */
export function moneyWithBreaks(text: string): Array<string> {
	return text.split(/(?<=,)/);
}
