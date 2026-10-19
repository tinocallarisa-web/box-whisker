# -*- coding: utf-8 -*-
"""Páginas publicadas (docs/) y documentos del envío de Box & Whisker by TCViz.

Estilo, cabecera y buscador: los de Word Cloud (certificado). El contenido describe lo que hace el código;
si cambia una función, cambiarla aquí y regenerar:   python tools/gen_docs.py
"""
import io, json, os, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WC = r"C:\tcviz\dev\WordCloud\docs"
NAME = "Box & Whisker by TCViz"
BASE = "https://tinocallarisa-web.github.io/box-whisker/"
REPO = "https://github.com/tinocallarisa-web/box-whisker"
VERSION = json.load(io.open(os.path.join(ROOT, "pbiviz.json"), encoding="utf-8"))["visual"]["version"]
FECHA = "19 October 2026"
VIDEO = ""   # URL canónica https://www.youtube.com/watch?v=... cuando Tino grabe el vídeo

plantilla = io.open(os.path.join(WC, "privacy.html"), encoding="utf-8").read()
HEAD = plantilla[:plantilla.index("<body>")]
HEADER = plantilla[plantilla.index("<header>"):plantilla.index("</header>") + len("</header>")]
sup = io.open(os.path.join(WC, "support.html"), encoding="utf-8").read()
SCRIPT = sup[sup.rindex("<script"):sup.rindex("</script>") + len("</script>")]
SCRIPT = SCRIPT.replace("Try a Format pane setting name", "Try a Format pane setting name")


def page(title, sub, body, nav="", search=False):
    head = HEAD.replace("Privacy Policy – Word Cloud by TCViz", f"{title} – {NAME}")
    hdr = HEADER.replace("Word Cloud by TCViz", NAME).replace(">Privacy Policy<", f">{html.escape(sub)}<")
    sb = ""
    if search:
        sb = '''<div class="searchbar">
  <div class="searchbox">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input id="docsearch" type="search" placeholder="Search the documentation — try &quot;whiskers&quot;, &quot;quartile&quot;, &quot;violin&quot;…"
           autocomplete="off" aria-label="Search the documentation">
    <button id="searchclear" type="button" aria-label="Clear search" hidden>&times;</button>
  </div>
  <div id="searchstatus" class="search-status" role="status" aria-live="polite"></div>
</div>
'''
    foot = f'''<footer>
  <div style="margin-bottom:10px;">
    <a href="{BASE}support.html">Documentation</a>
    <a href="{BASE}privacy.html">Privacy Policy</a>
    <a href="{BASE}terms.html">Terms of Use</a>
    <a href="{BASE}changelog.html">Changelog</a>
    <a href="{REPO}/discussions" target="_blank">Discussions</a>
    <a href="{REPO}" target="_blank">GitHub</a>
    <a href="https://tcviz.com" target="_blank">tcviz.com</a>
  </div>
  <p>© 2026 TCViz · {NAME} · <a href="mailto:support@tcviz.com">support@tcviz.com</a></p>
</footer>
'''
    return (head + "<body>\n" + hdr + "\n" + nav + sb + body + foot + (SCRIPT if search else "") + "\n</body>\n</html>\n")


# ── Datos comunes ────────────────────────────────────────────────────────────

FIELDS = [
    ("Category", "Grouping", "Yes", "One box per value: region, product, team. Add a hierarchy to drill down; with Expand all, one box per combination of levels."),
    ("Value", "Measure", "Yes, one field", "The measure whose distribution is drawn, evaluated for each row of Detail. Rows with an empty or non-numeric value are not counted in n."),
    ("Detail (rows)", "Grouping", "Yes in practice, one field", "The ID of each observation — order, employee, ticket, inspection. Without it Power BI sends one total per category and there is no distribution; the visual says so."),
    ("Group", "Grouping", "No — Pro, one field", "Boxes side by side inside each category, coloured by group, with a legend. Without Pro the field is ignored and the free result is drawn."),
    ("Small multiples", "Grouping", "No — Pro, one field", "One panel per value, all on the same value scale."),
    ("Tooltips", "Measure", "No", "Extra measures in the tooltip, shown as the average over the rows of the box."),
]

