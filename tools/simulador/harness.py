# -*- coding: utf-8 -*-
"""Simulador Playwright del Box & Whisker: formato dinámico (F11), tarjeta Accesibilidad (D10), fx y marca de agua.

Carga el bundle de una build de prueba con un host simulado y un dataView categorical sintético (semilla fija).
No reproduce el motor de Power BI: el formato dinámico real, los tooltips, el panel y la licencia solo se ven en Desktop.
Aquí se comprueba que el visual LEE lo que Power BI le manda (objects[r].general.formatString, accessibility, boxes.fill).

Uso (las builds dejan el bundle en .tmp/drop; se copia a .tmp/sim_pro y .tmp/sim_free):
    node build-test.js --free && (copiar .tmp/drop a .tmp/sim_free)
    node build-test.js        && (copiar .tmp/drop a .tmp/sim_pro)
    python tools/simulador/harness.py      → tools/simulador/capturas/*.png y un OK/FALLO por comprobación
"""
import asyncio, io, json, os, random, sys
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "capturas")
FALLOS = []

STUB = r"""
window.__ev = [];
window.powerbi = { visuals: { plugins: {} }, extensibility: {} };
(function(){
 const PAL = ['#118DFF','#12239E','#E66C37','#6B007B','#E044A7','#744EC2'];
 let pi = 0; const pmap = {};
 function mkId(k){ return { __k:k, getKey(){return k;}, getSelector(){return {k};}, equals(o){return !!o && o.__k===k;}, includes(o){ return !!o && o.__k===k; } }; }
 window.__host = {
  eventService: { renderingStarted(){ __ev.push('S'); }, renderingFinished(){ __ev.push('F'); }, renderingFailed(o,m){ __ev.push('X'); console.error('FAILED', m); } },
  createSelectionManager(){ return { select(){ return Promise.resolve([]); }, clear(){ return Promise.resolve(); }, getSelectionIds(){ return []; },
     hasSelection(){ return false; }, registerOnSelectCallback(){}, showContextMenu(){ return Promise.resolve(); } }; },
  createSelectionIdBuilder(){ const k=[]; return { withCategory(c,i){ k.push(c.source.queryName+'='+c.values[i]); return this; },
     withMeasure(m){ k.push(m); return this; }, withSeries(){ return this; }, createSelectionId(){ return mkId(k.join('|')); } }; },
  createLocalizationManager(){ return { getDisplayName(k){ return k; } }; },
  tooltipService: { show(o){ window.__tip = o; }, move(){}, hide(){} },
  subSelectionService: { subSelect(){}, updateRegionOutlines(){} },
  hostCapabilities: { allowInteractions: true }, locale: 'en-US',
  colorPalette: { isHighContrast: !!window.__sysHC, foreground:{value: window.__sysHC ? '#FFFF00' : '#252423'}, background:{value: window.__sysHC ? '#000000' : '#FFFFFF'},
    foregroundSelected:{value:'#1AEBFF'},
    getColor(k){ if (!(k in pmap)) pmap[k] = PAL[(pi++) % PAL.length]; return {value: pmap[k]}; } },
  fetchMoreData(){ return false; }, persistProperties(){}, launchUrl(){}, displayWarningIcon(){}, hideWarningIcon(){},
 };
 if (window.__license) window.__host.licenseManager = {
   getAvailableServicePlans(){ return Promise.resolve({ plans: [], isLicenseUnsupportedEnv: false, isLicenseInfoAvailable: true }); },
   notifyFeatureBlocked(){ return Promise.resolve(true); }, notifyLicenseRequired(){ return Promise.resolve(true); }, clearLicenseNotification(){ return Promise.resolve(true); } };
})();
"""

REGIONS = [("Spain", "#,0.00 €"), ("United States", "$#,0.00"), ("Japan", "¥#,0"), ("United Kingdom", "£#,0.0")]


