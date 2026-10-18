"use strict";

/**
 * Estadística de cada caja. Todo se calcula sobre los valores ya ordenados.
 *
 * Métodos de cuartiles (hay varios en uso y dan resultados distintos con pocas filas):
 * - linear:    interpolación lineal, R tipo 7 = Excel PERCENTILE.INC / QUARTILE.INC. El de Histogram. Gratis.
 * - exclusive: R tipo 6 = Excel PERCENTILE.EXC / QUARTILE.EXC. Pro.
 * - hinges:    bisagras de Tukey: mediana de cada mitad (con la mediana incluida si n es impar). Pro.
 */
export type QuartileMethod = "linear" | "exclusive" | "hinges";
export type WhiskerRule = "tukey" | "minmax" | "p5" | "p10";

export interface BoxStats {
    n: number;
    min: number; max: number;
    q1: number; median: number; q3: number;
    mean: number; sd: number;
    lowWhisker: number; highWhisker: number;
    /** Intervalo de confianza aproximado (95 %) de la mediana: median ± 1,58·IQR/√n (McGill, Tukey y Larsen, 1978). */
    notchLow: number; notchHigh: number;
    outliers: number[];
}

export function quantile(sorted: number[], p: number, method: QuartileMethod): number {
    const n = sorted.length;
    if (n === 0) return NaN;
    if (n === 1) return sorted[0];
    if (method === "exclusive") {
        const h = (n + 1) * p;
        if (h <= 1) return sorted[0];
        if (h >= n) return sorted[n - 1];
        const lo = Math.floor(h);
        return sorted[lo - 1] + (h - lo) * (sorted[lo] - sorted[lo - 1]);
    }
    if (method === "hinges" && (p === 0.25 || p === 0.75)) {
        const half = Math.ceil(n / 2);                   // con n impar la mediana entra en las dos mitades
        const part = p === 0.25 ? sorted.slice(0, half) : sorted.slice(n - half);
        return quantile(part, 0.5, "linear");
    }
    const idx = p * (n - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function boxStats(sorted: number[], method: QuartileMethod, rule: WhiskerRule): BoxStats {
    const n = sorted.length;
    const q1 = quantile(sorted, 0.25, method);
    const median = quantile(sorted, 0.5, method === "hinges" ? "linear" : method);
    const q3 = quantile(sorted, 0.75, method);
    const iqr = q3 - q1;
    let sum = 0;
    for (const v of sorted) sum += v;
    const mean = sum / n;
    let ss = 0;
    for (const v of sorted) ss += (v - mean) * (v - mean);
    const sd = n > 1 ? Math.sqrt(ss / (n - 1)) : 0;

    // Bigotes: hasta el último dato DENTRO del límite, no hasta el límite (convención de Tukey).
    let lo: number, hi: number;
    switch (rule) {
        case "minmax": lo = -Infinity; hi = Infinity; break;
        case "p5": lo = quantile(sorted, 0.05, "linear"); hi = quantile(sorted, 0.95, "linear"); break;
        case "p10": lo = quantile(sorted, 0.10, "linear"); hi = quantile(sorted, 0.90, "linear"); break;
        default: lo = q1 - 1.5 * iqr; hi = q3 + 1.5 * iqr;
    }
    let lowWhisker = q1, highWhisker = q3;
    const outliers: number[] = [];
    for (const v of sorted) {
        if (v < lo || v > hi) { outliers.push(v); continue; }
        if (v < lowWhisker) lowWhisker = v;
        if (v > highWhisker) highWhisker = v;
    }
    const half = n > 0 ? 1.58 * iqr / Math.sqrt(n) : 0;
    return {
        n, min: sorted[0], max: sorted[n - 1], q1, median, q3, mean, sd,
        lowWhisker, highWhisker, notchLow: median - half, notchHigh: median + half, outliers,
    };
}

/**
 * Densidad por núcleo gaussiano para el violín. Ancho de banda de Silverman; se evalúa en `steps`
 * puntos entre min y max de la caja (el violín no se inventa cola fuera de los datos).
 */
export function density(sorted: number[], sd: number, q1: number, q3: number, steps = 48, minBw = 0): { y: number; d: number }[] {
    const n = sorted.length;
    if (n < 3) return [];
    const spread = Math.min(sd, (q3 - q1) / 1.34) || sd || 1;
    // Con datos enteros (notas de 1 a 10) un ancho menor que ~0,6 dibuja una "cintura" entre cada valor:
    // forma que los datos no tienen. minBw lo evita.
    const bw = Math.max(minBw, 0.9 * spread * Math.pow(n, -0.2)) || 1;
    const lo = sorted[0], hi = sorted[n - 1];
    if (hi <= lo) return [];
    // Muestreo para que 30.000 filas no cuesten 48 × 30.000 exponenciales por caja.
    const sample = n > 2000 ? sorted.filter((_, i) => i % Math.ceil(n / 2000) === 0) : sorted;
    const out: { y: number; d: number }[] = [];
    for (let i = 0; i <= steps; i++) {
        const y = lo + (hi - lo) * i / steps;
        let s = 0;
        for (const v of sample) { const z = (y - v) / bw; s += Math.exp(-0.5 * z * z); }
        out.push({ y, d: s / (sample.length * bw * Math.sqrt(2 * Math.PI)) });
    }
    return out;
}

/** Marcas del eje: 1, 2, 2.5 o 5 por potencia de diez, unas `count` marcas. */
export function niceTicks(lo: number, hi: number, count: number, minStep = 0): { lo: number; hi: number; ticks: number[]; step: number } {
    if (!isFinite(lo) || !isFinite(hi)) return { lo: 0, hi: 1, ticks: [0, 1], step: 1 };
    if (lo === hi) { const d = Math.abs(lo) || 1; lo -= d / 2; hi += d / 2; }
    const raw = (hi - lo) / Math.max(1, count);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    // Con datos enteros (notas de 1 a 10, unidades) no hay marcas en 2,5: el paso mínimo es 1.
    const step = Math.max(minStep, (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p);
    const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
    const ticks: number[] = [];
    for (let v = a; v <= b + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
    return { lo: a, hi: b, ticks, step };
}

/** Pseudoaleatorio con semilla (mulberry32): el jitter no se mueve al repintar. */
export function seeded(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}