FREE_PRO = [
    ("Boxes, whiskers and outliers per category", "✓", "✓"),
    ("Whiskers at 1.5 × IQR (Tukey) or minimum to maximum", "✓", "✓"),
    ("Outliers always drawn, also on top of the points", "✓", "✓"),
    ("n under each box, median label; n, min, quartiles, median, max, mean, outlier count and quartile method in the tooltip", "✓", "✓"),
    ("Quartiles: inclusive method (Excel QUARTILE.INC)", "✓", "✓"),
    ("Vertical or horizontal; 6 style templates, including IBCS style", "✓", "✓"),
    ("Box colour with conditional formatting (fx)", "✓", "✓"),
    ("Sort by data order or name", "✓", "✓"),
    ("Axes: title, gridlines, range, font, size, colour, bold", "✓", "✓"),
    ("Cross-filtering, bookmarks, drilldown, context menu, keyboard, high contrast", "✓", "✓"),
    ("Format on the canvas, start screen, 12 languages", "✓", "✓"),
    ("Group: side-by-side boxes with legend", "—", "✓"),
    ("Small multiples, with columns, spacing, titles, panel background and border", "—", "✓"),
    ("All points with jitter (separation, size, colour, border, opacity)", "—", "✓"),
    ("Mean marker and notches (approximate 95 % interval of the median, McGill)", "—", "✓"),
    ("Violin (density) behind each box", "—", "✓"),
    ("Colour by quartile", "—", "✓"),
    ("Exclusive quartiles (Excel QUARTILE.EXC) and Tukey hinges", "—", "✓"),
    ("Whiskers at the 5th–95th or 10th–90th percentile", "—", "✓"),
    ("Sort by median, mean, IQR or count", "—", "✓"),
    ("Two reference lines with labels", "—", "✓"),
    ("Statistics table: n, min, Q1, median, Q3, max, mean, std dev, outliers", "—", "✓"),
]

FORMAT = [
    ("Style template", "Clean, Classic, Minimal, Contrast, Compact, IBCS style. A template only fills what you have not set yourself."),
    ("Boxes", "Orientation; box colour with conditional formatting (fx) — the rule is evaluated per row, so base it on the category (a colour column or a measure that is constant within each category); colour by quartile and high contrast override it; border colour and width; box width %; rounded corners; fill opacity; median line colour; colour by quartile (Pro) with lower and upper half colours."),
    ("Whiskers", "Reach: 1.5 × IQR (Tukey), minimum to maximum, 5th–95th or 10th–90th percentile (Pro); caps; colour."),
    ("Statistics", "Quartile method (inclusive; exclusive and Tukey hinges are Pro); n under each box; median label; mean marker and colour (Pro); notches (Pro)."),
    ("Points", "Show all points (Pro); separation of the points %; size; colour; border colour and width; opacity; outlier size and colour."),
    ("Violin", "Show violin (Pro), drawn for boxes with at least 3 values; opacity; colour (empty = the colour of the box or group)."),
    ("Sort", "Data order, name, or median, mean, IQR and count (Pro), computed on all the rows of each category so groups and panels share the order; descending."),
    ("Reference lines", "Two lines (Pro), each with value and label; line colour."),
    ("Value axis", "Show; title and title text; gridlines; automatic range or minimum and maximum; font; bold; text size and colour."),
    ("Category axis", "Show; font; bold; text size and colour."),
    ("Legend", "Shown with a Group field; position top or bottom; text size and colour."),
    ("Statistics table", "Show (Pro), below the chart, up to 35 % of the height with its own scroll; text size and colour; header background and text colour; alternate row colour."),
    ("Small multiples", "Columns (0 = automatic); space between panels; title size, colour, bold and alignment; panel background and border."),
    ("Background", "Colour of the whole visual."),
]

