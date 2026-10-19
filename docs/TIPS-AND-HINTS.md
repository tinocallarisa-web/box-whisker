# Box & Whisker by TCViz — Tips & Hints (1.0.0.0)

A box plot for Power BI: how the values of each category are spread — the median, the middle half, the
normal range and the cases outside it. This page is the short version of everything worth knowing.
Full documentation, with search: <https://tinocallarisa-web.github.io/box-whisker/support.html>

## Quick start

1. Category: the field that defines the boxes — region, product, team.
2. Value: the measure to study — days, amount, score.
3. Detail (rows): the ID of each row — order, employee, ticket.

The most common surprise: every box is a flat line. Without Detail (rows), Power BI sends one total per
category, and a box of one value has no spread. One ID in Detail (rows) fixes it; a note says so while
you edit.

## Field wells

| Well | Limit | What it does |
|---|---|---|
| Category | several fields | One box per value; with a hierarchy, drill down from the header. |
| Value | 1 | The measure whose spread is shown; its number format is used. |
| Detail (rows) | 1 | The ID of each row: each row becomes one value in its box. |
| Group (Pro) | 1 | Boxes side by side inside each category, with a legend. |
| Small multiples (Pro) | 1 | One panel per value, all on the same scale. |
| Tooltips | several | Extra measures in the tooltip, averaged over the rows of the box. |

## How to read it

- The line in the box is the median; the box runs from Q1 to Q3 (the middle 50% of the values).
- Whiskers reach the last value within 1.5 × IQR of the box (Tukey) — or minimum to maximum.
- Dots beyond the whiskers are outliers; they are always drawn.
- n under each box: a box built on 12 rows is not as solid as one built on 12,000.
- Quartiles use the inclusive method, the same as Excel QUARTILE.INC; the tooltip names the method.

## Format pane

- Style template — Clean, Classic, Minimal, Contrast, Compact and IBCS style; your own settings win.
- Boxes — vertical or horizontal, colour (with fx conditional formatting), border, width, radius.
- Whiskers, Statistics — whisker rule, n under each box, median labels.
- Points — size and colour of the outliers (the full set of points is Pro).
- Value axis — automatic or fixed range, gridlines, title, font and bold; integer data gets integer ticks.
- Category axis, Legend, Background.

## Pro

- Group and Small multiples (columns, gap, title size, colour, bold and alignment, panel background and
  border).
- All points with jitter, mean marker and notches (approximate 95% interval of the median).
- Violin behind each box, with its own colour; colour by quartile.
- Sort boxes by median, mean, spread (IQR) or count; Free sorts by data order or name.
- Exclusive quartiles (Excel QUARTILE.EXC) and Tukey hinges; whiskers at the 5th–95th or 10th–90th
  percentile.
- Two reference lines with labels — a target, a limit.
- Statistics table: n, min, Q1, median, Q3, max, mean, standard deviation and outliers per box, with
  header colours and banding.

## Filtering

- Click a box to filter the page by its category (and group); click again to clear; Ctrl+click to add.
- Bookmarks restore the selected boxes.
- Right-click opens the Power BI context menu; keyboard: Tab to the chart, arrows between boxes, Enter to
  select.

## Rows

- The visual draws every row it receives. Power BI Desktop sends the first 30,000; the Power BI service
  sends more, in pages, up to about 1.2 million. A warning icon in the header says when rows were left out.
- Filter the page or the visual to the population you want to compare before reading the tails.

## Free and Pro

Free is a complete, correct box plot: every box, whisker, outlier and n, Tukey or min–max whiskers,
templates, fx colours, both orientations, filtering, bookmarks, drilldown, high contrast and 12 languages.
Pro adds ways to compare it. While editing without a licence, Pro features are drawn working on your own
data under a Pro preview watermark; reading view shows the free result.

## Privacy

No network requests and no privileges: every statistic is computed inside your report.

Questions: <https://github.com/tinocallarisa-web/box-whisker/discussions> · support@tcviz.com
