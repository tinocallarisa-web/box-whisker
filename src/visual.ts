"use strict";

import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";
import { dataViewWildcard } from "powerbi-visuals-utils-dataviewutils";
import {
    HtmlSubSelectableClass, HtmlSubSelectionHelper, SubSelectableDisplayNameAttribute,
    SubSelectableObjectNameAttribute, SubSelectableTypeAttribute,
} from "powerbi-visuals-utils-onobjectutils";
import { BoxStats, QuartileMethod, WhiskerRule, boxStats, density, niceTicks, seeded } from "./stats";
import { STRINGS } from "./strings";
import { LANDING_ICON } from "./landingIcon";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import DataView = powerbi.DataView;

const SVG = "http://www.w3.org/2000/svg";

// ─── Licencia ─────────────────────────────────────────────────────────────────

/** Plan de pago. El Service ID que llega es editor.oferta.plan; se acepta también el Plan ID solo. */
const PLAN_IDS = ["box-whisker-pro"];
/** Y cualquier otro plan de pago de esta oferta (tramos, anual, privados) sin sacar versión. */
const OFFER_PREFIX = "tino_callarisa.box-whisker-tcviz.";
const STATE_ACTIVE = 1;
const STATE_WARNING = 2;
/** LicenseNotificationType.General: const enum, en runtime hace falta el número. */
const NOTIFY_GENERAL = 0;
/** Diagnóstico de selección: build-test.js --debug lo pone a true. En producción, siempre false. */
const DEBUG_SEL = false;

function matchesPlan(sp: string, planId: string): boolean {
    return sp === planId || sp.endsWith("." + planId);
}
function isOurPaidPlan(spIdentifier: unknown): boolean {
    const sp = String(spIdentifier ?? "");
    if (PLAN_IDS.some(id => matchesPlan(sp, id))) return true;
    return sp.startsWith(OFFER_PREFIX) && !/free/i.test(sp.slice(OFFER_PREFIX.length));
}

/** Enlaces de la pantalla de inicio. ?ref= cuenta en la web las visitas que llegan desde el visual. */
const URL_GUIDE = "https://tinocallarisa-web.github.io/box-whisker/support.html";
const URL_PRODUCT = "https://tcviz.com/product/box-whisker/?ref=visual-boxplot";
const URL_VIDEO = "https://www.youtube.com/watch?v=OuzwKX96w4M";

// ─── Ajustes ──────────────────────────────────────────────────────────────────

interface Settings {
    template: string;
    orientation: string; fill: string; border: string; borderWidth: number; width: number; radius: number; opacity: number;
    quartileColors: boolean; lowerColor: string; upperColor: string; medianColor: string;
    whiskerRule: string; caps: boolean; whiskerColor: string;
    method: string; showN: boolean; medianLabel: boolean; showMean: boolean; meanColor: string; notches: boolean;
    points: boolean; jitter: number; pointSize: number; pointColor: string; pointBorderColor: string; pointBorderWidth: number;
    pointOpacity: number; outlierSize: number; outlierColor: string;
    violin: boolean; violinOpacity: number; violinColor: string;
    sortBy: string; descending: boolean;
    ref1: boolean; ref1Value: number; ref1Label: string; refColor: string; ref2: boolean; ref2Value: number; ref2Label: string;
    vAxis: boolean; vTitle: boolean; vTitleText: string; grid: boolean; vAuto: boolean; vMin: number; vMax: number;
    vFont: number; vColor: string; vFamily: string; vBold: boolean;
    cAxis: boolean; cFont: number; cColor: string; cFamily: string; cBold: boolean;
    legend: boolean; legendPos: string; legendFont: number; legendColor: string;
    table: boolean; tableFont: number; tableColor: string; tableHeaderBg: string; tableHeaderColor: string; tableBanding: string;
    smCols: number; smGap: number; smTitleSize: number; smTitleColor: string; smTitleBold: boolean; smTitleAlign: string;
    smBackground: string; smBorder: boolean; smBorderColor: string;
    background: string;
}

const DEFAULTS: Settings = {
    template: "clean",
    orientation: "vertical", fill: "#2B6CB0", border: "#2B6CB0", borderWidth: 1.5, width: 55, radius: 2, opacity: 30,
    quartileColors: false, lowerColor: "#88C0D0", upperColor: "#5E81AC", medianColor: "#1F4E80",
    whiskerRule: "tukey", caps: true, whiskerColor: "#605E5C",
    method: "linear", showN: true, medianLabel: false, showMean: false, meanColor: "#3E9C5B", notches: false,
    points: false, jitter: 60, pointSize: 2.5, pointColor: "#3D3929", pointBorderColor: "#FFFFFF", pointBorderWidth: 0,
    pointOpacity: 45, outlierSize: 3, outlierColor: "#B4541C",
    violin: false, violinOpacity: 18, violinColor: "",
    sortBy: "data", descending: false,
    ref1: false, ref1Value: 0, ref1Label: "", refColor: "#B4541C", ref2: false, ref2Value: 0, ref2Label: "",
    vAxis: true, vTitle: false, vTitleText: "", grid: true, vAuto: true, vMin: 0, vMax: 100, vFont: 11, vColor: "#605E5C", vFamily: "", vBold: false,
    cAxis: true, cFont: 11, cColor: "#605E5C", cFamily: "", cBold: false,
    legend: true, legendPos: "top", legendFont: 11, legendColor: "#605E5C",
    table: false, tableFont: 11, tableColor: "#3D3929", tableHeaderBg: "#F3F2F1", tableHeaderColor: "", tableBanding: "",
    smCols: 0, smGap: 8, smTitleSize: 12, smTitleColor: "#3D3929", smTitleBold: true, smTitleAlign: "left",
    smBackground: "", smBorder: false, smBorderColor: "#E1DFDD",
    background: "",
};

/**
 * Plantillas: un punto de partida. Solo rellenan lo que el usuario no ha tocado: un ajuste escrito
 * a mano (presente en metadata.objects) gana siempre a la plantilla.
 */
const TEMPLATES: Record<string, Partial<Settings>> = {
    clean: {},
    classic: { fill: "#FFFFFF", border: "#3D3929", medianColor: "#3D3929", opacity: 100, radius: 0, whiskerColor: "#3D3929", borderWidth: 1 },
    minimal: { opacity: 0, border: "#83827D", borderWidth: 1, medianColor: "#2B6CB0", caps: false, grid: false, radius: 0 },
    contrast: { fill: "#1F4E80", border: "#1F4E80", medianColor: "#FFFFFF", opacity: 100, whiskerColor: "#1F4E80", outlierColor: "#B4541C" },
    compact: { width: 40, vFont: 9, cFont: 9, outlierSize: 2, borderWidth: 1 },
    // Estética de IBCS (sobria, grises, sin adornos). Es un estilo: no afirma cumplimiento del estándar.
    ibcs: { fill: "#4D4D4D", border: "#4D4D4D", opacity: 100, radius: 0, borderWidth: 1, medianColor: "#FFFFFF",
        whiskerColor: "#4D4D4D", outlierColor: "#000000", grid: false, meanColor: "#FFFFFF",
        vColor: "#262626", cColor: "#262626", legendColor: "#262626", tableColor: "#262626", violinColor: "#808080" },
};

type Objects = powerbi.DataViewObjects | undefined;

function readSettings(objects: Objects): Settings {
    const tplName = (objects?.["style"]?.["template"] as string) || DEFAULTS.template;
    const tpl = TEMPLATES[tplName] || {};
    const pick = <K extends keyof Settings>(obj: string, prop: string, key: K): Settings[K] => {
        const raw = objects?.[obj]?.[prop];
        if (raw !== undefined && raw !== null) {
            if (typeof raw === "object" && (raw as any).solid) return (raw as any).solid.color as Settings[K];
            return raw as Settings[K];
        }
        return (tpl[key] !== undefined ? tpl[key] : DEFAULTS[key]) as Settings[K];
    };
    return {
        template: tplName,
        orientation: pick("boxes", "orientation", "orientation"), fill: pick("boxes", "fill", "fill"), border: pick("boxes", "border", "border"),
        borderWidth: pick("boxes", "borderWidth", "borderWidth"), width: pick("boxes", "width", "width"), radius: pick("boxes", "radius", "radius"),
        opacity: pick("boxes", "opacity", "opacity"), quartileColors: pick("boxes", "quartileColors", "quartileColors"),
        lowerColor: pick("boxes", "lowerColor", "lowerColor"), upperColor: pick("boxes", "upperColor", "upperColor"),
        medianColor: pick("boxes", "medianColor", "medianColor"),
        whiskerRule: pick("whiskers", "rule", "whiskerRule"), caps: pick("whiskers", "caps", "caps"), whiskerColor: pick("whiskers", "color", "whiskerColor"),
        method: pick("statistics", "method", "method"), showN: pick("statistics", "showN", "showN"),
        medianLabel: pick("statistics", "medianLabel", "medianLabel"), showMean: pick("statistics", "showMean", "showMean"),
        meanColor: pick("statistics", "meanColor", "meanColor"), notches: pick("statistics", "notches", "notches"),
        points: pick("points", "show", "points"), jitter: pick("points", "jitter", "jitter"), pointSize: pick("points", "size", "pointSize"),
        pointColor: pick("points", "color", "pointColor"), pointBorderColor: pick("points", "borderColor", "pointBorderColor"),
        pointBorderWidth: pick("points", "borderWidth", "pointBorderWidth"), pointOpacity: pick("points", "opacity", "pointOpacity"),
        outlierSize: pick("points", "outlierSize", "outlierSize"), outlierColor: pick("points", "outlierColor", "outlierColor"),
        violin: pick("violin", "show", "violin"), violinOpacity: pick("violin", "opacity", "violinOpacity"), violinColor: pick("violin", "color", "violinColor"),
        sortBy: pick("sort", "by", "sortBy"), descending: pick("sort", "descending", "descending"),
        ref1: pick("reference", "show", "ref1"), ref1Value: pick("reference", "value", "ref1Value"), ref1Label: pick("reference", "label", "ref1Label"),
        refColor: pick("reference", "color", "refColor"), ref2: pick("reference", "show2", "ref2"), ref2Value: pick("reference", "value2", "ref2Value"),
        ref2Label: pick("reference", "label2", "ref2Label"),
        vAxis: pick("valueAxis", "show", "vAxis"), vTitle: pick("valueAxis", "title", "vTitle"), vTitleText: pick("valueAxis", "titleText", "vTitleText"),
        grid: pick("valueAxis", "gridlines", "grid"), vAuto: pick("valueAxis", "auto", "vAuto"), vMin: pick("valueAxis", "min", "vMin"),
        vMax: pick("valueAxis", "max", "vMax"), vFont: pick("valueAxis", "fontSize", "vFont"), vColor: pick("valueAxis", "color", "vColor"),
        vFamily: pick("valueAxis", "fontFamily", "vFamily"), vBold: pick("valueAxis", "bold", "vBold"),
        cAxis: pick("categoryAxis", "show", "cAxis"), cFont: pick("categoryAxis", "fontSize", "cFont"), cColor: pick("categoryAxis", "color", "cColor"),
        cFamily: pick("categoryAxis", "fontFamily", "cFamily"), cBold: pick("categoryAxis", "bold", "cBold"),
        legend: pick("legend", "show", "legend"), legendPos: pick("legend", "position", "legendPos"),
        legendFont: pick("legend", "fontSize", "legendFont"), legendColor: pick("legend", "color", "legendColor"),
        table: pick("statsTable", "show", "table"), tableFont: pick("statsTable", "fontSize", "tableFont"),
        tableColor: pick("statsTable", "color", "tableColor"),
        tableHeaderBg: pick("statsTable", "headerBackground", "tableHeaderBg"), tableHeaderColor: pick("statsTable", "headerColor", "tableHeaderColor"),
        tableBanding: pick("statsTable", "banding", "tableBanding"),
        smCols: pick("smallMultiples", "columns", "smCols"), smGap: pick("smallMultiples", "gap", "smGap"),
        smTitleSize: pick("smallMultiples", "titleSize", "smTitleSize"), smTitleColor: pick("smallMultiples", "titleColor", "smTitleColor"),
        smTitleBold: pick("smallMultiples", "titleBold", "smTitleBold"), smTitleAlign: pick("smallMultiples", "titleAlign", "smTitleAlign"),
        smBackground: pick("smallMultiples", "background", "smBackground"), smBorder: pick("smallMultiples", "border", "smBorder"),
        smBorderColor: pick("smallMultiples", "borderColor", "smBorderColor"),
        background: pick("background", "color", "background"),
    };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));