FAQ = [
    ("How do I read a box?",
     "<p>The box holds the middle 50 % of the values, from the first quartile (Q1) to the third (Q3). The line inside is the median. "
     "The whiskers reach the last value that is still considered normal, and the dots beyond them are outliers. "
     "n under the box is the number of rows behind it.</p>"),
    ("What do the whiskers show, exactly?",
     "<p>With <strong>1.5 × IQR (Tukey)</strong>, the default, each whisker goes to the last value within 1.5 times the height of the box "
     "(Q3 − Q1) from the box. Anything beyond is an outlier. <strong>Minimum to maximum</strong> draws the full range and no outliers. "
     "The percentile options (Pro) end the whiskers at the 5th/95th or 10th/90th percentile, which reads as \"90 % of cases are between…\".</p>"),
    ("Why are my quartiles different from Excel or from another tool?",
     "<p>There are several accepted ways to compute quartiles and they differ with few rows. The default is the inclusive method, the same as "
     "Excel QUARTILE.INC and PERCENTILE.INC. Pro adds Excel QUARTILE.EXC and Tukey hinges. The method in use is shown in every tooltip.</p>"),
    ("Each box shows n = 1, or the boxes are flat",
     "<p>Add the ID of each observation to <strong>Detail (rows)</strong>. Without it Power BI aggregates the value to one number per category "
     "and there is nothing to distribute. The visual shows a note when Detail is empty.</p>"),
    ("Should Value be Sum or Average?",
     "<p>With one row per ID in Detail, both give the same number per row. Use the aggregation that makes sense if an ID can have several rows.</p>"),
    ("How many rows can it use?",
     "<p>Power BI sends the visual up to 30,000 rows at a time. In the Power BI service the visual asks for further blocks automatically, up "
     "to 40 more (about 1.2 million rows). In Power BI Desktop the visual uses the first 30,000 rows and does not request more. In both cases "
     "a warning icon in the visual header says how many rows were used when some were left out. Statistics always use every row received. "
     "With all points shown, up to about 4,000 points per box are drawn; the violin's density is estimated from up to 2,000 values per box.</p>"),
    ("Do bookmarks keep my settings?",
     "<p>Bookmarks keep the boxes you select and the filters of the page. Like every Power BI visual, they do not keep formatting such as "
     "orientation or points. To switch between two looks, use two copies of the visual and show one or the other in each bookmark.</p>"),
    ("What is the \"Pro preview\" watermark?",
     "<p>While you edit a report without a licence, Pro features you turn on are drawn working under a watermark that names them, and Power BI "
     "shows its licence notice. Reading view shows the free result, with a small note naming the Pro features it leaves out. Nothing is lost: "
     "the settings apply as soon as a licence is active. Where Power BI provides no licence information (for example when you are not signed "
     "in to Power BI Desktop), the free result is shown and there is no preview.</p>"),
    ("How do I get Pro?",
     "<p>On the visual's Microsoft AppSource page, choose <strong>Buy now</strong> (not Install free). Licences are per user and managed by "
     "Microsoft; restart Power BI Desktop after the licence is assigned. See <a href=\"https://tcviz.com/licensing.html\">tcviz.com/licensing</a>.</p>"),
    ("How are numbers formatted?",
     "<p>With the measure's number format from the model, dynamic format strings included, in the report's language. Statistics that are not "
     "whole numbers (mean, interpolated quartiles, standard deviation) show up to two decimals when the format has none.</p>"),
    ("Is my data sent anywhere?",
     "<p>No. The visual makes no network requests and stores nothing outside your report. The links on the start screen open only when you click "
     "them, through Power BI.</p>"),
]


def table(headers, rows, num_from=None):
    th = "".join(f"<th>{html.escape(h)}</th>" for h in headers)
    trs = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f"<table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>"