def dataview(dyn="per-region", objects=None, rule=None):
    """dyn: 'per-region' (cada región su moneda), 'uniform' (todas '#,0.0 "days"'), None (sin formato dinámico)."""
    rnd = random.Random(7)
    cat, det, val, vobj, cobj = [], [], [], [], []
    for ri, (reg, f) in enumerate(REGIONS):
        for k in range(40):
            cat.append(reg); det.append(f"{reg[:2]}-{k:03d}")
            val.append(round(rnd.gauss(1000 + 250 * ri, 180), 2))
            if dyn == "per-region": vobj.append({"general": {"formatString": f}})
            elif dyn == "uniform": vobj.append({"general": {"formatString": '#,0.0 "days"'}})
            cobj.append({"boxes": {"fill": {"solid": {"color": rule[reg]}}}} if rule and reg in rule else None)
    c1 = {"source": {"displayName": "Region", "queryName": "S.Region", "roles": {"category": True}}, "values": cat}
    if rule: c1["objects"] = cobj
    c2 = {"source": {"displayName": "Order", "queryName": "S.Order", "roles": {"detail": True}}, "values": det}
    v = {"source": {"displayName": "Amount", "queryName": "Sum(S.Amount)", "roles": {"value": True}, "isMeasure": True, "format": "#,0"}, "values": val}
    if dyn: v["objects"] = vobj
    return {"metadata": {"columns": [c1["source"], c2["source"], v["source"]], "objects": objects or {}},
            "categorical": {"categories": [c1, c2], "values": [v]}}


def check(name, ok, detail=""):
    print(f"  {'OK   ' if ok else 'FALLO'} {name}{'  — ' + detail if detail else ''}")
    if not ok: FALLOS.append(name)


async def page(browser, build, dv, W=900, H=520, view=0, sys_hc=False, license=False, name=None):
    drop = os.path.join(ROOT, ".tmp", build)
    guid = json.load(io.open(os.path.join(drop, "pbiviz.json"), encoding="utf-8"))["visual"]["guid"]
    pg = await browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=2)
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.set_content(f"<html><body style='margin:0;background:#FFFFFF'><div id='host' style='position:relative;width:{W}px;height:{H}px;overflow:hidden'></div></body></html>")
    await pg.add_style_tag(path=os.path.join(drop, "visual.css"))
    await pg.add_script_tag(content=f"window.__sysHC = {json.dumps(sys_hc)}; window.__license = {json.dumps(license)};")
    await pg.add_script_tag(content=STUB)
    await pg.add_script_tag(path=os.path.join(drop, "visual.js"))
    await pg.evaluate("(g) => { window.__v = powerbi.visuals.plugins[g].create({ element: document.getElementById('host'), host: __host }); }", guid)
    await pg.evaluate("([dv, W, H, vm]) => __v.update({ dataViews: dv ? [dv] : [], viewport: {width: W, height: H}, type: 2, operationKind: 0, viewMode: vm })",
                      [dv, W, H, view])
    await pg.wait_for_timeout(600)
    if name:
        await pg.screenshot(path=os.path.join(OUT, name + ".png"))
    ev = await pg.evaluate("() => __ev.join('')")
    check(f"{name or 'página'}: sin errores y eventos de render 1:1", not errs and ev.count("S") == ev.count("F") and "X" not in ev, f"eventos {ev} {errs[:2]}")
    return pg


