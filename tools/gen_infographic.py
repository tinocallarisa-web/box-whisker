# -*- coding: utf-8 -*-
"""Infografías de la ficha (1366x768): docs/infographic.html y docs/infographic-pro.html, y sus PNG en assets/.

Imágenes de entrada (tools/img/): free.png y pro.png (simulador, datos de inspecciones de calidad) y desktop.png
(captura de Power BI Desktop, estilo IBCS con grupos, paneles, violín y tabla). Ejecutar: python tools/gen_infographic.py
"""
import asyncio, base64, io, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "tools", "img")


def data_uri(name, width):
    im = Image.open(os.path.join(IMG, name)).convert("RGB")
    # Las capturas del simulador llevan un marco gris: se recorta al contenido.
    from PIL import ImageChops
    fondo = Image.new("RGB", im.size, im.getpixel((1, 1)))
    caja = ImageChops.difference(im, fondo).point(lambda v: 255 if v > 6 else 0).getbbox()
    if caja and name != "desktop.png":
        im = im.crop(caja)
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "JPEG", quality=88)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()


CSS = """
:root{--bg:#FAF9F5;--bg2:#EDE9DE;--line:#DAD9D4;--t1:#3D3929;--t2:#535146;--t3:#83827D;--acc:#2B6CB0;--accd:#1F4E80;--acc2:#3E9C5B;--acc2l:#E3F2E8}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#888;font-family:'Segoe UI',system-ui,sans-serif}
#infographic{background:var(--bg);color:var(--t1);width:1366px;height:768px;overflow:hidden;padding:22px 34px 16px;display:flex;flex-direction:column;gap:14px}
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}
.head h1{font-family:Poppins,'Segoe UI',sans-serif;font-size:32px;font-weight:700;line-height:1.05}
.head h1 span{color:var(--acc)}
.head p{font-size:15px;color:var(--t2);margin-top:6px;max-width:760px}
.brand{font-size:12px;color:var(--t3);text-align:right;line-height:1.5}
.brand b{color:var(--acc)}
.grid{display:grid;gap:16px;flex:1;min-height:0}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px;min-height:0}
.card h3{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--t3);margin-bottom:8px}
.shot{background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px;display:flex;flex-direction:column;min-height:0}
.shot img{width:100%;height:100%;object-fit:contain;display:block;min-height:0;flex:1}
.shot .cap{font-size:12px;color:var(--t3);padding:6px 4px 0}
.steps{list-style:none;display:grid;gap:7px}
.steps li{display:grid;grid-template-columns:24px 1fr;gap:8px;font-size:13.5px;color:var(--t2);align-items:start}
.steps b.n{width:22px;height:22px;border-radius:50%;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px}
.steps strong{color:var(--t1)}
ul.l{list-style:none;display:grid;gap:5px}
ul.l li{font-size:13px;color:var(--t2);padding-left:18px;position:relative;line-height:1.35}
ul.l li::before{content:"";position:absolute;left:2px;top:6px;width:8px;height:8px;border-radius:2px;background:var(--acc)}
ul.l.pro li::before{background:var(--acc2)}
.big ul.l{gap:14px} .big ul.l li{font-size:15px} .big ul.l li::before{top:7px}
.chip{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.8px;padding:2px 8px;border-radius:999px;margin-left:6px;vertical-align:middle}
.chip.free{background:#E6EEF8;color:var(--accd)} .chip.pro{background:var(--acc2l);color:#2F7A47}
.foot{display:flex;justify-content:space-between;font-size:12px;color:var(--t3)}
.foot b{color:var(--t2)}
"""

DIAGRAMA = """<svg viewBox="0 0 640 200" style="width:100%;display:block" aria-hidden="true">
  <g font-family="Segoe UI, sans-serif" font-size="15" fill="#535146" text-anchor="middle">
    <line x1="60" y1="95" x2="190" y2="95" stroke="#605E5C" stroke-width="2.5"/><line x1="60" y1="76" x2="60" y2="114" stroke="#605E5C" stroke-width="2.5"/>
    <line x1="400" y1="95" x2="515" y2="95" stroke="#605E5C" stroke-width="2.5"/><line x1="515" y1="76" x2="515" y2="114" stroke="#605E5C" stroke-width="2.5"/>
    <rect x="190" y="66" width="210" height="58" rx="3" fill="#2B6CB0" fill-opacity="0.18" stroke="#2B6CB0" stroke-width="2.5"/>
    <line x1="272" y1="66" x2="272" y2="124" stroke="#1F4E80" stroke-width="4"/>
    <circle cx="590" cy="95" r="7" fill="#fff" stroke="#B4541C" stroke-width="3"/>
    <g stroke="#B5B3AA" stroke-dasharray="3 4"><line x1="60" y1="40" x2="60" y2="70"/><line x1="190" y1="22" x2="190" y2="62"/><line x1="272" y1="40" x2="272" y2="62"/><line x1="400" y1="22" x2="400" y2="62"/><line x1="515" y1="40" x2="515" y2="70"/><line x1="590" y1="22" x2="590" y2="84"/></g>
    <text x="60" y="34">Min</text><text x="190" y="16">Q1</text><text x="272" y="34" font-weight="700" fill="#3D3929">Median</text>
    <text x="400" y="16">Q3</text><text x="515" y="34">Max</text><text x="590" y="16">Outlier</text>
    <path d="M190 140 v8 h210 v-8" fill="none" stroke="#83827D" stroke-width="1.5"/>
    <text x="295" y="172">IQR = Q3 − Q1 · the middle 50%</text>
  </g></svg>"""