def support():
    nav = '''<nav>
  <a href="#quickstart" class="active">Quick Start</a>
  <a href="#read">How to read it</a>
  <a href="#fields">Field Wells</a>
  <a href="#freepro">Free and Pro</a>
  <a href="#format">Format Pane</a>
  <a href="#interaction">Selection</a>
  <a href="#accessibility">Accessibility</a>
  <a href="#faq">FAQ</a>
  <a href="changelog.html">Changelog</a>
  <a href="#contact">Contact</a>
</nav>
'''
    video = (f'<div class="video-wrap"><iframe src="https://www.youtube.com/embed/{VIDEO.split("v=")[-1]}" title="{NAME} video" '
             f'allowfullscreen></iframe></div>') if VIDEO else ""
    faq = "".join(f'<details><summary>{html.escape(q)}</summary><div class="faq-body">{a}</div></details>' for q, a in FAQ)
    body = f'''<div class="wrap">

<div class="verpill">Visual v{VERSION} &nbsp;·&nbsp; docs updated {FECHA} &nbsp;·&nbsp; <a href="changelog.html">what's new</a></div>

<p class="lead">A box plot that reads well: median, quartiles, whiskers and outliers for each category, with <strong>n</strong> on every box
and the quartile method stated. The free version is a complete box plot. <strong>Pro</strong> adds points with jitter, mean and
notches, violin, groups and small multiples, sorting by median, reference lines and a statistics table.</p>
{video}
<h2 id="quickstart">Quick Start</h2>
<div class="card">
<ol style="padding-left:20px;font-size:14px;color:var(--t2)">
<li>Add <strong>Box &amp; Whisker by TCViz</strong> to the page. With no fields it shows a start screen with these steps.</li>
<li>Drag the field that defines the boxes to <strong>Category</strong> — region, product, team.</li>
<li>Drag the measure to study to <strong>Value</strong> — days, amount, score.</li>
<li>Drag the ID of each row to <strong>Detail (rows)</strong> — order, employee, ticket.</li>
<li>Pro: add a <strong>Group</strong> or <strong>Small multiples</strong> field, turn on points, violin or the statistics table.</li>
</ol>
</div>

<h2 id="read">How to read it</h2>
<div class="card">
<figure style="margin:0 0 14px">
<svg viewBox="0 0 640 210" role="img" aria-label="Annotated box plot: minimum, Q1, median, Q3, maximum, outlier and interquartile range" style="width:100%;max-width:640px;display:block;margin:0 auto">
  <g font-family="Segoe UI, sans-serif" font-size="13" fill="#535146" text-anchor="middle">
    <line x1="70" y1="95" x2="190" y2="95" stroke="#605E5C" stroke-width="2"/>
    <line x1="70" y1="78" x2="70" y2="112" stroke="#605E5C" stroke-width="2"/>
    <line x1="400" y1="95" x2="510" y2="95" stroke="#605E5C" stroke-width="2"/>
    <line x1="510" y1="78" x2="510" y2="112" stroke="#605E5C" stroke-width="2"/>
    <rect x="190" y="68" width="210" height="54" rx="3" fill="#2B6CB0" fill-opacity="0.18" stroke="#2B6CB0" stroke-width="2"/>
    <line x1="270" y1="68" x2="270" y2="122" stroke="#1F4E80" stroke-width="3"/>
    <circle cx="585" cy="95" r="6" fill="#FFFFFF" stroke="#B4541C" stroke-width="2.5"/>
    <g stroke="#B5B3AA" stroke-dasharray="3 4"><line x1="70" y1="40" x2="70" y2="70"/><line x1="190" y1="22" x2="190" y2="64"/>
      <line x1="270" y1="40" x2="270" y2="64"/><line x1="400" y1="22" x2="400" y2="64"/><line x1="510" y1="40" x2="510" y2="70"/><line x1="585" y1="22" x2="585" y2="84"/></g>
    <text x="70" y="34">Minimum</text><text x="190" y="16">Q1 (25%)</text><text x="270" y="34" font-weight="700" fill="#3D3929">Median</text>
    <text x="400" y="16">Q3 (75%)</text><text x="510" y="34">Maximum</text><text x="585" y="16">Outlier</text>
    <path d="M190 140 v8 h210 v-8" fill="none" stroke="#83827D" stroke-width="1.5"/>
    <text x="295" y="170">Interquartile range (IQR) = Q3 − Q1</text>
    <text x="295" y="190" fill="#83827D">the middle 50% of the values</text>
  </g>
</svg>
<figcaption style="font-size:12px;color:var(--t3);text-align:center">"Minimum" and "Maximum" are the ends of the whiskers: the most extreme values that are not outliers.</figcaption>
</figure>

<p><strong>Box:</strong> the middle half of the values, from Q1 (25th percentile) to Q3 (75th). <strong>Line inside:</strong> the median.
<strong>Whiskers:</strong> up to the last value still considered normal (by default within 1.5 × the box height). <strong>Dots beyond the
whiskers:</strong> outliers. <strong>n:</strong> the number of rows behind the box.</p>
<p>If the median is not centred in the box, the values are skewed towards the longer side. A tall box means a spread-out, less
predictable result; a short box, a consistent one. Compare medians to see which category is higher, and box heights to see which is more
stable. With very few values (under about 10 per box), turn on all points (Pro) to see each one.</p>
</div>

<h2 id="fields">Field Wells</h2>
{table(["Field", "Kind", "Required", "What it does"], [(f"<strong>{a}</strong>", b, c, d) for a, b, c, d in FIELDS])}

<h2 id="freepro">Free and Pro</h2>
{table(["Capability", "Free", "Pro"], FREE_PRO)}
<p>Turn on a Pro capability without a licence while editing and it is drawn working under a "Pro preview" watermark that names it.
Reading view shows the free result. Pro is sold per user on Microsoft AppSource.</p>

<h2 id="format">Format Pane</h2>
{table(["Card", "Settings"], [(f"<strong>{a}</strong>", b) for a, b in FORMAT])}
<p>Format on the canvas: in format mode, click the boxes, an axis, the legend or the background to format them where they are.</p>

<h2 id="interaction">Selection and interaction</h2>
<div class="card">
<ul>
<li>Click a box to filter the rest of the page by its category (and group or panel); Ctrl/Cmd + click to add more; click it again or click the background to clear.</li>
<li>A selected box keeps every row of the category: a card next to it shows the full count.</li>
<li>Bookmarks restore the selected boxes. Right-click opens the Power BI context menu. A hierarchy in Category gives drilldown.</li>
<li>When the report author turns interactions off, clicks do not filter.</li>
</ul>
</div>

<h2 id="accessibility">Accessibility</h2>
<div class="card">
<ul>
<li>Keyboard: Tab into the visual, arrows move between boxes, Home/End jump to the first/last box, Enter or Space selects, Esc clears, the context-menu key opens the menu. The tooltip opens on the focused box.</li>
<li>Each box has a description for screen readers with its median, quartiles and n.</li>
<li>High contrast: the visual uses the colours of the Windows contrast theme.</li>
<li>The layout adapts to the size of the visual: axes, n labels and legend give way before the boxes do; the legend shows the groups that fit, and the start screen has three layouts.</li>
</ul>
</div>

<h2 id="faq">FAQ</h2>
{faq}

<h2 id="contact">Contact</h2>
<div class="contact-box"><div class="icon">✉</div><div>
<h3>Questions, bugs, ideas</h3>
<p>Write to <a href="mailto:support@tcviz.com">support@tcviz.com</a> or open a thread in <a href="{REPO}/discussions" target="_blank">GitHub Discussions</a>.</p>
</div></div>

</div>
'''
    return page("Documentation", "Documentation", body, nav=nav, search=True)