async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        stats_on = {"statsTable": {"show": True}}

        print("F11 · formato dinámico")
        pg = await page(b, "sim_pro", dataview("per-region", stats_on), name="01_formato_dinamico_por_region")
        rows = await pg.evaluate("() => Array.from(document.querySelectorAll('.tcbw-table tbody tr')).map(tr => Array.from(tr.children).map(td => td.textContent))")
        byreg = {r[0]: r for r in rows}
        check("tabla: España en euros", "€" in byreg.get("Spain", [""])[3], str(byreg.get("Spain")))
        check("tabla: EE. UU. en dólares", byreg.get("United States", [""])[3].startswith("$"), str(byreg.get("United States")))
        check("tabla: Japón en yenes", "¥" in byreg.get("Japan", [""])[3], str(byreg.get("Japan")))
        check("tabla: Reino Unido en libras", "£" in byreg.get("United Kingdom", [""])[3], str(byreg.get("United Kingdom")))
        aria = await pg.evaluate("() => Array.from(document.querySelectorAll('g[data-box]')).map(g => g.getAttribute('aria-label'))")
        check("aria-label de cada caja con su moneda", any("€" in a for a in aria) and any("$" in a for a in aria), aria[0])
        await pg.dispatch_event("g[data-box] >> nth=0", "mousemove")
        tip = await pg.evaluate("() => (window.__tip && window.__tip.dataItems || []).map(i => i.displayName + '=' + i.value)")
        check("tooltip con el formato de la caja", any("€" in t for t in tip), "; ".join(tip[:5]))
        ticks = await pg.evaluate("() => Array.from(document.querySelectorAll('.tcbw-vaxis text')).map(t => t.textContent)")
        check("eje: monedas distintas → formato de la columna (#,0)", ticks and not any(c in "".join(ticks) for c in "€$¥£"), " ".join(ticks))
        await pg.close()

        pg = await page(b, "sim_pro", dataview("uniform"), name="02_formato_dinamico_uniforme")
        ticks = await pg.evaluate("() => Array.from(document.querySelectorAll('.tcbw-vaxis text')).map(t => t.textContent)")
        check("eje: formato dinámico común → se aplica al eje", ticks and all("days" in t for t in ticks), " ".join(ticks))
        await pg.close()

        pg = await page(b, "sim_pro", dataview(None, stats_on), name="03_sin_formato_dinamico")
        rows = await pg.evaluate("() => Array.from(document.querySelectorAll('.tcbw-table tbody tr')).map(tr => tr.children[3].textContent)")
        check("sin formato dinámico: formato de la columna, como en la 1.0.0", rows and not any(c in "".join(rows) for c in "€$¥£"), " ".join(rows))
        await pg.close()

        print("D10 · tarjeta Accesibilidad")
        pg = await page(b, "sim_pro", dataview("per-region", {"accessibility": {"highContrast": "on"}}), name="04_alto_contraste_forzado")
        st = await pg.evaluate("""() => { const r = document.querySelector('g[data-box] rect');
            return { bg: document.querySelector('.tcbw').style.background, fill: r.getAttribute('fill'), stroke: r.getAttribute('stroke') }; }""")
        check("alto contraste 'On': fondo blanco, cajas sin relleno y trazo negro", st["fill"] == "none" and st["stroke"] == "#000000" and "255" in st["bg"], str(st))
        await pg.close()

        pg = await page(b, "sim_pro", dataview("per-region"), sys_hc=True, name="05_alto_contraste_windows")
        st = await pg.evaluate("() => { const r = document.querySelector('g[data-box] rect'); return { fill: r.getAttribute('fill'), stroke: r.getAttribute('stroke') }; }")
        check("alto contraste 'Automático' con tema de Windows: colores del tema", st["fill"] == "none" and st["stroke"].upper() == "#FFFF00", str(st))
        await pg.close()

        pg = await page(b, "sim_pro", dataview("per-region"), name="06_sin_alto_contraste")
        st = await pg.evaluate("() => document.querySelector('g[data-box] rect').getAttribute('fill')")
        check("'Automático' sin tema de Windows: colores normales", st not in ("none", "#000000"), st)
        await pg.close()

        pg = await page(b, "sim_pro", dataview("per-region", {"accessibility": {"focusColor": {"solid": {"color": "#D00000"}}, "focusWidth": 5}}))
        await pg.focus("g[data-box][tabindex='0']")
        await pg.keyboard.press("ArrowRight")
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=os.path.join(OUT, "07_foco_rojo_5px.png"))
        fo = await pg.evaluate("""() => { const h = document.activeElement && document.activeElement.querySelector('.tcbw-hit');
            const cs = h ? getComputedStyle(h) : null; return cs ? { stroke: cs.stroke, w: cs.strokeWidth } : null; }""")
        check("foco con el color y grosor de la tarjeta", fo and fo["stroke"] == "rgb(208, 0, 0)" and fo["w"] == "5px", str(fo))
        await pg.close()

        pg = await page(b, "sim_pro", dataview("per-region", {"accessibility": {"minTextSize": 14}, "style": {"template": "compact"}, "statsTable": {"show": True}}),
                        name="08_texto_minimo_14")
        sizes = await pg.evaluate("""() => Array.from(document.querySelectorAll('svg text')).map(t => parseFloat(t.getAttribute('font-size')))
            .concat([parseFloat(document.querySelector('.tcbw-table').style.fontSize)])""")
        check("tamaño mínimo 14: ningún texto del gráfico por debajo", sizes and min(sizes) >= 14, f"mín {min(sizes) if sizes else '-'}")
        await pg.close()
        pg = await page(b, "sim_pro", dataview("per-region", {"style": {"template": "compact"}}))
        sizes = await pg.evaluate("() => Array.from(document.querySelectorAll('svg text')).map(t => parseFloat(t.getAttribute('font-size')))")
        check("mínimo por defecto (6): plantilla Compact igual que en la 1.0.0 (n a 7 px)", 7 in sizes and min(sizes) == 7, f"tamaños {sorted(set(sizes))}")
        await pg.close()

        print("Panel de formato y fx")
        pg = await page(b, "sim_pro", dataview("per-region"))
        fm = await pg.evaluate("""() => { const m = __v.getFormattingModel();
            const fill = m.cards.find(c => c.uid === 'boxes_card').groups[0].slices.find(s => s.uid === 'boxes_fill');
            return { cards: m.cards.map(c => c.uid), revert: m.cards.every(c => Array.isArray(c.revertToDefaultDescriptors) && c.revertToDefaultDescriptors.length),
                     acc: m.cards.find(c => c.uid === 'accessibility_card').groups[0].slices.map(s => s.uid),
                     alt: 'altConstantValueSelector' in fill.control.properties.descriptor && fill.control.properties.descriptor.altConstantValueSelector === null,
                     kind: fill.control.properties.descriptor.instanceKind }; }""")
        check("tarjeta 'accessibility' en el panel", fm["acc"] == ["accessibility_highContrast", "accessibility_focusColor", "accessibility_focusWidth", "accessibility_minTextSize"], str(fm["acc"]))
        check("revertToDefaultDescriptors en todas las tarjetas", fm["revert"], str(fm["cards"]))
        check("boxes.fill: ConstantOrRule con altConstantValueSelector null", fm["alt"] and fm["kind"] is not None, str(fm))
        await pg.close()

        pg = await page(b, "sim_pro", dataview("per-region", rule={"Spain": "#C00000", "Japan": "#00A000"}), name="09_fx_regla")
        fills = await pg.evaluate("() => Array.from(document.querySelectorAll('g[data-box]')).map(g => g.getAttribute('data-box').split('\\u0001')[1] + '=' + g.querySelector('rect').getAttribute('fill'))")
        check("fx por regla: España y Japón con su color, el resto con el fijo", "Spain=#C00000" in fills and "Japan=#00A000" in fills and "United States=#2B6CB0" in fills, str(fills))
        await pg.close()
        pg = await page(b, "sim_pro", dataview("per-region", {"boxes": {"fill": {"solid": {"color": "#7030A0"}}}}), name="10_fx_color_fijo")
        fills = await pg.evaluate("() => Array.from(document.querySelectorAll('g[data-box] rect:not(.tcbw-hit)')).map(r => r.getAttribute('fill'))")
        check("color fijo (metadata.objects): todas las cajas", fills and all(f == "#7030A0" for f in fills), str(set(fills)))
        await pg.close()

        print("Marca de agua común")
        pg = await page(b, "sim_free", dataview("per-region", {"points": {"show": True}, "statistics": {"showMean": True}}), view=1, license=True, name="11_marca_de_agua_vista_previa")
        wm = await pg.evaluate("() => { const w = document.querySelector('.tcviz-wm'); return w ? { d: getComputedStyle(w).display, t: w.textContent } : null; }")
        old = await pg.evaluate("() => !!document.querySelector('.tcbw-watermark')")
        check("vista previa sin licencia: marca común visible con las funciones", wm and wm["d"] == "flex" and "Pro preview" in wm["t"], str(wm))
        check("la marca propia antigua ya no existe", not old)
        await pg.close()
        pg = await page(b, "sim_free", dataview("per-region", {"points": {"show": True}}), view=0, license=True, name="12_lectura_sin_marca")
        wm = await pg.evaluate("() => { const w = document.querySelector('.tcviz-wm'); return w ? getComputedStyle(w).display : null; }")
        check("vista de lectura: sin marca", wm == "none", str(wm))
        await pg.close()
        pg = await page(b, "sim_pro", None, 640, 400, name="13_landing")
        await pg.close()
        await b.close()
    print(f"\n{len(FALLOS)} fallos" + (": " + ", ".join(FALLOS) if FALLOS else ""))
    sys.exit(1 if FALLOS else 0)


if __name__ == "__main__":
    asyncio.run(main())
