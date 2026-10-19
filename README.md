# Box & Whisker by TCViz

A Power BI custom visual: a box plot that reads well — median, quartiles, whiskers and outliers for each category, with n on every
box and the quartile method stated. Free version complete and correct; Pro adds points, violin, groups, small multiples, sorting by
median, reference lines and a statistics table.

- Documentation: https://tinocallarisa-web.github.io/box-whisker/support.html
- Privacy: https://tinocallarisa-web.github.io/box-whisker/privacy.html · Terms: https://tinocallarisa-web.github.io/box-whisker/terms.html
- Questions: https://github.com/tinocallarisa-web/box-whisker/discussions · support@tcviz.com

## Build

```
npm ci
node build-test.js          # test package, Pro forced (_test)
node build-test.js --free   # test package, real licence (_testfree)
```

Texts and the Format pane are generated: `python tools/gen_capabilities.py`, `python tools/extract_ui.py`, `python tools/i18n.py`.
Documentation: `python tools/gen_docs.py`.

© 2026 TCViz. Source published for transparency and review; see the Terms of Use.