// ─── Modelo ───────────────────────────────────────────────────────────────────

interface Box {
    key: string;
    cat: string; group: string | null; panel: string | null;
    values: number[];               // ordenados
    stats: BoxStats;
    id: ISelectionId | null;        // la primera fila: menú contextual
    ids: ISelectionId[];            // todas las filas de la caja: filtro, tooltip y marcadores
    ruleColor: string | null;       // color resuelto por la regla fx (formato condicional)
    tips: { name: string; value: string }[];
    seed: number;
}

interface ProFeature { id: string; label: string; }

// ─── Visual ───────────────────────────────────────────────────────────────────

export class Visual implements IVisual {
    private host: IVisualHost;
    private root: HTMLDivElement;
    private svg: SVGSVGElement;
    private tableEl: HTMLDivElement;
    private landingEl: HTMLDivElement;
    private watermarkEl: HTMLDivElement;
    private noteEl: HTMLDivElement;
    private selectionManager: ISelectionManager;
    private events: powerbi.extensibility.IVisualEventService;
    private loc: powerbi.extensibility.ILocalizationManager;
    private s: Settings = DEFAULTS;
    private boxes: Box[] = [];
    private cats: string[] = [];
    private groups: string[] = [];
    private panels: string[] = [];
    private valueName = "";
    private valueFormat: string | undefined;
    private allInt = true;
    private fmt: (v: number) => string = v => String(v);
    private fmtAxis: (v: number) => string = v => String(v);
    private lastOptions: VisualUpdateOptions | null = null;
    private lastDv: DataView | undefined;
    private hasData = false;
    private missingDetail = false;
    private focusKey = "";
    private restoredIds: ISelectionId[] = [];
    /** Clave de identidad -> caja, para casar selecciones y marcadores sin recorrer miles de identidades. */
    private idToBox = new Map<string, string>();
    private keySeq = 0;
    private keyboardNav = false;
    /** Formato desde el lienzo (on-object): el clic selecciona qué formatear, no filtra datos. */
    public visualOnObjectFormatting: powerbi.extensibility.visual.VisualOnObjectFormatting;
    private subSelectionHelper: HtmlSubSelectionHelper;
    private formatMode = false;
    /** Filas por bloques: Power BI entrega 30.000 cada vez; el visual pide las siguientes. */
    private lastFetchCount = 0;
    private fetchRounds = 0;
    private truncatedAt = 0;
    private readonly MAX_FETCH_ROUNDS = 40;

    // Licencia
    private isPro = false;
    private licenseRequested = false;
    private licenseResolved = false;
    private licenseEnvUnsupported = false;
    private lastBlockedNotice = "";
    private licenseIconShown = false;
    private licenseIconTimer: number | null = null;
    private destroyed = false;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.loc = options.host.createLocalizationManager();
        this.selectionManager = options.host.createSelectionManager();

        this.root = document.createElement("div");
        this.root.className = "tcbw";
        options.element.appendChild(this.root);
        this.svg = document.createElementNS(SVG, "svg") as SVGSVGElement;
        this.svg.setAttribute("role", "listbox");
        this.svg.setAttribute("aria-multiselectable", "true");
        this.root.appendChild(this.svg);
        this.tableEl = document.createElement("div");
        this.tableEl.className = "tcbw-table";
        this.root.appendChild(this.tableEl);
        this.landingEl = document.createElement("div");
        this.landingEl.className = "tcbw-landing";
        this.root.appendChild(this.landingEl);
        this.noteEl = document.createElement("div");
        this.noteEl.className = "tcbw-note";
        this.root.appendChild(this.noteEl);
        this.watermarkEl = document.createElement("div");
        this.watermarkEl.className = "tcbw-watermark";
        this.watermarkEl.setAttribute("aria-hidden", "true");
        this.root.appendChild(this.watermarkEl);

        this.subSelectionHelper = HtmlSubSelectionHelper.createHtmlSubselectionHelper({
            hostElement: options.element,
            subSelectionService: options.host.subSelectionService,
            selectionIdCallback: () => undefined,
        });
        this.visualOnObjectFormatting = {
            getSubSelectionStyles: (subs) => this.getSubSelectionStyles(subs),
            getSubSelectionShortcuts: (subs) => this.getSubSelectionShortcuts(subs),
            getSubSelectables: (filter) => this.subSelectionHelper.getAllSubSelectables(filter),
        };

