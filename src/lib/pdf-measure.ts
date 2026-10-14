import '@tanstack/react-start/server-only';

import * as fontkit from 'fontkit';

// Actual-width measurement for PDF money cells using the same Archivo faces
// the PDF registers. Sync render path reads a module-level cache warmed by
// ensureMeasureFonts() before renderToStream; heuristic fallback keeps PDFs
// generating even when the font fetch fails.

const REGULAR_FILE = 'Archivo-Regular.ttf';
const BOLD_FILE = 'Archivo-Bold.ttf';

/** A4 (595.28pt) minus 0.6in side padding — matches InvoicePDF page style. */
export const PDF_CONTENT_WIDTH_PT = 595.28 - 2 * 43.2;

function fontUrl(file: string): string {
	const base = (process.env.BETTER_AUTH_URL ?? '').replace(/\/$/, '');
	return `${base}/fonts/${file}`;
}

// biome-ignore lint/suspicious/noExplicitAny: fontkit types vary by bundler
const cache = new Map<string, any>();
let warmed = false;

async function loadFont(file: string): Promise<unknown | null> {
	const hit = cache.get(file);
	if (hit) return hit;
	try {
		const res = await fetch(fontUrl(file));
		if (!res.ok) return null;
		const font = fontkit.create(Buffer.from(await res.arrayBuffer()));
		cache.set(file, font);
		return font;
	} catch {
		return null;
	}
}

/**
 * Warm the font cache. Call (awaited) in the server fn before renderToStream.
 * Never throws — measurement falls back to a per-char heuristic.
 */
export async function ensureMeasureFonts(): Promise<void> {
	if (warmed) return;
	warmed = true;
	await Promise.all([loadFont(REGULAR_FILE), loadFont(BOLD_FILE)]);
}

/** Advance width in pt for text at fontSizePt. Real glyph advances when warmed. */
export function measureTextPt(
	text: string,
	fontSizePt: number,
	bold: boolean,
): number {
	const font = cache.get(bold ? BOLD_FILE : REGULAR_FILE);
	if (!font) return text.length * fontSizePt * 0.55;
	try {
		const run = font.layout(text);
		return (run.advanceWidth * fontSizePt) / font.unitsPerEm;
	} catch {
		return text.length * fontSizePt * 0.55;
	}
}

export const MONEY_BODY_SIZES = [9, 8, 7.5] as const;
export const MONEY_HEADER_SIZES = [7, 6.5] as const;

/** Largest size where every text (plus letter-spacing) fits contentWidthPt. */
export function pickFittingSize(
	texts: Array<string>,
	contentWidthPt: number,
	sizes: ReadonlyArray<number>,
	bold: boolean,
	letterSpacingPt = 0,
): number {
	for (const size of sizes) {
		let fits = true;
		for (const text of texts) {
			if (
				measureTextPt(text, size, bold) + text.length * letterSpacingPt >
				contentWidthPt
			) {
				fits = false;
				break;
			}
		}
		if (fits) return size;
	}
	return sizes[sizes.length - 1];
}

/**
 * Manual comma-split fallback for spaceless money strings. react-pdf can only
 * wrap at spaces cleanly (hyphenation breaks render a "-" glyph, corrupting
 * figures), so overlong values are pre-split into stacked lines here instead.
 * Prefers the rightmost comma that leaves both halves fitting.
 */
export function splitMoneyLines(
	text: string,
	fontSizePt: number,
	contentWidthPt: number,
	bold: boolean,
): Array<string> {
	if (measureTextPt(text, fontSizePt, bold) <= contentWidthPt) return [text];
	const commas: Array<number> = [];
	for (let i = 0; i < text.length; i++) {
		if (text[i] === ',') commas.push(i);
	}
	for (let c = commas.length - 1; c >= 0; c--) {
		const head = text.slice(0, commas[c] + 1);
		const tail = text.slice(commas[c] + 1);
		if (
			measureTextPt(head, fontSizePt, bold) <= contentWidthPt &&
			measureTextPt(tail, fontSizePt, bold) <= contentWidthPt
		) {
			return [head, tail];
		}
	}
	return [text];
}