def privacy():
    body = f'''<div class="wrap prose">
<h1>Privacy Policy</h1>
<p><strong>Last updated:</strong> {FECHA} (version {VERSION})</p>
<h2>1. Overview</h2>
<p>{NAME} is a Power BI custom visual developed by TCViz (Tino Callarisa). This policy describes how data is handled when you use it.</p>
<h2>2. Data collection</h2>
<p>The visual <strong>does not collect, transmit or store any data</strong>. Every calculation — quartiles, whiskers, outliers, density,
the statistics table — happens inside Power BI, on the data of your report.</p>
<h2>3. No network access</h2>
<p>The visual declares <strong>no network privileges</strong> (<code>"privileges": []</code>), so Power BI does not let it make any web request.
The icon on the start screen is bundled inside the visual.</p>
<p>The <em>Guide</em> and <em>Product page</em> links on the start screen ask Power BI to open those pages in your browser, only when you click
them; Power BI opens them in your browser (Power BI Desktop asks first). The visual sends nothing.</p>
<h2>4. Cookies and storage</h2>
<p>No cookies and no browser storage. Formatting settings are saved in your report by Power BI, like those of any visual.</p>
<h2>5. Licensing</h2>
<p>To know whether you have a Pro licence, the visual asks Microsoft's licensing API in Power BI (<code>IVisualLicenseManager</code>). TCViz receives
no data from this check. See the <a href="https://privacy.microsoft.com/privacystatement">Microsoft Privacy Statement</a>.</p>
<h2>6. Third parties</h2>
<p>No analytics, tracking or advertising.</p>
<h2>7. Contact</h2>
<p><a href="mailto:support@tcviz.com">support@tcviz.com</a></p>
</div>
'''
    return page("Privacy Policy", "Privacy Policy", body)


