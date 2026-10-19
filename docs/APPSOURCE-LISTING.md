# AppSource Listing — Box & Whisker by TCViz 1.0.0.0

Copy ready to paste into Partner Center, English only. **Editing this file does not change the offer**: every field
is pasted by hand in Partner Center.

Limits measured in Partner Center: *Search results summary* 100 characters, *Description* 5,000 characters (cut
silently), *Certification notes* 2,500 counted with CRLF and **cleared on every resubmission**.

Rules for this listing: no comparison with other marketplace visuals by name; compare only with what Power BI has
natively (no box plot). No superlatives that cannot be proven. "Power BI" with capitals.

---

## Offer name

```
Box & Whisker by TCViz
```

## Search results summary (max 100)

```
Box plot for Power BI: median, quartiles, outliers and n per box. Points, violin, groups in Pro.
```

*(96 characters)*

## Keywords (3)

```
box plot
box and whisker
outlier analysis
```

- `box plot` — the term people type in "Get more visuals"; Power BI has no native box plot.
- `box and whisker` — the other name of the chart, and the one in the offer name.
- `outlier analysis` — the problem: someone looking for unusual values in a distribution.

## Description

```
An average hides the story. Two teams can both close tickets in 20 days on average while one is predictable and the other swings between 2 and 90. A bar chart of averages shows them as equal; the people waiting on the second team know they are not.

Box & Whisker by TCViz shows how the values of each category are spread: the median, the middle half of the values, how far the normal range reaches and which cases fall outside it. Power BI has no built-in box plot; this one reads at a glance and says exactly how it counts.

READ IT AT A GLANCE

• One box per category: median, first and third quartile, whiskers and outliers
• n under every box, so a box built on 12 rows is not mistaken for one built on 12,000
• Whiskers at 1.5 × IQR (Tukey) or minimum to maximum
• Quartiles with the inclusive method, the same as Excel QUARTILE.INC; the method is named in every tooltip
• Vertical or horizontal; six style templates, including an IBCS style

PRO

• Group: boxes side by side inside each category, with a legend
• Small multiples on a shared scale, with columns, titles and panel styles
• All points with jitter, mean marker, notches (approximate 95% interval of the median) and a violin behind each box
• Colour by quartile; sort by median, mean, IQR or count
• Exclusive quartiles (Excel QUARTILE.EXC) and Tukey hinges; whiskers at the 5th–95th or 10th–90th percentile
• Two reference lines and a statistics table: n, min, Q1, median, Q3, max, mean, standard deviation and outliers

FREE AND PRO

The free version is a complete box plot with the method stated: every box, whisker and outlier is drawn on every row the visual receives — up to about 1.2 million rows in the Power BI service and the first 30,000 in Power BI Desktop, with a warning icon when rows were left out. Pro adds ways to read and compare it. Turn on a Pro capability while editing without a licence and it is drawn working, on your own data, under a "Pro preview" watermark that names it; reading view shows the free result.

WORKS LIKE A NATIVE VISUAL

• Click a box to filter the page by its category; Ctrl+click for several; bookmarks restore the selection
• Drilldown on a hierarchy, Power BI context menu, standard and report tooltips
• Keyboard navigation, screen-reader descriptions and high contrast
• The measure's number format, dynamic format strings included, and the report language; Format pane and texts in 12 languages
• Format on the canvas, and a start screen that shows the first steps

PRIVACY

The visual makes no network requests and declares no privileges, so Power BI does not let it send anything anywhere. All statistics are computed inside your report.

GETTING STARTED

1. Category: the field that defines the boxes — region, product, team.
2. Value: the measure to study — days, amount, score.
3. Detail (rows): the ID of each row — order, employee, ticket.

Documentation, how to read a box plot and FAQ: https://tinocallarisa-web.github.io/box-whisker/support.html
Questions: https://github.com/tinocallarisa-web/box-whisker/discussions
Support: support@tcviz.com
```

## Plan

| Field | Value |
|---|---|
| Plan ID | **`box-whisker-pro`** (exactly this: the code accepts it and any other paid plan of this offer) |
| Plan name | Box & Whisker Pro |
| Price | 0.99 USD per user per month, 9.99 USD per user per year (round local prices with `utillaje/redondear_precios.py`) |
| Trial | Pending: decide once Microsoft answers the licence case (memory `prueba-embudo-compra`) |
| Plan description | Pro adds groups and small multiples, all points with jitter, mean and notches, violin, colour by quartile, sorting by median, mean, IQR or count, other quartile methods and percentile whiskers, two reference lines and a statistics table. Includes everything in the free version. |

## Offer setup

| Field | Value |
|---|---|
| Offer ID | `box-whisker-tcviz` (the code expects `tino_callarisa.box-whisker-tcviz.<plan>`) |
| Categories | Analytics; Data Visualization (or the closest available) |
| Video | https://www.youtube.com/watch?v=OuzwKX96w4M |
| Support / documentation | https://tinocallarisa-web.github.io/box-whisker/support.html |
| Privacy | https://tinocallarisa-web.github.io/box-whisker/privacy.html |
| Terms | https://tinocallarisa-web.github.io/box-whisker/terms.html |
| Logo | `assets/logo_300x300.png` |
| Screenshots | `assets/` (1366x768) |
