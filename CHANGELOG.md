# Changelog

All notable changes to Box & Whisker by TCViz. Power BI four-part version numbers.

## 1.0.1.0 — 2026-11-18

- Dynamic format strings per row: each box shows its own format (for example a currency per region) in the tooltip, median label, statistics table and screen-reader description; the value axis uses it when all boxes share it.
- New Accessibility card in the Format pane: high contrast (Automatic or On), colour and width of the keyboard focus, and a minimum text size for the chart and the statistics table.
- Fix: a fixed box colour chosen next to the fx button is now kept as one colour for the whole visual and shown in the Format pane; every card has Reset to default.
- The Pro preview watermark is now the same as in the other TCViz visuals.
- Style templates are now the seven styles of the TCViz collection, the same as in Treemap and Line Chart: Report theme (default, follows the report theme) plus Boardroom, Ledger, Editorial, Signal, Aurora and Terrace — all free. Reports saved with a 1.0.0 template open with the closest new style: Classic → Editorial, Contrast → Boardroom, IBCS style → Signal, Clean, Minimal and Compact → Report theme, keeping their box widths, corners and gridlines.

## 1.0.0.0 — 2026-10-19

- First release: boxes, whiskers and outliers per category, with n under each box and the quartile method in every tooltip.
- Whiskers at 1.5 × IQR (Tukey) or minimum to maximum; 5th–95th and 10th–90th percentile in Pro.
- Quartiles with the inclusive method (Excel QUARTILE.INC); exclusive method and Tukey hinges in Pro.
- Pro: Group (side-by-side boxes with legend), small multiples, all points with jitter, mean marker, notches, violin, colour by quartile, sort by median, mean, IQR or count, two reference lines and a statistics table.
- Six style templates, including IBCS style; box colour with conditional formatting; fonts, bold and colours for axes, legend and table.
- Cross-filtering by category, bookmarks, drilldown, context menu, keyboard navigation, screen-reader descriptions and high contrast.
- Format on the canvas, a start screen with the first steps, and the Format pane and texts in 12 languages.
- No network requests; Pro licence through Microsoft AppSource.