def terms():
    free = ", ".join(r[0].lower() if i else r[0] for i, r in enumerate([x for x in FREE_PRO if x[1] == "✓"]))
    pro = "; ".join(r[0][0].lower() + r[0][1:] for r in FREE_PRO if r[1] == "—")
    body = f'''<div class="wrap prose">
<h1>Terms of Use</h1>
<p><strong>Effective date:</strong> {FECHA} &nbsp;·&nbsp; applies to version {VERSION} and later</p>
<h2>1. Acceptance</h2>
<p>By installing or using {NAME} ("the Visual"), you agree to these Terms of Use. If you do not agree, do not install or use the Visual.</p>
<h2>2. License grant</h2>
<p>TCViz grants you a non-exclusive, non-transferable, revocable license to use the Visual within Microsoft Power BI, subject to these Terms
and any applicable Microsoft AppSource subscription terms.</p>
<p><strong>Free tier:</strong> available to all users at no cost. Includes: {html.escape(free)}.</p>
<p><strong>Pro tier:</strong> available through a Microsoft AppSource subscription, licensed per user. Adds: {html.escape(pro)}.
Without an active licence, Pro features are shown in edit mode only, as a preview marked with a watermark; reading view shows the free result.</p>
<h2>3. Restrictions</h2>
<ul>
<li>Do not reverse-engineer, decompile or disassemble the Visual, except where applicable law permits it.</li>
<li>Do not redistribute, resell, sublicense or transfer the Visual.</li>
<li>Do not remove or alter proprietary notices, branding or watermarks.</li>
<li>Do not use the Visual in breach of applicable laws.</li>
</ul>
<h2>4. Intellectual property</h2>
<p>The Visual, including its source code, design and documentation, is the intellectual property of TCViz. The source code is published on
GitHub for transparency and review; publication does not grant a licence to copy it or to build competing products.</p>
<h2>5. Disclaimer of warranties</h2>
<p>The Visual is provided "as is", without warranty of any kind, express or implied, including merchantability, fitness for a particular
purpose and non-infringement. TCViz does not warrant that the Visual will be error-free or uninterrupted.</p>
<h2>6. Limitation of liability</h2>
<p>To the maximum extent permitted by law, TCViz shall not be liable for any indirect, incidental, special, consequential or punitive damages
arising from the use of, or inability to use, the Visual.</p>
<h2>7. Updates</h2>
<p>TCViz may update the Visual and these Terms. Updated Terms are posted at this address with a new date; continued use means acceptance.</p>
<h2>8. Governing law</h2>
<p>These Terms are governed by the laws of Spain. Any dispute shall be resolved in the courts of Barcelona, Spain.</p>
<h2>9. Contact</h2>
<p><a href="mailto:support@tcviz.com">support@tcviz.com</a></p>
</div>
'''
    return page("Terms of Use", "Terms of Use", body)


def changelog():
    md = io.open(os.path.join(ROOT, "CHANGELOG.md"), encoding="utf-8").read()
    partes = re.split(r"^## ", md, flags=re.M)[1:]
    bloques = []
    for p in partes:
        cab, _, cuerpo = p.partition("\n")
        items = "".join(f"<li>{html.escape(l[2:].strip())}</li>" for l in cuerpo.splitlines() if l.startswith("- "))
        bloques.append(f'<div class="card"><h3>{html.escape(cab.strip())}</h3><ul>{items}</ul></div>')
    body = f'<div class="wrap prose"><h1>Changelog</h1><p>{NAME} · current version {VERSION}</p>{"".join(bloques)}</div>\n'
    return page("Changelog", "Changelog", body)


def main():
    os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
    for nombre, f in (("support.html", support), ("privacy.html", privacy), ("terms.html", terms), ("changelog.html", changelog)):
        io.open(os.path.join(ROOT, "docs", nombre), "w", encoding="utf-8", newline="\n").write(f())
    io.open(os.path.join(ROOT, "docs", "index.html"), "w", encoding="utf-8", newline="\n").write(
        f'<!DOCTYPE html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=support.html"><title>{NAME}</title><a href="support.html">Documentation</a>\n')
    print("docs:", sorted(os.listdir(os.path.join(ROOT, "docs"))))


if __name__ == "__main__":
    main()