        this.svg.addEventListener("click", (e) => {
            if ((e.target as Element).closest?.("[data-box]")) return;
            if (!this.canInteract || this.formatMode) return;
            this.selectionManager.clear().then(() => this.paintSelection());
        });
        this.svg.addEventListener("contextmenu", (e) => {
            if ((e.target as Element).closest?.("[data-box]")) return;
            e.preventDefault();
            if (!this.canInteract) return;
            this.selectionManager.showContextMenu({} as ISelectionId, { x: e.clientX, y: e.clientY });
        });
        // Marcadores y selección hecha desde fuera: solo repintar. Nunca persistProperties aquí.
        // Al restaurar un marcador Power BI pasa aquí los IDs; getSelectionIds() puede no tenerlos todavía.
        this.selectionManager.registerOnSelectCallback((ids: ISelectionId[]) => { this.restoredIds = ids || []; this.paintSelection(); });
    }

    public destroy(): void {
        this.destroyed = true;
        this.cancelLicenseIcon();
    }

    private get canInteract(): boolean {
        // hostCapabilities es donde la API 5.x lo pone; host.allowInteractions solo existía en versiones antiguas.
        const h: any = this.host;
        return (h.hostCapabilities?.allowInteractions ?? h.allowInteractions) !== false;
    }

    // ── Textos ────────────────────────────────────────────────────────────────

    /**
     * Primero la tabla del bundle (src/strings.ts): Power BI Desktop solo traduce con getDisplayName
     * las claves declaradas en capabilities.json, y los textos propios del visual no lo están.
     */
    private t(key: string, fallback: string): string {
        const own = this.stringsFor()?.[key];
        if (own) return own;
        try { const v = this.loc.getDisplayName(key); return v && v !== key ? v : fallback; } catch { return fallback; }
    }

    private stringsFor(): Record<string, string> | undefined {
        const loc = String((this.host as any)?.locale || "");
        if (!loc || /^en/i.test(loc)) return undefined;
        if (STRINGS[loc]) return STRINGS[loc];
        const lang = loc.split("-")[0].toLowerCase();
        const k = Object.keys(STRINGS).sort().find(x => x.toLowerCase().startsWith(lang + "-"));
        return k ? STRINGS[k] : undefined;
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        try {
            this.lastOptions = options;
            const dv = options.dataViews?.[0];
            this.lastDv = dv;
            this.s = readSettings(dv?.metadata?.objects);
            this.formatMode = !!(options as any).formatMode;
            this.subSelectionHelper.setFormatMode(this.formatMode);
            if (dv && this.streamSegments(options, dv)) {
                // Se ha pedido el siguiente bloque: Power BI volverá a llamar a update() con todo junto.
                this.events.renderingFinished(options);
                return;
            }
            this.hasData = this.readData(dv);
            if (this.hasData) this.requestLicense();
            this.draw();
            this.updateOutlines(options);
            this.events.renderingFinished(options);
        } catch (e) {
            this.events.renderingFailed(options, String(e));
            console.error("[BoxWhisker]", e);
        }
    }

    private get isDesktop(): boolean {
        const env = Number((this.host as any)?.hostEnv);
        return isFinite(env) && env > 0 ? (env & 4) !== 0 : false;
    }

    private streamSegments(options: VisualUpdateOptions, dv: DataView): boolean {
        const op = (options as any).operationKind;
        if (op !== 1 && op !== 2) { this.lastFetchCount = 0; this.fetchRounds = 0; }   // Append y Segment continúan; el resto empieza de cero
        this.truncatedAt = 0;
        if (!dv.metadata?.segment) return false;
        const loaded = dv.categorical?.categories?.[0]?.values?.length ?? 0;
        if (!this.isDesktop && loaded > this.lastFetchCount && this.fetchRounds < this.MAX_FETCH_ROUNDS) {
            this.lastFetchCount = loaded;
            this.fetchRounds++;
            if (this.host.fetchMoreData(true)) return true;
        }
        this.truncatedAt = loaded;
        return false;
    }

    // ── Pro: qué se pide y qué se dibuja ──────────────────────────────────────

    private isEditing(): boolean {
        const vm = (this.lastOptions as any)?.viewMode;
        return typeof vm === "number" && vm !== 0;
    }

    /** Vista previa: sin licencia, editando y con la licencia ya leída. En lectura, siempre el resultado gratuito. */
    private isPreview(): boolean {
        return !this.isPro && this.isEditing() && this.licenseResolved && !this.licenseEnvUnsupported;
    }

    private get proActive(): boolean {
        return this.isPro || this.isPreview();
    }

    private roleBound(role: string): boolean {
        return !!this.lastDv?.categorical?.categories?.some(c => c.source.roles?.[role]);
    }

    /** Funciones de pago que el informe está pidiendo ahora (con nombre para la marca y el aviso). */
    private attemptedPro(): ProFeature[] {
        const s = this.s, out: ProFeature[] = [];
        const add = (on: boolean, id: string, key: string, fb: string) => { if (on) out.push({ id, label: this.t(key, fb) }); };
        add(this.roleBound("group"), "group", "Feat_group", "groups");
        add(this.roleBound("panel"), "panel", "Feat_panel", "small multiples");
        add(s.points, "points", "Feat_points", "all points");
        add(s.violin, "violin", "Feat_violin", "violin");
        add(s.quartileColors, "quartile", "Feat_quartile", "color by quartile");
        add(s.showMean, "mean", "Feat_mean", "mean marker");
        add(s.notches, "notches", "Feat_notches", "notches");
        add(s.method !== "linear", "method", "Feat_method", "quartile method");
        add(s.whiskerRule === "p5" || s.whiskerRule === "p10", "whiskers", "Feat_whiskers", "percentile whiskers");
        add(["median", "mean", "iqr", "count"].indexOf(s.sortBy) >= 0, "sort", "Feat_sort", "sort by statistic");
        add(s.ref1 || s.ref2, "reference", "Feat_reference", "reference lines");
        add(s.table, "table", "Feat_table", "statistics table");
        return out;
    }

    /** Ajustes que se dibujan: sin Pro activo, cada función de pago vuelve a su valor gratuito. */
    private effective(): Settings {
        if (this.proActive) return this.s;
        const s = { ...this.s };
        s.points = false; s.violin = false; s.quartileColors = false; s.showMean = false; s.notches = false;
        s.method = "linear";
        if (s.whiskerRule === "p5" || s.whiskerRule === "p10") s.whiskerRule = "tukey";
        if (["median", "mean", "iqr", "count"].indexOf(s.sortBy) >= 0) s.sortBy = "data";
        s.ref1 = false; s.ref2 = false; s.table = false;
        return s;
    }

    // ── Datos ─────────────────────────────────────────────────────────────────

    /** Cajas a partir de las filas. false = no hay nada que dibujar (pantalla de inicio). */
    private readData(dv: DataView | undefined): boolean {
        this.boxes = []; this.cats = []; this.groups = []; this.panels = [];
        this.idToBox.clear();
        this.missingDetail = false;
        const cats = dv?.categorical?.categories || [];
        // Con una jerarquía y "Expandir todo" llegan varias columnas con el rol: la caja es la combinación.
        const catCols = cats.filter(c => c.source.roles?.["category"]);
        const catCol = catCols[catCols.length - 1];
        const valCol = (dv?.categorical?.values || ([] as any)).find?.((v: powerbi.DataViewValueColumn) => v.source.roles?.["value"]) as powerbi.DataViewValueColumn | undefined;
        if (!catCol || !valCol) return false;
        const detCol = cats.find(c => c.source.roles?.["detail"]);
        this.missingDetail = !detCol;
        const pro = this.proActive;
        const grpCol = pro ? cats.find(c => c.source.roles?.["group"]) : undefined;
        const panCol = pro ? cats.find(c => c.source.roles?.["panel"]) : undefined;
        const tipCols = ((dv.categorical.values || []) as powerbi.DataViewValueColumn[]).filter(v => v.source.roles?.["tooltips"]);

        this.valueName = valCol.source.displayName;
        const culture = (this.host as any).locale;
        // Formato nativo de la medida, releído en cada update: así se aplican también las cadenas de formato dinámicas.
        this.valueFormat = this.formatOf(valCol);
        this.allInt = true;
        // Estadísticos (media, cuartiles interpolados, desviación): con un formato entero, "7,6" saldría "8".
        const base = this.formatter(this.valueFormat, undefined, culture);
        const plain = (() => { try { return new Intl.NumberFormat(culture, { maximumFractionDigits: 2 }); } catch { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }); } })();
        this.fmt = (v: number) => {
            const out = base(v);
            if (Number.isInteger(v) || /%/.test(this.valueFormat || "") || /[.,]\d/.test(out)) return out;
            return plain.format(v);
        };
        const s = this.effective();
        const method = s.method as QuartileMethod, rule = s.whiskerRule as WhiskerRule;

        const by = new Map<string, { cat: string; group: string | null; panel: string | null; vals: number[]; first: number; rows: number[]; tips: number[][] }>();
        const name = (v: any) => (v === null || v === undefined || v === "") ? this.t("UI_Blank", "(Blank)") : (v instanceof Date ? v.toLocaleDateString(culture) : String(v));
        const n = catCol.values.length;
        for (let i = 0; i < n; i++) {
            const raw = valCol.values[i];
            if (raw === null || raw === undefined || raw === "") continue;
            const v = Number(raw);
            if (!Number.isFinite(v)) continue;
            if (!Number.isInteger(v)) this.allInt = false;
            const cat = catCols.length > 1 ? catCols.map(c => name(c.values[i])).join(" · ") : name(catCol.values[i]);
            const group = grpCol ? name(grpCol.values[i]) : null;
            const panel = panCol ? name(panCol.values[i]) : null;
            const key = (panel ?? "") + "\u0001" + cat + "\u0001" + (group ?? "");
            let b = by.get(key);
            if (!b) { b = { cat, group, panel, vals: [], first: i, rows: [], tips: tipCols.map(() => []) }; by.set(key, b); }
            b.rows.push(i);
            b.vals.push(v);
            tipCols.forEach((tc, k) => { const x = Number(tc.values[i]); if (Number.isFinite(x)) b.tips[k].push(x); });
            if (this.cats.indexOf(cat) < 0) this.cats.push(cat);
            if (group !== null && this.groups.indexOf(group) < 0) this.groups.push(group);
            if (panel !== null && this.panels.indexOf(panel) < 0) this.panels.push(panel);
        }
        if (!by.size) return false;

        let seed = 1;
        by.forEach((b, key) => {
            b.vals.sort((x, y) => x - y);
            // Una identidad por fila: con Detail cada fila es una observación y, en Desktop, la identidad de categoría
            // es de fila. Pasar solo la primera filtraba una inspección, no la planta entera.
            const idOf = (r: number) => {
                let builder = this.host.createSelectionIdBuilder();
                for (const c of catCols) builder = builder.withCategory(c, r);
                if (grpCol) builder = builder.withCategory(grpCol, r);
                if (panCol) builder = builder.withCategory(panCol, r);
                return builder.createSelectionId();
            };
            const vistos = new Set<string>();
            const ids: ISelectionId[] = [];
            for (const r of b.rows) {
                const id = idOf(r);
                const k = this.keyOf(id);
                if (vistos.has(k)) continue;
                vistos.add(k); ids.push(id); this.idToBox.set(k, key);
            }
            const fx = (catCol.objects?.[b.first]?.["boxes"]?.["fill"] as any)?.solid?.color ?? null;
            const tips = tipCols.map((tc, k) => {
                const arr = b.tips[k];
                const avg = arr.length ? arr.reduce((a, x) => a + x, 0) / arr.length : NaN;
                return { name: tc.source.displayName, value: Number.isFinite(avg) ? this.formatter(this.formatOf(tc), undefined, culture)(avg) : "" };
            });
            this.boxes.push({
                key, cat: b.cat, group: b.group, panel: b.panel, values: b.vals,
                stats: boxStats(b.vals, method, rule), id: ids[0] ?? null, ids, ruleColor: fx, tips, seed: seed++,
            });
        });
        this.sortCategories(s);
        return true;
    }

    private sortCategories(s: Settings): void {
        if (s.sortBy === "data") { if (s.descending) this.cats.reverse(); return; }
        const metric = (cat: string): number | string => {
            if (s.sortBy === "name") return cat;
            // Estadístico de la categoría con todas sus filas juntas, para que grupos y paneles compartan orden.
            const vals: number[] = [];
            for (const b of this.boxes) if (b.cat === cat) for (const v of b.values) vals.push(v);
            vals.sort((a, b) => a - b);
            const st = boxStats(vals, s.method as QuartileMethod, "tukey");
            return s.sortBy === "median" ? st.median : s.sortBy === "mean" ? st.mean : s.sortBy === "iqr" ? st.q3 - st.q1 : st.n;
        };
        const m = new Map(this.cats.map(c => [c, metric(c)]));
        this.cats.sort((a, b) => {
            const x = m.get(a), y = m.get(b);
            const r = typeof x === "string" ? String(x).localeCompare(String(y), undefined, { numeric: true }) : (x as number) - (y as number);
            return s.descending ? -r : r;
        });
    }

    private formatOf(col: powerbi.DataViewValueColumn): string | undefined {
        try { return valueFormatter.getFormatStringByColumn(col.source as any) || col.source.format; } catch { return col.source.format; }
    }

    private formatter(format: string | undefined, value?: number, culture?: string): (v: number) => string {
        try {
            const f = valueFormatter.create({ format: format || undefined, value, cultureSelector: culture } as any);
            return (v: number) => f.format(v);
        } catch { return (v: number) => String(Math.round(v * 100) / 100); }
    }

    // ── Dibujo ────────────────────────────────────────────────────────────────

    private clearSvg(): void {
        while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    }

    private el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element): SVGElementTagNameMap[K] {
        const e = document.createElementNS(SVG, tag) as SVGElementTagNameMap[K];
        for (const k in attrs) e.setAttribute(k, String(attrs[k]));
        parent.appendChild(e);
        return e;
    }

    private hc(): { on: boolean; fg: string; bg: string; sel: string } {
        const p: any = this.host.colorPalette;
        return { on: !!p?.isHighContrast, fg: p?.foreground?.value || "#000000", bg: p?.background?.value || "#FFFFFF", sel: p?.foregroundSelected?.value || p?.foreground?.value || "#000000" };
    }

    /** Dibuja con el último dataView. Lo usa update() y el repintado tras resolver la licencia. */
    private draw(): void {
        if (this.destroyed || !this.lastOptions) return;
        const vp = this.lastOptions.viewport;
        this.root.style.background = this.hc().on ? this.hc().bg : (this.s.background || "transparent");
        this.subSelectable(this.root, "background", this.t("Obj_background", "Background"), powerbi.visuals.SubSelectionStylesType.Shape);
        if (!this.hasData) {
            this.clearSvg(); this.tableEl.style.display = "none"; this.noteEl.style.display = "none";
            this.watermarkEl.style.display = "none";
            this.landing(vp.width, vp.height);
            this.warnings();
            return;
        }
        this.landingEl.style.display = "none";
        this.svg.style.display = "";
        const s = this.effective();
        let tableH = 0;
        if (s.table) tableH = this.renderTable(s, vp.height);
        else this.tableEl.style.display = "none";
        this.render(s, vp.width, Math.max(60, vp.height - tableH));
        this.renderNote();
        this.renderWatermark(vp.width, vp.height);
        this.warnings();
        this.notifyProFeatureBlocked();
        this.paintSelection();
    }

    private render(s: Settings, W: number, H: number): void {
        this.clearSvg();
        this.svg.setAttribute("width", String(W));
        this.svg.setAttribute("height", String(H));
        const hc = this.hc();
        const small = W < 260 || H < 180;
        const vertical = s.orientation !== "horizontal";
        const fontV = clamp(s.vFont, 6, 40), fontC = clamp(s.cFont, 6, 40);
        const showV = s.vAxis && !(W < 140 || H < 100);
        const showC = s.cAxis && !(W < 140 || H < 100);
        const showN = s.showN && !small;

        // Leyenda de grupos
        let top = 6, bottom = 6;
        if (this.groups.length && s.legend && H > 140) {
            const lg = this.el("g", { class: "tcbw-legend" }, this.svg);
            this.subSelectable(lg, "legend", this.t("Obj_legend", "Legend"), powerbi.visuals.SubSelectionStylesType.Text);
            const fl = clamp(s.legendFont, 6, 30);
            const rowH = fl + 9;
            const y = s.legendPos === "bottom" ? H - rowH / 2 - 2 : rowH / 2 + 2;
            let x = 8;
            this.groups.forEach(g => {
                if (x > W - 40) return;
                this.el("rect", { x, y: y - fl * 0.45, width: fl * 0.9, height: fl * 0.9, rx: 2, fill: hc.on ? hc.fg : this.groupColor(g) }, lg);
                const t = this.el("text", { x: x + fl * 0.9 + 5, y: y + fl * 0.35, "font-size": fl, fill: hc.on ? hc.fg : s.legendColor }, lg);
                t.textContent = g;
                x += fl * 0.9 + 18 + Math.min(160, g.length * fl * 0.6);
            });
            if (s.legendPos === "bottom") bottom += rowH + 4; else top += rowH + 4;
        }

        // Escala común a todos los paneles
        let lo = Infinity, hi = -Infinity;
        for (const b of this.boxes) {
            const st = b.stats;
            const a = s.points || s.violin ? st.min : Math.min(st.lowWhisker, st.outliers[0] ?? Infinity);
            const z = s.points || s.violin ? st.max : Math.max(st.highWhisker, st.outliers[st.outliers.length - 1] ?? -Infinity);
            if (a < lo) lo = a;
            if (z > hi) hi = z;
            if (s.showMean) { lo = Math.min(lo, st.mean); hi = Math.max(hi, st.mean); }
        }
        if (s.ref1) { lo = Math.min(lo, s.ref1Value); hi = Math.max(hi, s.ref1Value); }
        if (s.ref2) { lo = Math.min(lo, s.ref2Value); hi = Math.max(hi, s.ref2Value); }
        if (!s.vAuto && Number.isFinite(s.vMin) && Number.isFinite(s.vMax) && s.vMax > s.vMin) { lo = s.vMin; hi = s.vMax; }
        const valueLen = vertical ? H : W;
        const count = Math.max(2, Math.floor(valueLen / 70));
        const minStep = this.allInt ? 1 : 0;
        const nt = niceTicks(lo, hi, count, minStep);
        const nice = s.vAuto ? nt : { lo, hi, ticks: nt.ticks.filter(t => t >= lo && t <= hi), step: nt.step };
        const culture = (this.host as any).locale;
        const axisBase = this.formatter(this.valueFormat, Math.max(Math.abs(nice.lo), Math.abs(nice.hi)), culture);
        // Si el formato de la medida repite etiquetas (paso 0,5 con formato entero), decimales según el paso.
        const labels = nice.ticks.map(t => axisBase(t));
        if (new Set(labels).size < labels.length) {
            const dec = Math.min(4, Math.max(0, -Math.floor(Math.log10(nice.step) + 1e-9)) + (nice.step / Math.pow(10, Math.floor(Math.log10(nice.step))) === 2.5 ? 1 : 0));
            let nf: Intl.NumberFormat;
            try { nf = new Intl.NumberFormat(culture, { minimumFractionDigits: dec, maximumFractionDigits: dec }); } catch { nf = new Intl.NumberFormat(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
            this.fmtAxis = (v: number) => nf.format(v);
        } else this.fmtAxis = axisBase;

        // Márgenes según orientación
        const tickW = showV ? Math.max(...nice.ticks.map(t => this.fmtAxis(t).length)) * fontV * 0.6 + 8 : 0;
        const titleW = showV && s.vTitle ? fontV + 8 : 0;
        const catLabelH = showC ? fontC + 6 + (showN ? fontC + 2 : 0) : 0;
        const longestCat = Math.min(160, Math.max(0, ...this.cats.map(c => c.length)) * fontC * 0.58 + 10);

        const panels = this.panels.length ? this.panels : [null];
        const autoCols = Math.max(1, Math.round(Math.sqrt(panels.length * (W / Math.max(1, H)))));
        const cols = panels.length === 1 ? 1 : Math.min(panels.length, s.smCols > 0 ? Math.round(s.smCols) : autoCols);
        const rows = Math.ceil(panels.length / cols);
        const smTitle = clamp(s.smTitleSize, 6, 40);
        const panelTitleH = panels[0] !== null ? smTitle + 8 : 0;
        const gap = panels[0] !== null ? clamp(s.smGap, 0, 60) : 0;
        const plotW = W, plotH = H - top - bottom;
        const cellW = (plotW - gap * (cols - 1)) / cols, cellH = (plotH - gap * (rows - 1)) / rows;

        panels.forEach((panel, pi) => {
            const cx = (pi % cols) * (cellW + gap), cy = top + Math.floor(pi / cols) * (cellH + gap);
            const g = this.el("g", { transform: `translate(${cx},${cy})` }, this.svg);
            if (panel !== null) {
                if ((s.smBackground && !hc.on) || s.smBorder) {
                    this.el("rect", { x: 0.5, y: 0.5, width: Math.max(0, cellW - 1), height: Math.max(0, cellH - 1), rx: 2,
                        fill: s.smBackground && !hc.on ? s.smBackground : "none",
                        stroke: s.smBorder ? (hc.on ? hc.fg : s.smBorderColor) : "none", "stroke-width": 1 }, g);
                }
                const center = s.smTitleAlign === "center";
                const t = this.el("text", { x: center ? cellW / 2 : 6, y: smTitle + 2, "text-anchor": center ? "middle" : "start",
                    "font-size": smTitle, "font-weight": s.smTitleBold ? 600 : 400, fill: hc.on ? hc.fg : s.smTitleColor }, g);
                t.textContent = panel;
            }
            let left: number, right: number, pTop: number, pBottom: number;
            if (vertical) {
                left = tickW + titleW + 4; right = 8; pTop = panelTitleH + 8; pBottom = catLabelH + 4;
            } else {
                left = (showC ? longestCat : 0) + 6;
                // La última marca del eje va centrada en el borde: hay que dejar sitio para la mitad de su texto.
                right = Math.max(12, showV ? this.fmtAxis(nice.hi).length * fontV * 0.32 + 4 : 0); pTop = panelTitleH + 6; pBottom = (showV ? fontV + 8 : 0) + (s.vTitle ? fontV + 6 : 0) + 4;
            }
            const pw = Math.max(10, cellW - left - right), ph = Math.max(10, cellH - pTop - pBottom);
            const vPix = (v: number) => vertical
                ? pTop + (nice.hi - v) / (nice.hi - nice.lo || 1) * ph
                : left + (v - nice.lo) / (nice.hi - nice.lo || 1) * pw;
            const bandLen = vertical ? pw : ph;
            const band = bandLen / Math.max(1, this.cats.length);
            const bandStart = (i: number) => (vertical ? left : pTop) + i * band;
            // pos(u, v): u a lo largo de las categorías, v en píxeles del valor
            const P = (u: number, v: number): [number, number] => vertical ? [u, v] : [v, u];

            // Rejilla y eje de valores
            const axis = this.el("g", { class: "tcbw-vaxis", "font-weight": s.vBold ? 700 : 400 }, g);
            if (s.vFamily) axis.setAttribute("font-family", s.vFamily);
            this.subSelectable(axis, "valueAxis", this.t("Obj_valueAxis", "Value axis"), powerbi.visuals.SubSelectionStylesType.Text);
            for (const tv of nice.ticks) {
                const p = vPix(tv);
                if (s.grid) {
                    const [x1, y1] = P(vertical ? left : pTop, p), [x2, y2] = P(vertical ? left + pw : pTop + ph, p);
                    this.el("line", { x1, y1, x2, y2, stroke: hc.on ? hc.fg : "#E1DFDD", "stroke-width": 1, "stroke-opacity": hc.on ? 0.4 : 1 }, axis);
                }
                if (showV) {
                    const t = vertical
                        ? this.el("text", { x: left - 6, y: p + fontV * 0.35, "text-anchor": "end", "font-size": fontV, fill: hc.on ? hc.fg : s.vColor }, axis)
                        : this.el("text", { x: p, y: pTop + ph + fontV + 4, "text-anchor": "middle", "font-size": fontV, fill: hc.on ? hc.fg : s.vColor }, axis);
                    t.textContent = this.fmtAxis(tv);
                }
            }
            if (showV && s.vTitle) {
                const txt = s.vTitleText || this.valueName;
                const t = vertical
                    ? this.el("text", { x: 0, y: 0, transform: `translate(${fontV},${pTop + ph / 2}) rotate(-90)`, "text-anchor": "middle", "font-size": fontV, fill: hc.on ? hc.fg : s.vColor }, axis)
                    : this.el("text", { x: left + pw / 2, y: pTop + ph + fontV * 2 + 8, "text-anchor": "middle", "font-size": fontV, fill: hc.on ? hc.fg : s.vColor }, axis);
                t.textContent = txt;
            }

            // Líneas de referencia (Pro)
            const refs: [boolean, number, string][] = [[s.ref1, s.ref1Value, s.ref1Label], [s.ref2, s.ref2Value, s.ref2Label]];
            for (const [on, rv, rl] of refs) {
                if (!on || !Number.isFinite(rv)) continue;
                const p = vPix(rv);
                const [x1, y1] = P(vertical ? left : pTop, p), [x2, y2] = P(vertical ? left + pw : pTop + ph, p);
                this.el("line", { x1, y1, x2, y2, stroke: hc.on ? hc.fg : s.refColor, "stroke-width": 1.5, "stroke-dasharray": "5 4" }, g);
                const label = (rl ? rl + " " : "") + this.fmt(rv);
                const t = vertical
                    ? this.el("text", { x: left + pw - 2, y: p - 4, "text-anchor": "end", "font-size": Math.max(8, fontV - 1), fill: hc.on ? hc.fg : s.refColor }, g)
                    : this.el("text", { x: p + 4, y: pTop + 10, "font-size": Math.max(8, fontV - 1), fill: hc.on ? hc.fg : s.refColor }, g);
                t.textContent = label;
            }

            // Etiquetas de categoría y n
            const caxis = this.el("g", { class: "tcbw-caxis", "font-weight": s.cBold ? 700 : 400 }, g);
            if (s.cFamily) caxis.setAttribute("font-family", s.cFamily);
            this.subSelectable(caxis, "categoryAxis", this.t("Obj_categoryAxis", "Category axis"), powerbi.visuals.SubSelectionStylesType.Text);
            this.cats.forEach((cat, ci) => {
                if (!showC) return;
                const mid = bandStart(ci) + band / 2;
                const nTotal = this.boxes.filter(b => b.cat === cat && b.panel === panel).reduce((a, b) => a + b.stats.n, 0);
                if (vertical) {
                    const maxChars = Math.max(3, Math.floor(band / (fontC * 0.58)));
                    const t = this.el("text", { x: mid, y: pTop + ph + fontC + 4, "text-anchor": "middle", "font-size": fontC, fill: hc.on ? hc.fg : s.cColor }, caxis);
                    t.textContent = cat.length > maxChars ? cat.slice(0, maxChars - 1) + "…" : cat;
                    if (showN && nTotal) {
                        const tn = this.el("text", { x: mid, y: pTop + ph + 2 * fontC + 6, "text-anchor": "middle", "font-size": Math.max(7, fontC - 2), fill: hc.on ? hc.fg : "#83827D" }, caxis);
                        tn.textContent = "n = " + nTotal.toLocaleString((this.host as any).locale);
                    }
                } else {
                    const maxChars = Math.max(3, Math.floor((left - 10) / (fontC * 0.58)));
                    const t = this.el("text", { x: left - 6, y: mid + (showN ? -1 : fontC * 0.35), "text-anchor": "end", "font-size": fontC, fill: hc.on ? hc.fg : s.cColor }, caxis);
                    t.textContent = cat.length > maxChars ? cat.slice(0, maxChars - 1) + "…" : cat;
                    if (showN && nTotal && band > fontC * 2.2) {
                        const tn = this.el("text", { x: left - 6, y: mid + fontC, "text-anchor": "end", "font-size": Math.max(7, fontC - 2), fill: hc.on ? hc.fg : "#83827D" }, caxis);
                        tn.textContent = "n = " + nTotal.toLocaleString((this.host as any).locale);
                    }
                }
            });

            // Cajas
            const nG = Math.max(1, this.groups.length);
            const boxesG = this.el("g", { class: "tcbw-boxes" }, g);
            this.subSelectable(boxesG, "boxes", this.t("Obj_boxes", "Boxes"), powerbi.visuals.SubSelectionStylesType.Shape);
            this.cats.forEach((cat, ci) => {
                const inner = band * 0.9;
                const sub = inner / nG;
                (this.groups.length ? this.groups : [null]).forEach((grp, gi) => {
                    const b = this.boxes.find(x => x.cat === cat && x.panel === panel && x.group === grp);
                    if (!b) return;
                    const center = bandStart(ci) + band * 0.05 + sub * gi + sub / 2;
                    this.drawBox(boxesG, b, s, center, sub, vPix, P, vertical, hc);
                });
            });
        });
    }

    private groupColor(g: string): string {
        // Estilo IBCS: los grupos se distinguen por tonos de gris, no por colores del tema.
        if (this.s.template === "ibcs" && this.groups.length) {
            const greys = ["#404040", "#8C8C8C", "#BFBFBF", "#262626", "#666666", "#D9D9D9"];
            return greys[Math.max(0, this.groups.indexOf(g)) % greys.length];
        }
        return this.host.colorPalette.getColor(g).value;
    }

    /** true si un color de relleno es oscuro (para elegir mediana blanca o negra encima). */
    private isDark(hex: string): boolean {
        const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
        if (!m) return false;
        const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
    }

    private drawBox(parent: SVGGElement, b: Box, s: Settings, center: number, sub: number,
        vPix: (v: number) => number, P: (u: number, v: number) => [number, number], vertical: boolean,
        hc: { on: boolean; fg: string; bg: string; sel: string }): void {
        const st = b.stats;
        const bw = Math.max(3, sub * clamp(s.width, 10, 100) / 100 * (s.violin ? 0.45 : 1));
        const u0 = center - bw / 2, u1 = center + bw / 2;
        const g = this.el("g", { "data-box": b.key, class: "tcbw-box", tabindex: -1, role: "option" }, parent);
        g.setAttribute("aria-label", `${b.cat}${b.group !== null ? " · " + b.group : ""}${b.panel !== null ? " · " + b.panel : ""}: ` +
            `${this.t("UI_Median", "Median")} ${this.fmt(st.median)}, Q1 ${this.fmt(st.q1)}, Q3 ${this.fmt(st.q3)}, n ${st.n}`);
        const baseColor = hc.on ? hc.fg : (b.ruleColor || (b.group !== null ? this.groupColor(b.group) : s.fill));
        const stroke = hc.on ? hc.fg : (b.group !== null && !b.ruleColor ? baseColor : s.border);
        const opa = clamp(s.opacity, 0, 100) / 100;

        // Violín (Pro): detrás de la caja
        if (s.violin && st.n >= 3) {
            // Vacío = el color de la caja o del grupo (con grupos, cada violín conserva el suyo).
            const vColor = hc.on ? hc.fg : (s.violinColor || baseColor);
            const dens = density(b.values, st.sd, st.q1, st.q3, 48, this.allInt ? 0.6 : 0);
            const maxD = Math.max(...dens.map(d => d.d)) || 1;
            const half = sub * 0.45;
            const side = (sign: number) => dens.map(d => P(center + sign * d.d / maxD * half, vPix(d.y)));
            const pts = side(1).concat(side(-1).reverse());
            if (pts.length) {
                const path = "M" + pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L") + "Z";
                this.el("path", { d: path, fill: hc.on ? "none" : vColor, "fill-opacity": clamp(s.violinOpacity, 0, 100) / 100, stroke: vColor, "stroke-width": 1, "stroke-opacity": 0.6 }, g);
            }
        }

        // Puntos (Pro), con jitter fijo por semilla
        if (s.points) {
            const rnd = seeded(b.seed * 7919);
            const spread = bw * clamp(s.jitter, 0, 100) / 100;
            const r = clamp(s.pointSize, 0.5, 12);
            const step = b.values.length > 4000 ? Math.ceil(b.values.length / 4000) : 1;
            for (let i = 0; i < b.values.length; i += step) {
                const [x, y] = P(center + (rnd() - 0.5) * spread, vPix(b.values[i]));
                this.el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r, fill: hc.on ? hc.fg : s.pointColor, "fill-opacity": clamp(s.pointOpacity, 0, 100) / 100,
                    stroke: hc.on ? hc.bg : s.pointBorderColor, "stroke-width": clamp(s.pointBorderWidth, 0, 4) }, g);
            }
        }

        // Bigotes
        const wc = hc.on ? hc.fg : s.whiskerColor;
        const line = (a: [number, number], z: [number, number], color: string, w: number) =>
            this.el("line", { x1: a[0], y1: a[1], x2: z[0], y2: z[1], stroke: color, "stroke-width": w }, g);
        line(P(center, vPix(st.q3)), P(center, vPix(st.highWhisker)), wc, 1.2);
        line(P(center, vPix(st.q1)), P(center, vPix(st.lowWhisker)), wc, 1.2);
        if (s.caps) {
            const cw = bw * 0.4;
            line(P(center - cw / 2, vPix(st.highWhisker)), P(center + cw / 2, vPix(st.highWhisker)), wc, 1.2);
            line(P(center - cw / 2, vPix(st.lowWhisker)), P(center + cw / 2, vPix(st.lowWhisker)), wc, 1.2);
        }

        // Caja (con muesca si se pide)
        const q1p = vPix(st.q1), q3p = vPix(st.q3), medp = vPix(st.median);
        const bwStroke = hc.on ? 2 : clamp(s.borderWidth, 0, 6);
        if (s.notches) {
            const nl = vPix(Math.max(st.q1, st.notchLow)), nh = vPix(Math.min(st.q3, st.notchHigh));
            const ind = bw * 0.22;
            const pts = [P(u0, q3p), P(u1, q3p), P(u1, nh), P(u1 - ind, medp), P(u1, nl), P(u1, q1p), P(u0, q1p), P(u0, nl), P(u0 + ind, medp), P(u0, nh)];
            this.el("path", { d: "M" + pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L") + "Z",
                fill: hc.on ? "none" : baseColor, "fill-opacity": opa, stroke, "stroke-width": bwStroke }, g);
        } else if (s.quartileColors && !hc.on) {
            const r1 = this.rectUV(u0, u1, q1p, medp, P), r2 = this.rectUV(u0, u1, medp, q3p, P);
            this.el("rect", { ...r1, fill: s.lowerColor, stroke, "stroke-width": bwStroke }, g);
            this.el("rect", { ...r2, fill: s.upperColor, stroke, "stroke-width": bwStroke }, g);
        } else {
            const r = this.rectUV(u0, u1, q1p, q3p, P);
            this.el("rect", { ...r, rx: clamp(s.radius, 0, 12), fill: hc.on ? "none" : baseColor, "fill-opacity": opa, stroke, "stroke-width": bwStroke }, g);
        }
        // Mediana
        // Sobre una caja opaca, la mediana se elige por contraste: blanca en oscuro, negra en claro.
        const mc = hc.on ? hc.fg : (s.quartileColors ? "#FFFFFF"
            : (opa >= 0.6 && (b.group !== null || s.template === "ibcs") ? (this.isDark(baseColor) ? "#FFFFFF" : "#000000") : s.medianColor));
        const notchInset = s.notches ? bw * 0.22 : 0;
        line(P(u0 + notchInset, medp), P(u1 - notchInset, medp), mc, 2.5);
        if (s.medianLabel && bw > 14) {
            // Vertical: a la derecha de la caja. Horizontal: encima de la caja, sobre la mediana.
            const [x, y] = vertical ? P(u1 + 3, medp) : P(u0 - 4, medp);
            const t = this.el("text", { x, y: vertical ? y + 3.5 : y, "font-size": Math.max(8, s.cFont - 1), fill: hc.on ? hc.fg : s.medianColor, "text-anchor": vertical ? "start" : "middle" }, g);
            t.textContent = this.fmt(st.median);
        }
        // Media (Pro): rombo
        if (s.showMean) {
            const [x, y] = P(center, vPix(st.mean));
            const r = Math.max(3, Math.min(6, bw / 6));
            this.el("path", { d: `M${x},${y - r}L${x + r},${y}L${x},${y + r}L${x - r},${y}Z`, fill: hc.on ? hc.bg : s.meanColor, stroke: hc.on ? hc.fg : (s.template === "ibcs" ? "#262626" : "#FFFFFF"), "stroke-width": 1 }, g);
        }
        // Outliers: siempre dibujados, también encima de los puntos (siguen marcados con su color y tamaño)
        {
            const r = clamp(s.outlierSize, 1, 10);
            for (const v of st.outliers) {
                const [x, y] = P(center, vPix(v));
                this.el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r, fill: hc.on ? "none" : s.outlierColor, "fill-opacity": 0.85, stroke: hc.on ? hc.fg : "#FFFFFF", "stroke-width": hc.on ? 1.5 : 0.8 }, g);
            }
        }
        // Zona de clic que cubre toda la caja con sus bigotes
        const hit = this.rectUV(center - Math.max(bw, 10) / 2, center + Math.max(bw, 10) / 2, vPix(st.lowWhisker), vPix(st.highWhisker), P);
        this.el("rect", { ...hit, fill: "transparent", class: "tcbw-hit" }, g);
        this.wire(g, b);
    }

    /** Rectángulo en coordenadas (u a lo largo de categorías, v en píxeles de valor). */
    private rectUV(u0: number, u1: number, va: number, vb: number, P: (u: number, v: number) => [number, number]) {
        const [x0, y0] = P(u0, va), [x1, y1] = P(u1, vb);
        return { x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.max(0.5, Math.abs(x1 - x0)), height: Math.max(0.5, Math.abs(y1 - y0)) };
    }

    // ── Tabla de estadísticos (Pro) ───────────────────────────────────────────

    private renderTable(s: Settings, H: number): number {
        const el = this.tableEl;
        while (el.firstChild) el.removeChild(el.firstChild);
        el.style.display = "block";
        const maxH = Math.max(60, Math.floor(H * 0.35));
        el.style.maxHeight = maxH + "px";
        el.style.fontSize = clamp(s.tableFont, 7, 24) + "px";
        const hc = this.hc();
        el.style.color = hc.on ? hc.fg : (s.tableColor || "#3D3929");
        const table = document.createElement("table");
        // Una tabla no siempre hereda color y tamaño (modo quirks del iframe): se fijan en ella.
        table.style.color = el.style.color;
        table.style.fontSize = el.style.fontSize;
        const head = document.createElement("tr");
        const cols = [this.t("UI_Category", "Category")]
            .concat(this.groups.length ? [this.t("UI_Group", "Group")] : [])
            .concat(this.panels.length ? [this.t("UI_Panel", "Panel")] : [])
            .concat(["n", this.t("UI_Min", "Min"), "Q1", this.t("UI_Median", "Median"), "Q3", this.t("UI_Max", "Max"),
                this.t("UI_Mean", "Mean"), this.t("UI_SD", "Std dev"), this.t("UI_Outliers", "Outliers")]);
        const firstNum = 1 + (this.groups.length ? 1 : 0) + (this.panels.length ? 1 : 0);
        cols.forEach((c, i) => {
            const th = document.createElement("th"); th.textContent = c; if (i >= firstNum) th.className = "num";
            // Fondo propio: la cabecera queda fija al desplazar y sin fondo dejaría ver las filas por debajo.
            th.style.background = hc.on ? hc.bg : (s.tableHeaderBg || "#FFFFFF");
            th.style.color = hc.on ? hc.fg : (s.tableHeaderColor || s.tableColor || "#3D3929");
            head.appendChild(th);
        });
        const thead = document.createElement("thead"); thead.appendChild(head); table.appendChild(thead);
        const tbody = document.createElement("tbody");
        // Mismo orden que el gráfico: categoría, luego panel y grupo en el orden en que se dibujan.
        const pIdx = (v: string | null) => v === null ? 0 : this.panels.indexOf(v);
        const gIdx = (v: string | null) => v === null ? 0 : this.groups.indexOf(v);
        for (const cat of this.cats) {
            const delCat = this.boxes.filter(x => x.cat === cat).sort((x, y) => pIdx(x.panel) - pIdx(y.panel) || gIdx(x.group) - gIdx(y.group));
            for (const b of delCat) {
                const st = b.stats, tr = document.createElement("tr");
                if (s.tableBanding && !hc.on && tbody.childElementCount % 2 === 1) tr.style.background = s.tableBanding;
                const cells = [b.cat].concat(this.groups.length ? [b.group ?? ""] : []).concat(this.panels.length ? [b.panel ?? ""] : [])
                    .concat([st.n.toLocaleString((this.host as any).locale), this.fmt(st.min), this.fmt(st.q1), this.fmt(st.median), this.fmt(st.q3),
                        this.fmt(st.max), this.fmt(st.mean), this.fmt(st.sd), String(st.outliers.length)]);
                cells.forEach((c, i) => { const td = document.createElement("td"); td.textContent = c; if (i >= firstNum) td.className = "num"; tr.appendChild(td); });
                tbody.appendChild(tr);
            }
        }
        table.appendChild(tbody);
        el.appendChild(table);
        return Math.min(maxH, el.scrollHeight || maxH) + 4;
    }

    // ── Avisos ────────────────────────────────────────────────────────────────

    /** Nota pequeña en el visual: falta Detalle, o funciones Pro que la vista de lectura no aplica. */
    private renderNote(): void {
        const msgs: string[] = [];
        if (this.missingDetail) msgs.push(this.t("UI_NoDetail", "Add an ID to Detail (rows) — order, employee, ticket — so each box shows a distribution, not one total per category."));
        const wanted = this.attemptedPro();
        if (!this.proActive && wanted.length && !this.isEditing())
            msgs.push(this.t("UI_ReadingFree", "Pro features not applied in reading view:") + " " + wanted.map(w => w.label).join(", "));
        this.noteEl.style.display = msgs.length ? "block" : "none";
        this.noteEl.textContent = msgs.join(" · ");
        const hc = this.hc();
        this.noteEl.style.color = hc.on ? hc.fg : "#83827D";
    }

    private renderWatermark(W: number, H: number): void {
        const wanted = this.isPreview() ? this.attemptedPro() : [];
        const el = this.watermarkEl;
        if (!wanted.length) { el.style.display = "none"; return; }
        while (el.firstChild) el.removeChild(el.firstChild);
        el.style.display = "flex";
        const t = document.createElement("div"); t.className = "tcbw-wm-title"; t.textContent = this.t("UI_ProPreview", "Pro preview");
        const w = document.createElement("div"); w.className = "tcbw-wm-why"; w.textContent = wanted.map(x => x.label).join(" · ");
        el.appendChild(t); el.appendChild(w);
        el.style.fontSize = Math.max(14, Math.min(44, Math.min(W, H) / 7)) + "px";
    }

    /** Icono de aviso de la cabecera: filas que Power BI no ha entregado. */
    private warnings(): void {
        const host: any = this.host;
        if (typeof host.displayWarningIcon !== "function") return;
        if (this.truncatedAt) {
            host.displayWarningIcon(this.t("UI_WarnTitle", "Box & Whisker"), (this.isDesktop
                ? this.t("UI_WarnRowsDesktop", "In Power BI Desktop the visual uses the first rows Power BI sends: publish to the service to use them all.")
                : this.t("UI_WarnRows", "Power BI sent only part of the rows: the boxes reflect the rows received.")) + " (" + this.truncatedAt + ")");
        } else if (typeof host.hideWarningIcon === "function") host.hideWarningIcon();
    }

    // ── Interacción ───────────────────────────────────────────────────────────

    private wire(g: SVGGElement, b: Box): void {
        g.addEventListener("click", (e) => {
            if (this.formatMode) return;
            e.stopPropagation();
            this.keyboardNav = false;
            this.select(b, e.ctrlKey || e.metaKey);
        });
        g.addEventListener("contextmenu", (e) => {
            e.preventDefault(); e.stopPropagation();
            if (!this.canInteract) return;
            this.selectionManager.showContextMenu(b.id ?? ({} as ISelectionId), { x: e.clientX, y: e.clientY });
        });
        g.addEventListener("mousemove", (e) => this.showTooltip(b, e.clientX, e.clientY));
        g.addEventListener("mouseleave", () => this.host.tooltipService.hide({ immediately: false, isTouchEvent: false }));
        g.addEventListener("focus", () => { const r = g.getBoundingClientRect(); this.showTooltip(b, r.left + r.width / 2, r.top); });
        g.addEventListener("blur", () => this.host.tooltipService.hide({ immediately: true, isTouchEvent: false }));
        g.addEventListener("keydown", (e: KeyboardEvent) => {
            this.keyboardNav = true;
            const all = Array.from(this.svg.querySelectorAll<SVGGElement>("g[data-box]"));
            const i = all.indexOf(g);
            const go = (j: number) => {
                const k = (j + all.length) % all.length;
                all.forEach((x, n) => x.setAttribute("tabindex", n === k ? "0" : "-1"));
                this.focusKey = all[k]?.getAttribute("data-box") || "";
                all[k]?.focus();
            };
            let handled = true;
            switch (e.key) {
                case "ArrowRight": case "ArrowDown": go(i + 1); break;
                case "ArrowLeft": case "ArrowUp": go(i - 1); break;
                case "Home": go(0); break;
                case "End": go(all.length - 1); break;
                case "Enter": case " ": this.select(b, e.ctrlKey || e.metaKey); break;
                case "Escape": if (this.canInteract) this.selectionManager.clear().then(() => this.paintSelection()); break;
                case "ContextMenu": {
                    const r = g.getBoundingClientRect();
                    if (this.canInteract) this.selectionManager.showContextMenu(b.id ?? ({} as ISelectionId), { x: r.left + r.width / 2, y: r.top });
                    break;
                }
                default: handled = false;
            }
            if (handled) { e.preventDefault(); e.stopPropagation(); }
        });
    }

    private keyOf(id: any): string {
        const k = id?.getKey?.();
        if (typeof k === "string") return k;
        const sel = id?.getSelector?.();
        // Sin clave ni selector no se puede deduplicar: cada identidad cuenta como distinta.
        return sel ? JSON.stringify(sel) : "#" + (++this.keySeq);
    }

    /** Cajas seleccionadas según Power BI (clic propio o marcador restaurado). */
    private selectedBoxes(): Set<string> {
        const own = this.selectionManager.getSelectionIds() as ISelectionId[];
        const sel = own.length ? own : this.restoredIds;
        const out = new Set<string>();
        for (const id of sel) {
            const k = this.idToBox.get(this.keyOf(id));
            if (k) { out.add(k); continue; }
            // Un marcador puede devolver la identidad con otra forma que la del clic: equals/includes contra cada caja.
            const igual = (x: any) => !!(x?.equals?.(id) || (id as any)?.equals?.(x) || (id as any)?.includes?.(x, true) || x?.includes?.(id, true));
            const b = this.boxes.find(x => x.ids.some(igual));
            if (b) out.add(b.key);
        }
        return out;
    }

    /**
     * Clic en una caja: se selecciona con TODAS sus filas. Seleccionar una lista no alterna, así que el
     * segundo clic sobre la única caja seleccionada se resuelve aquí con clear() (receta de Calendar).
     */
    private select(b: Box, multi: boolean): void {
        if (!this.canInteract || !b.ids.length) return;
        const actual = this.selectedBoxes();
        this.restoredIds = [];
        let siguiente: Box[];
        if (multi) {
            siguiente = this.boxes.filter(x => actual.has(x.key) !== (x.key === b.key));
        } else {
            siguiente = actual.size === 1 && actual.has(b.key) ? [] : [b];
        }
        const ids = ([] as ISelectionId[]).concat(...siguiente.map(x => x.ids));
        if (DEBUG_SEL) {
            const keys = ids.map(i => this.keyOf(i));
            this.noteEl.style.display = "block";
            this.noteEl.style.whiteSpace = "normal";
            this.noteEl.style.background = "#FFF7E6";
            this.noteEl.style.color = "#3D3929";
            this.noteEl.textContent = `DIAG caja=${b.key.replace(//g, "|")} n=${b.stats.n} ids=${ids.length} claves únicas=${new Set(keys).size} ` +
                `· clave1=${keys[0]} · clave2=${keys[1] ?? "-"} · selector1=${JSON.stringify((ids[0] as any)?.getSelector?.() ?? null).slice(0, 160)}`;
        }
        (ids.length ? this.selectionManager.select(ids, false) : this.selectionManager.clear()).then(() => this.paintSelection());
    }

    private showTooltip(b: Box, x: number, y: number): void {
        const st = b.stats;
        const items: powerbi.extensibility.VisualTooltipDataItem[] = [{ displayName: this.t("UI_Category", "Category"), value: b.cat }];
        if (b.group !== null) items.push({ displayName: this.t("UI_Group", "Group"), value: b.group });
        if (b.panel !== null) items.push({ displayName: this.t("UI_Panel", "Panel"), value: b.panel });
        const loc = (this.host as any).locale;
        items.push(
            { displayName: "n", value: st.n.toLocaleString(loc) },
            { displayName: this.t("UI_Max", "Max"), value: this.fmt(st.max) },
            { displayName: "Q3", value: this.fmt(st.q3) },
            { displayName: this.t("UI_Median", "Median"), value: this.fmt(st.median) },
            { displayName: "Q1", value: this.fmt(st.q1) },
            { displayName: this.t("UI_Min", "Min"), value: this.fmt(st.min) },
            { displayName: this.t("UI_Mean", "Mean"), value: this.fmt(st.mean) },
            { displayName: this.t("UI_Outliers", "Outliers"), value: String(st.outliers.length) },
            { displayName: this.t("UI_Method", "Quartiles"), value: this.methodName() },
        );
        for (const tp of b.tips) items.push({ displayName: tp.name + " (" + this.t("UI_Avg", "avg") + ")", value: tp.value });
        this.host.tooltipService.show({ dataItems: items as any, identities: b.ids, coordinates: [x, y], isTouchEvent: false });
    }

    private methodName(): string {
        const m = this.effective().method;
        return m === "exclusive" ? this.t("Enum_m_exclusive", "Exclusive (Excel QUARTILE.EXC)").replace(/ \(Pro\)$/, "")
            : m === "hinges" ? this.t("Enum_m_hinges", "Tukey hinges").replace(/ \(Pro\)$/, "")
            : this.t("Enum_m_linear", "Inclusive (Excel QUARTILE.INC)");
    }

    private paintSelection(): void {
        const elegidas = this.selectedBoxes();
        const has = elegidas.size > 0;
        this.svg.querySelectorAll<SVGGElement>("g[data-box]").forEach(g => {
            const on = !has || elegidas.has(g.getAttribute("data-box") || "");
            g.setAttribute("opacity", on ? "1" : "0.3");
            g.setAttribute("aria-selected", has && on ? "true" : "false");
        });
        const all = this.svg.querySelectorAll<SVGGElement>("g[data-box]");
        if (all.length && !this.svg.querySelector("g[data-box][tabindex='0']")) {
            const f = Array.from(all).find(g => g.getAttribute("data-box") === this.focusKey) || all[0];
            f.setAttribute("tabindex", "0");
        }
        if (this.keyboardNav) this.svg.querySelector<SVGGElement>("g[data-box][tabindex='0']")?.focus();
    }

    // ── Pantalla de inicio ────────────────────────────────────────────────────

    /**
     * Qué es, cómo empezar con los pozos reales, ayuda y qué añade el Pro. Tres tamaños. Los enlaces
     * solo se abren al hacer clic (host.launchUrl); el Pro es texto, sin botón de compra.
     */
    private landing(w: number, h: number): void {
        this.svg.style.display = "none";
        const el = this.landingEl;
        while (el.firstChild) el.removeChild(el.firstChild);
        const size = (w >= 600 && h >= 340) ? "l" : (w >= 360 && h >= 220) ? "m" : "s";
        el.className = "tcbw-landing tcbw-landing-" + size;
        el.style.display = "flex";
        const hc = this.hc();
        const fg = hc.on ? hc.fg : "";
        const mk = (tag: string, cls?: string, text?: string): HTMLElement => {
            const n = document.createElement(tag);
            if (cls) n.className = cls;
            if (text !== undefined) n.textContent = text;
            if (fg) n.style.color = fg;
            return n;
        };
        const T = (k: string, d: string) => this.t(k, d);
        const cat = T("Role_category", "Category"), val = T("Role_value", "Value"), det = T("Role_detail", "Detail (rows)");
        const box = mk("div", "tcbw-l-box");
        el.appendChild(box);
        const head = mk("div", "tcbw-l-head");
        const img = document.createElement("img");
        img.src = LANDING_ICON; img.alt = ""; img.className = "tcbw-l-icon";
        head.appendChild(img);
        const titles = mk("div");
        titles.appendChild(mk("div", "tcbw-l-title", "Box & Whisker by TCViz"));
        if (size !== "s") titles.appendChild(mk("div", "tcbw-l-tag", size === "l"
            ? T("Landing_Tagline", "See how values spread in each category: median, quartiles and outliers.")
            : T("Landing_TaglineShort", "How values spread in each category.")));
        head.appendChild(titles);
        box.appendChild(head);
        const link = (txt: string, url: string, cls: string): HTMLElement => {
            const a = mk("a", cls) as HTMLAnchorElement;
            a.href = url; a.tabIndex = 0; a.textContent = txt;
            if (hc.on) { a.style.background = "transparent"; a.style.borderColor = fg; }
            const open = (e: Event) => { e.preventDefault(); e.stopPropagation(); this.host.launchUrl(url); };
            a.addEventListener("click", open);
            a.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") open(e); });
            return a;
        };
        const links: [string, string, string][] = [
            [T("Landing_Guide", "Guide"), T("Landing_GuideSub", "support page"), URL_GUIDE],
            [T("Landing_Product", "Product page"), "tcviz.com", URL_PRODUCT],
            [T("Landing_Video", "Video"), "YouTube", URL_VIDEO],
        ];
        if (size === "s") {
            box.appendChild(mk("p", "tcbw-l-do", T("Landing_Small", "Add {cat}, {val} and {det}.").replace("{cat}", cat).replace("{val}", val).replace("{det}", det)));
            const row = mk("div", "tcbw-l-inline");
            row.appendChild(link(links[0][0], links[0][2], "tcbw-l-a"));
            box.appendChild(row);
            return;
        }
        const L = size === "l";
        const steps = mk("ol", "tcbw-l-steps");
        const step = (n: number, well: string, txt: string) => {
            const li = mk("li");
            const num = mk("b", "tcbw-l-n", String(n));
            if (hc.on) { num.style.background = fg; num.style.color = hc.bg; }
            li.appendChild(num);
            const sp = mk("span");
            sp.appendChild(mk("strong", "tcbw-l-well", well));
            sp.appendChild(document.createTextNode(" · " + txt));
            li.appendChild(sp);
            steps.appendChild(li);
        };
        step(1, cat, L ? T("Landing_Step1", "one box per value: region, product, team") : T("Landing_Step1Short", "one box per value"));
        step(2, val, L ? T("Landing_Step2", "the measure to study, such as days or amount") : T("Landing_Step2Short", "the measure to study"));
        step(3, det, L ? T("Landing_Step3", "the ID of each row: order, employee, ticket") : T("Landing_Step3Short", "the ID of each row"));
        if (L) {
            const cols = mk("div", "tcbw-l-cols");
            const c1 = mk("div");
            c1.appendChild(mk("div", "tcbw-l-lbl", T("Landing_Start", "Start in 3 steps")));
            c1.appendChild(steps);
            const c2 = mk("div");
            c2.appendChild(mk("div", "tcbw-l-lbl", T("Landing_Help", "Help")));
            const list = mk("div", "tcbw-l-links");
            for (const [txt, sub, url] of links) {
                const a = link(txt, url, "tcbw-l-card");
                a.appendChild(mk("small", "tcbw-l-sub", sub));
                list.appendChild(a);
            }
            c2.appendChild(list);
            cols.appendChild(c1); cols.appendChild(c2);
            box.appendChild(cols);
        } else {
            box.appendChild(steps);
            const row = mk("div", "tcbw-l-inline");
            row.appendChild(link(links[0][0], links[0][2], "tcbw-l-a"));
            row.appendChild(link(links[2][0], links[2][2], "tcbw-l-a"));
            row.appendChild(link("tcviz.com", links[1][2], "tcbw-l-a"));
            box.appendChild(row);
        }
        if (!this.isPro) {
            const pro = mk("div", "tcbw-l-pro");
            const chip = mk("span", "tcbw-l-chip", "Pro");
            if (hc.on) { chip.style.background = "transparent"; chip.style.border = "1px solid " + fg; }
            pro.appendChild(chip);
            pro.appendChild(mk("span", undefined, L
                ? T("Landing_Pro", "All points with jitter, mean and notches, violin, groups and small multiples, sorting by median, reference lines.")
                : T("Landing_ProShort", "Points, violin, groups, small multiples, sort by median.")));
            box.appendChild(pro);
        }
    }

    // ── Licencia ──────────────────────────────────────────────────────────────

    /** Se pide una vez, cuando hay datos. Al llegar se repinta sin llamar a update(). */
    private requestLicense(): void {
        if (this.licenseRequested) return;
        this.licenseRequested = true;
        if (this.isPro) { this.licenseResolved = true; return; }
        try {
            const lm: any = (this.host as any).licenseManager;
            if (!lm) { this.licenseEnvUnsupported = true; this.licenseResolved = true; return; }
            lm.getAvailableServicePlans().then(
                (r: any) => {
                    if (r?.isLicenseUnsupportedEnv === true || r?.isLicenseInfoAvailable === false) this.licenseEnvUnsupported = true;
                    const plans: any[] = r?.plans ?? [];
                    // Solo Active y Warning (periodo de gracia por un problema de pago) son licencias utilizables.
                    if (plans.some(p => isOurPaidPlan(p.spIdentifier) && (p.state === STATE_ACTIVE || p.state === STATE_WARNING))) this.isPro = true;
                    this.licenseResolved = true;
                    this.refreshAfterLicense();
                },
                () => { this.licenseEnvUnsupported = true; this.licenseResolved = true; this.refreshAfterLicense(); });
        } catch {
            this.licenseEnvUnsupported = true; this.licenseResolved = true;
        }
    }

    private refreshAfterLicense(): void {
        if (this.destroyed || !this.lastOptions) return;
        // Las funciones Pro cambian qué filas forman cada caja (grupos, paneles): se recalcula y se repinta.
        this.hasData = this.readData(this.lastDv);
        this.draw();
    }

    private cancelLicenseIcon(): void {
        if (this.licenseIconTimer !== null) { window.clearTimeout(this.licenseIconTimer); this.licenseIconTimer = null; }
    }

    private clearLicenseNotice(): void {
        this.lastBlockedNotice = "";
        this.cancelLicenseIcon();
        if (!this.licenseIconShown) return;
        this.licenseIconShown = false;
        try { (this.host as any).licenseManager?.clearLicenseNotification?.(); } catch { /* best-effort */ }
    }

    /**
     * Avisos de Power BI, nunca una interfaz de licencias propia. Orden: limpiar lo que haya, banner
     * con la función, y ~10 s después la barra Upgrade, que es la que lleva a la compra.
     */
    private notifyProFeatureBlocked(): void {
        const lm: any = (this.host as any).licenseManager;
        if (!lm) return;
        if (this.isPro) { this.clearLicenseNotice(); return; }
        const wanted = this.attemptedPro();
        if (!wanted.length) { this.clearLicenseNotice(); return; }
        if (!this.licenseResolved || this.licenseEnvUnsupported) return;
        const signature = wanted.map(w => w.id).join("|") + "|" + JSON.stringify(this.lastDv?.metadata?.objects ?? {});
        if (signature === this.lastBlockedNotice) return;
        this.lastBlockedNotice = signature;
        this.licenseIconShown = true;
        const list = wanted.map(w => w.label).join(", ");
        const msg = (this.isPreview()
            ? this.t("UI_NoticePreview", "Box & Whisker: {0} — part of the Pro plan, shown here as a watermarked preview. Reading view shows the free result.")
            : this.t("UI_NoticeBlocked", "Box & Whisker: {0} — part of the Pro plan. Get a licence to enable it.")).replace("{0}", list);
        const show = () => {
            try { lm.notifyFeatureBlocked?.(msg.slice(0, 500)); } catch { /* best-effort */ }
            this.cancelLicenseIcon();
            this.licenseIconTimer = window.setTimeout(() => {
                this.licenseIconTimer = null;
                if (this.destroyed || this.isPro || !this.licenseIconShown) return;
                try { lm.notifyLicenseRequired?.(NOTIFY_GENERAL); } catch { /* best-effort */ }
            }, 10500);
        };
        let cleared: any;
        try { cleared = lm.clearLicenseNotification?.(); } catch { /* best-effort */ }
        if (cleared && typeof cleared.then === "function") cleared.then(show, show); else show();
    }

    // ── Formato desde el lienzo (on-object) ───────────────────────────────────

    private subSelectable(el: Element, objectName: string, displayName: string, type: powerbi.visuals.SubSelectionStylesType): void {
        if (!this.formatMode) { el.classList.remove(HtmlSubSelectableClass); return; }
        el.classList.add(HtmlSubSelectableClass);
        el.setAttribute(SubSelectableObjectNameAttribute, objectName);
        el.setAttribute(SubSelectableDisplayNameAttribute, displayName);
        el.setAttribute(SubSelectableTypeAttribute, String(type));
    }

    private updateOutlines(options: VisualUpdateOptions): void {
        if (!this.formatMode) return;
        const subs = (options as any).subSelections as powerbi.visuals.CustomVisualSubSelection[] | undefined;
        this.subSelectionHelper.updateOutlinesFromSubSelections(subs ?? [], true);
    }

    private getSubSelectionStyles(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.SubSelectionStyles | undefined {
        const name = subs[0]?.customVisualObjects[0]?.objectName;
        const ref = (objectName: string, propertyName: string, label: string) => ({ reference: { objectName, propertyName }, label });
        switch (name) {
            case "boxes":
                return { type: powerbi.visuals.SubSelectionStylesType.Shape,
                    fill: ref("boxes", "fill", this.t("Prop_boxes_fill", "Box color")),
                    stroke: ref("boxes", "border", this.t("Prop_boxes_border", "Border color")) } as any;
            case "valueAxis":
                return { type: powerbi.visuals.SubSelectionStylesType.Text,
                    fontFamily: ref("valueAxis", "fontFamily", this.t("Prop_valueAxis_fontFamily", "Font")),
                    bold: ref("valueAxis", "bold", this.t("Prop_valueAxis_bold", "Bold")),
                    fontSize: ref("valueAxis", "fontSize", this.t("Prop_valueAxis_fontSize", "Text size")),
                    fontColor: ref("valueAxis", "color", this.t("Prop_valueAxis_color", "Text color")) } as any;
            case "categoryAxis":
                return { type: powerbi.visuals.SubSelectionStylesType.Text,
                    fontFamily: ref("categoryAxis", "fontFamily", this.t("Prop_categoryAxis_fontFamily", "Font")),
                    bold: ref("categoryAxis", "bold", this.t("Prop_categoryAxis_bold", "Bold")),
                    fontSize: ref("categoryAxis", "fontSize", this.t("Prop_categoryAxis_fontSize", "Text size")),
                    fontColor: ref("categoryAxis", "color", this.t("Prop_categoryAxis_color", "Text color")) } as any;
            case "legend":
                return { type: powerbi.visuals.SubSelectionStylesType.Text,
                    fontSize: ref("legend", "fontSize", this.t("Prop_legend_fontSize", "Text size")),
                    fontColor: ref("legend", "color", this.t("Prop_legend_color", "Text color")) } as any;
            case "background":
                return { type: powerbi.visuals.SubSelectionStylesType.Shape,
                    fill: ref("background", "color", this.t("Prop_background_color", "Color")) } as any;
        }
        return undefined;
    }

    private getSubSelectionShortcuts(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.VisualSubSelectionShortcuts | undefined {
        const name = subs[0]?.customVisualObjects[0]?.objectName;
        const id = (objectName: string, propertyName: string) => ({ objectName, propertyName });
        const nav = (card: string, label: string) => ({ type: powerbi.visuals.VisualShortcutType.Navigate, destinationInfo: { cardUid: "Visual-" + card + "_card" }, label });
        switch (name) {
            case "boxes":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Picker, ...id("boxes", "orientation"), label: this.t("Prop_boxes_orientation", "Orientation") },
                    { type: powerbi.visuals.VisualShortcutType.Picker, ...id("style", "template"), label: this.t("Prop_style_template", "Template") },
                    { type: powerbi.visuals.VisualShortcutType.Divider },
                    { type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: [id("boxes", "fill"), id("boxes", "border"), id("boxes", "width"), id("boxes", "opacity")] },
                    nav("boxes", this.t("Obj_boxes", "Boxes")),
                ] as any;
            case "valueAxis":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Toggle, ...id("valueAxis", "gridlines"), relatedToggledFormattingIds: [id("valueAxis", "gridlines")],
                        disabledLabel: this.t("UI_HideGrid", "Hide gridlines"), enabledLabel: this.t("UI_ShowGrid", "Show gridlines") },
                    { type: powerbi.visuals.VisualShortcutType.Divider },
                    { type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: [id("valueAxis", "fontSize"), id("valueAxis", "color")] },
                    nav("valueAxis", this.t("Obj_valueAxis", "Value axis")),
                ] as any;
            case "categoryAxis":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: [id("categoryAxis", "fontSize"), id("categoryAxis", "color")] },
                    nav("categoryAxis", this.t("Obj_categoryAxis", "Category axis")),
                ] as any;
            case "legend":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Picker, ...id("legend", "position"), label: this.t("Prop_legend_position", "Position") },
                    { type: powerbi.visuals.VisualShortcutType.Divider },
                    { type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: [id("legend", "fontSize"), id("legend", "color")] },
                    nav("legend", this.t("Obj_legend", "Legend")),
                ] as any;
            case "background":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: [id("background", "color")] },
                    nav("background", this.t("Obj_background", "Background")),
                ] as any;
        }
        return undefined;
    }

    // ── Panel de formato ──────────────────────────────────────────────────────

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        const s = this.s;
        const T = (k: string, fb: string) => this.t(k, fb);
        const d = (obj: string, prop: string) => ({ objectName: obj, propertyName: prop });
        const name = (obj: string, prop: string, fb: string) => T(`Prop_${obj}_${prop}`, fb);
        const num = (obj: string, prop: string, fb: string, v: number) => ({ uid: `${obj}_${prop}`, displayName: name(obj, prop, fb), control: { type: powerbi.visuals.FormattingComponent.NumUpDown, properties: { descriptor: d(obj, prop), value: v } } });
        const tog = (obj: string, prop: string, fb: string, v: boolean) => ({ uid: `${obj}_${prop}`, displayName: name(obj, prop, fb), control: { type: powerbi.visuals.FormattingComponent.ToggleSwitch, properties: { descriptor: d(obj, prop), value: v } } });
        const font = (obj: string, prop: string, fb: string, v: string) => ({ uid: `${obj}_${prop}`, displayName: name(obj, prop, fb), control: { type: powerbi.visuals.FormattingComponent.FontPicker, properties: { descriptor: d(obj, prop), value: v || "Segoe UI" } } });
        const txt = (obj: string, prop: string, fb: string, v: string) => ({ uid: `${obj}_${prop}`, displayName: name(obj, prop, fb), control: { type: powerbi.visuals.FormattingComponent.TextInput, properties: { descriptor: d(obj, prop), value: v, placeholder: "" } } });
        const col = (obj: string, prop: string, fb: string, v: string, cf = false) => ({
            uid: `${obj}_${prop}`, displayName: name(obj, prop, fb),
            control: { type: powerbi.visuals.FormattingComponent.ColorPicker, properties: {
                descriptor: { ...d(obj, prop), ...(cf ? {
                    instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule,
                    selector: dataViewWildcard.createDataViewWildcardSelector(dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals) as any,
                } : {}) },
                value: { value: v || "" },
            } },
        });
        const dd = (obj: string, prop: string, fb: string, v: string, items: [string, string, string][]) => {
            const list = items.map(([value, key, f]) => ({ value, displayName: T(key, f) }));
            return { uid: `${obj}_${prop}`, displayName: name(obj, prop, fb),
                control: { type: powerbi.visuals.FormattingComponent.Dropdown, properties: { descriptor: d(obj, prop), value: list.find(x => x.value === v) ?? list[0], items: list } as any } };
        };
        const card = (obj: string, fb: string, slices: any[]) => ({ uid: `${obj}_card`, displayName: T(`Obj_${obj}`, fb), groups: [{ uid: `${obj}_g`, displayName: "", slices }] });

        return { cards: [
            card("style", "Style template", [
                dd("style", "template", "Template", s.template, [["clean", "Enum_tpl_clean", "Clean"], ["classic", "Enum_tpl_classic", "Classic"],
                    ["minimal", "Enum_tpl_minimal", "Minimal"], ["contrast", "Enum_tpl_contrast", "Contrast"], ["compact", "Enum_tpl_compact", "Compact"],
                    ["ibcs", "Enum_tpl_ibcs", "IBCS style"]]),
            ]),
            card("boxes", "Boxes", [
                dd("boxes", "orientation", "Orientation", s.orientation, [["vertical", "Enum_or_vertical", "Vertical"], ["horizontal", "Enum_or_horizontal", "Horizontal"]]),
                col("boxes", "fill", "Box color", s.fill, true),
                col("boxes", "border", "Border color", s.border),
                num("boxes", "borderWidth", "Border width", s.borderWidth),
                num("boxes", "width", "Box width %", s.width),
                num("boxes", "radius", "Rounded corners", s.radius),
                num("boxes", "opacity", "Fill opacity %", s.opacity),
                col("boxes", "medianColor", "Median line color", s.medianColor),
                tog("boxes", "quartileColors", "Color by quartile (Pro)", s.quartileColors),
                col("boxes", "lowerColor", "Lower half color", s.lowerColor),
                col("boxes", "upperColor", "Upper half color", s.upperColor),
            ]),
            card("whiskers", "Whiskers", [
                dd("whiskers", "rule", "Whiskers reach", s.whiskerRule, [["tukey", "Enum_wh_tukey", "1.5 × IQR (Tukey)"], ["minmax", "Enum_wh_minmax", "Minimum to maximum"],
                    ["p5", "Enum_wh_p5", "5th to 95th percentile (Pro)"], ["p10", "Enum_wh_p10", "10th to 90th percentile (Pro)"]]),
                tog("whiskers", "caps", "Caps", s.caps),
                col("whiskers", "color", "Whisker color", s.whiskerColor),
            ]),
            card("statistics", "Statistics", [
                dd("statistics", "method", "Quartile method", s.method, [["linear", "Enum_m_linear", "Inclusive (Excel QUARTILE.INC)"],
                    ["exclusive", "Enum_m_exclusive", "Exclusive (Excel QUARTILE.EXC) (Pro)"], ["hinges", "Enum_m_hinges", "Tukey hinges (Pro)"]]),
                tog("statistics", "showN", "Show n under each box", s.showN),
                tog("statistics", "medianLabel", "Median label", s.medianLabel),
                tog("statistics", "showMean", "Mean marker (Pro)", s.showMean),
                col("statistics", "meanColor", "Mean color", s.meanColor),
                tog("statistics", "notches", "Notches (Pro)", s.notches),
            ]),
            card("points", "Points", [
                tog("points", "show", "Show all points (Pro)", s.points),
                num("points", "jitter", "Jitter %", s.jitter),
                num("points", "size", "Point size", s.pointSize),
                col("points", "color", "Point color", s.pointColor),
                col("points", "borderColor", "Point border color", s.pointBorderColor),
                num("points", "borderWidth", "Point border width", s.pointBorderWidth),
                num("points", "opacity", "Point opacity %", s.pointOpacity),
                num("points", "outlierSize", "Outlier size", s.outlierSize),
                col("points", "outlierColor", "Outlier color", s.outlierColor),
            ]),
            card("violin", "Violin", [
                tog("violin", "show", "Show violin (Pro)", s.violin),
                num("violin", "opacity", "Violin opacity %", s.violinOpacity),
                col("violin", "color", "Violin color", s.violinColor),
            ]),
            card("sort", "Sort", [
                dd("sort", "by", "Sort boxes by", s.sortBy, [["data", "Enum_s_data", "Data order"], ["name", "Enum_s_name", "Name"],
                    ["median", "Enum_s_median", "Median (Pro)"], ["mean", "Enum_s_mean", "Mean (Pro)"], ["iqr", "Enum_s_iqr", "Spread (IQR) (Pro)"], ["count", "Enum_s_count", "Count (Pro)"]]),
                tog("sort", "descending", "Descending", s.descending),
            ]),
            card("reference", "Reference lines", [
                tog("reference", "show", "Reference line (Pro)", s.ref1),
                num("reference", "value", "Value", s.ref1Value),
                txt("reference", "label", "Label", s.ref1Label),
                col("reference", "color", "Line color", s.refColor),
                tog("reference", "show2", "Second line (Pro)", s.ref2),
                num("reference", "value2", "Second value", s.ref2Value),
                txt("reference", "label2", "Second label", s.ref2Label),
            ]),
            card("valueAxis", "Value axis", [
                tog("valueAxis", "show", "Show", s.vAxis),
                tog("valueAxis", "title", "Title", s.vTitle),
                txt("valueAxis", "titleText", "Title text", s.vTitleText),
                tog("valueAxis", "gridlines", "Gridlines", s.grid),
                tog("valueAxis", "auto", "Automatic range", s.vAuto),
                num("valueAxis", "min", "Minimum", s.vMin),
                num("valueAxis", "max", "Maximum", s.vMax),
                num("valueAxis", "fontSize", "Text size", s.vFont),
                col("valueAxis", "color", "Text color", s.vColor),
                font("valueAxis", "fontFamily", "Font", s.vFamily),
                tog("valueAxis", "bold", "Bold", s.vBold),
            ]),
            card("categoryAxis", "Category axis", [
                tog("categoryAxis", "show", "Show", s.cAxis),
                num("categoryAxis", "fontSize", "Text size", s.cFont),
                col("categoryAxis", "color", "Text color", s.cColor),
                font("categoryAxis", "fontFamily", "Font", s.cFamily),
                tog("categoryAxis", "bold", "Bold", s.cBold),
            ]),
            card("legend", "Legend", [
                tog("legend", "show", "Show", s.legend),
                dd("legend", "position", "Position", s.legendPos, [["top", "Enum_lg_top", "Top"], ["bottom", "Enum_lg_bottom", "Bottom"]]),
                num("legend", "fontSize", "Text size", s.legendFont),
                col("legend", "color", "Text color", s.legendColor),
            ]),
            card("statsTable", "Statistics table", [
                tog("statsTable", "show", "Show table (Pro)", s.table),
                num("statsTable", "fontSize", "Text size", s.tableFont),
                col("statsTable", "color", "Text color", s.tableColor),
                col("statsTable", "headerBackground", "Header background", s.tableHeaderBg),
                col("statsTable", "headerColor", "Header text color", s.tableHeaderColor),
                col("statsTable", "banding", "Alternate row color", s.tableBanding),
            ]),
            card("smallMultiples", "Small multiples", [
                num("smallMultiples", "columns", "Columns (0 = automatic)", s.smCols),
                num("smallMultiples", "gap", "Space between panels", s.smGap),
                num("smallMultiples", "titleSize", "Title size", s.smTitleSize),
                col("smallMultiples", "titleColor", "Title color", s.smTitleColor),
                tog("smallMultiples", "titleBold", "Bold title", s.smTitleBold),
                dd("smallMultiples", "titleAlign", "Title alignment", s.smTitleAlign, [["left", "Enum_al_left", "Left"], ["center", "Enum_al_center", "Center"]]),
                col("smallMultiples", "background", "Panel background", s.smBackground),
                tog("smallMultiples", "border", "Panel border", s.smBorder),
                col("smallMultiples", "borderColor", "Panel border color", s.smBorderColor),
            ]),
            card("background", "Background", [
                col("background", "color", "Color", s.background),
            ]),
        ] } as any;
    }
}