def page(title, body):
    return (f'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>{title}</title>'
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap">'
            f'<style>{CSS}</style></head><body><div id="infographic">{body}</div></body></html>\n')


def general():
    body = f"""
<div class="head"><div><h1>Box &amp; Whisker <span>by TCViz</span></h1>
<p>An average hides the story. See how the values of each category spread: the median, the middle half, the normal range and the cases outside it.</p></div>
<div class="brand"><b>tcviz.com</b><br>Power BI custom visual · no network requests</div></div>
<div class="grid" style="grid-template-columns:400px 1fr">
  <div style="display:flex;flex-direction:column;gap:14px;min-height:0">
    <div class="card"><h3>How to read it</h3>{DIAGRAMA}
      <p style="font-size:12.5px;color:var(--t2);margin-top:4px">Whiskers reach the last value within 1.5 × IQR (Tukey). <strong>n</strong> under every box; the quartile method is named in the tooltip.</p></div>
    <div class="card"><h3>Start in 3 steps</h3><ol class="steps">
      <li><b class="n">1</b><span><strong>Category</strong> · one box per value: plant, region, team</span></li>
      <li><b class="n">2</b><span><strong>Value</strong> · the measure to study: score, days, amount</span></li>
      <li><b class="n">3</b><span><strong>Detail (rows)</strong> · the ID of each row: inspection, order, ticket</span></li></ol></div>
    <div class="card" style="flex:1"><h3>Free <span class="chip free">FREE</span></h3><ul class="l">
      <li>Boxes, whiskers, outliers and n for every category</li><li>Tukey or min–max whiskers; Excel QUARTILE.INC quartiles</li>
      <li>6 templates incl. IBCS style; fx colours; vertical or horizontal</li><li>Cross-filtering, bookmarks, drilldown, keyboard, high contrast, 12 languages</li></ul></div>
  </div>
  <div class="shot"><img src="{data_uri('free.png', 1300)}" alt=""><div class="cap">Quality score by plant: Sevilla is high and consistent; Bilbao spreads from 46 to 72 in its middle half. Free version, median labels on.</div></div>
</div>
<div class="foot"><span><b>Pro</b> adds groups, small multiples, points, violin, mean and notches, sorting by median, reference lines and a statistics table.</span><span>Documentation: tinocallarisa-web.github.io/box-whisker</span></div>
"""
    return page("Box & Whisker by TCViz — Visual Guide", body)


def pro():
    body = f"""
<div class="head"><div><h1>Box &amp; Whisker <span>Pro</span></h1>
<p>Compare distributions across groups, years and targets — on your own data, in Power BI.</p></div>
<div class="brand"><b>tcviz.com</b><br>Pro preview while you edit · licence on Microsoft AppSource</div></div>
<div class="grid" style="grid-template-columns:850px 1fr">
  <div style="display:flex;flex-direction:column;gap:14px;min-height:0">
    <div class="shot" style="flex:none"><img src="{data_uri('desktop.png', 1300)}" alt="" style="height:auto"><div class="cap">Power BI Desktop · IBCS style: Group = Shift, Small multiples = Year, violin and statistics table.</div></div>
    <div class="card big" style="flex:1"><h3>Pro <span class="chip pro">PRO</span></h3><ul class="l pro" style="grid-template-columns:1fr 1fr;column-gap:22px;row-gap:14px;margin-top:6px">
      <li><strong>Group</strong>: boxes side by side, with a legend</li>
      <li><strong>Small multiples</strong> on a shared scale</li>
      <li>All points with jitter, mean marker and notches</li>
      <li>Violin behind each box; colour by quartile</li>
      <li>Sort by median, mean, IQR or count</li>
      <li>Exclusive quartiles, Tukey hinges, percentile whiskers</li>
      <li>Two reference lines and a statistics table</li></ul></div>
  </div>
  <div style="display:flex;flex-direction:column;gap:14px;min-height:0">
    <div class="shot" style="flex:none"><img src="{data_uri('pro.png', 900)}" alt="" style="height:auto"><div class="cap">Points, mean, notches and a target line, sorted by median.</div></div>
    <div class="card big" style="flex:1"><h3>Try it on your data</h3><ul class="l">
      <li>Turn on any Pro feature while editing: it is drawn working on your own data, under a “Pro preview” watermark.</li>
      <li>Free stays a complete, correct box plot: Pro adds ways to compare, not the right answer.</li>
      <li>Every statistic is computed inside your report. No network requests.</li></ul></div>
  </div>
</div>
"""
    return page("Box & Whisker by TCViz — Pro", body)


async def render(html_path, png_path):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1366, "height": 768})
        await pg.goto("file:///" + html_path.replace("\\", "/"))
        await pg.wait_for_timeout(800)
        el = await pg.query_selector("#infographic")
        await el.screenshot(path=png_path)
        await b.close()


def main():
    os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
    for nombre, f, png in (("infographic.html", general, "infographic.png"), ("infographic-pro.html", pro, "infographic-pro.png")):
        h = os.path.join(ROOT, "docs", nombre)
        io.open(h, "w", encoding="utf-8", newline="\n").write(f())
        asyncio.run(render(h, os.path.join(ROOT, "assets", png)))
        print(nombre, "->", png, Image.open(os.path.join(ROOT, "assets", png)).size)


if __name__ == "__main__":
    main()
