# -*- coding: utf-8 -*-
"""Genera capabilities.json y stringResources/en-US a partir de una sola definición.

Las demás lenguas salen de tools/i18n.py (mismas claves). Ejecutar desde la raíz del repo:
    python tools/gen_capabilities.py
"""
import io, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ROLES = [
    ("category", "Category", "Grouping", "One box per value. A hierarchy gives drilldown."),
    ("value", "Value", "Measure", "The measure whose distribution is drawn, evaluated per Detail row."),
    ("detail", "Detail (rows)", "Grouping", "The ID of each observation: order, employee, ticket. Without it there is no distribution."),
    ("group", "Group (Pro)", "Grouping", "Side-by-side boxes within each category, with a legend."),
    ("panel", "Small multiples (Pro)", "Grouping", "One panel per value, on a shared scale."),
    ("tooltips", "Tooltips", "Measure", "Extra values in the tooltip."),
]

def E(*items):
    return [{"value": v, "displayName": n, "displayNameKey": k} for v, k, n in items]

# (objeto, nombre, [(prop, nombre, tipo)])  tipo: bool | num | text | color | colorfx | enum:[...]
OBJECTS = [
    ("style", "Style template", [
        ("template", "Template", E(("clean", "Enum_tpl_clean", "Clean"), ("classic", "Enum_tpl_classic", "Classic"),
                                    ("minimal", "Enum_tpl_minimal", "Minimal"), ("contrast", "Enum_tpl_contrast", "Contrast"),
                                    ("compact", "Enum_tpl_compact", "Compact"))),
    ]),
    ("boxes", "Boxes", [
        ("orientation", "Orientation", E(("vertical", "Enum_or_vertical", "Vertical"), ("horizontal", "Enum_or_horizontal", "Horizontal"))),
        ("fill", "Box color", "colorfx"),
        ("border", "Border color", "color"),
        ("borderWidth", "Border width", "num"),
        ("width", "Box width %", "num"),
        ("radius", "Rounded corners", "num"),
        ("opacity", "Fill opacity %", "num"),
        ("quartileColors", "Color by quartile (Pro)", "bool"),
        ("lowerColor", "Lower half color", "color"),
        ("upperColor", "Upper half color", "color"),
        ("medianColor", "Median line color", "color"),
    ]),
    ("whiskers", "Whiskers", [
        ("rule", "Whiskers reach", E(("tukey", "Enum_wh_tukey", "1.5 × IQR (Tukey)"), ("minmax", "Enum_wh_minmax", "Minimum to maximum"),
                                     ("p5", "Enum_wh_p5", "5th to 95th percentile (Pro)"), ("p10", "Enum_wh_p10", "10th to 90th percentile (Pro)"))),
        ("caps", "Caps", "bool"),
        ("color", "Whisker color", "color"),
    ]),
    ("statistics", "Statistics", [
        ("method", "Quartile method", E(("linear", "Enum_m_linear", "Inclusive (Excel QUARTILE.INC)"),
                                        ("exclusive", "Enum_m_exclusive", "Exclusive (Excel QUARTILE.EXC) (Pro)"),
                                        ("hinges", "Enum_m_hinges", "Tukey hinges (Pro)"))),
        ("showN", "Show n under each box", "bool"),
        ("medianLabel", "Median label", "bool"),
        ("showMean", "Mean marker (Pro)", "bool"),
        ("meanColor", "Mean color", "color"),
        ("notches", "Notches (Pro)", "bool"),
    ]),
    ("points", "Points", [
        ("show", "Show all points (Pro)", "bool"),
        ("jitter", "Jitter %", "num"),
        ("size", "Point size", "num"),
        ("color", "Point color", "color"),
        ("borderColor", "Point border color", "color"),
        ("borderWidth", "Point border width", "num"),
        ("opacity", "Point opacity %", "num"),
        ("outlierSize", "Outlier size", "num"),
        ("outlierColor", "Outlier color", "color"),
    ]),
    ("violin", "Violin", [
        ("show", "Show violin (Pro)", "bool"),
        ("opacity", "Violin opacity %", "num"),
        ("color", "Violin color", "color"),
    ]),
    ("sort", "Sort", [
        ("by", "Sort boxes by", E(("data", "Enum_s_data", "Data order"), ("name", "Enum_s_name", "Name"),
                                  ("median", "Enum_s_median", "Median (Pro)"), ("mean", "Enum_s_mean", "Mean (Pro)"),
                                  ("iqr", "Enum_s_iqr", "Spread (IQR) (Pro)"), ("count", "Enum_s_count", "Count (Pro)"))),
        ("descending", "Descending", "bool"),
    ]),
    ("reference", "Reference lines", [
        ("show", "Reference line (Pro)", "bool"),
        ("value", "Value", "num"),
        ("label", "Label", "text"),
        ("color", "Line color", "color"),
        ("show2", "Second line (Pro)", "bool"),
        ("value2", "Second value", "num"),
        ("label2", "Second label", "text"),
    ]),
    ("valueAxis", "Value axis", [
        ("show", "Show", "bool"),
        ("title", "Title", "bool"),
        ("titleText", "Title text", "text"),
        ("gridlines", "Gridlines", "bool"),
        ("auto", "Automatic range", "bool"),
        ("min", "Minimum", "num"),
        ("max", "Maximum", "num"),
        ("fontSize", "Text size", "num"),
        ("color", "Text color", "color"),
        ("fontFamily", "Font", "text"),
        ("bold", "Bold", "bool"),
    ]),
    ("categoryAxis", "Category axis", [
        ("show", "Show", "bool"),
        ("fontSize", "Text size", "num"),
        ("color", "Text color", "color"),
        ("fontFamily", "Font", "text"),
        ("bold", "Bold", "bool"),
    ]),
    ("legend", "Legend", [
        ("show", "Show", "bool"),
        ("position", "Position", E(("top", "Enum_lg_top", "Top"), ("bottom", "Enum_lg_bottom", "Bottom"))),
        ("fontSize", "Text size", "num"),
        ("color", "Text color", "color"),
    ]),
    ("statsTable", "Statistics table", [
        ("show", "Show table (Pro)", "bool"),
        ("fontSize", "Text size", "num"),
        ("color", "Text color", "color"),
    ]),
    ("background", "Background", [
        ("color", "Color", "color"),
    ]),
]

def ptype(t):
    if t == "bool": return {"bool": True}
    if t == "num": return {"numeric": True}
    if t == "text": return {"text": True}
    if t in ("color", "colorfx"): return {"fill": {"solid": {"color": True}}}
    return {"enumeration": t}

def main():
    en = {}
    roles = []
    for name, disp, kind, desc in ROLES:
        k = f"Role_{name}"
        en[k] = disp; en[k + "_Desc"] = desc
        roles.append({"name": name, "kind": kind, "displayName": disp, "displayNameKey": k,
                      "description": desc, "descriptionKey": k + "_Desc"})
    objects = {}
    for obj, disp, props in OBJECTS:
        en[f"Obj_{obj}"] = disp
        p = {}
        for prop, pd, t in props:
            key = f"Prop_{obj}_{prop}"
            en[key] = pd
            p[prop] = {"displayName": pd, "displayNameKey": key, "type": ptype(t)}
            if isinstance(t, list):
                for it in t: en[it["displayNameKey"]] = it["displayName"]
        objects[obj] = {"displayName": disp, "displayNameKey": f"Obj_{obj}", "properties": p}
    caps = {
        "dataRoles": roles,
        "dataViewMappings": [{
            "conditions": [{"value": {"max": 1}, "detail": {"max": 1},
                            "group": {"max": 1}, "panel": {"max": 1}}],
            "categorical": {
                "categories": {
                    "select": [{"bind": {"to": "category"}}, {"bind": {"to": "group"}},
                               {"bind": {"to": "panel"}}, {"bind": {"to": "detail"}}],
                    "dataReductionAlgorithm": {"window": {"count": 30000}},
                },
                "values": {"select": [{"bind": {"to": "value"}}, {"bind": {"to": "tooltips"}}]},
            },
        }],
        "objects": objects,
        "tooltips": {"supportedTypes": {"default": True, "canvas": True}, "roles": ["tooltips"]},
        "drilldown": {"roles": ["category"]},
        "supportsHighlight": False,
        "supportsLandingPage": True,
        "supportsEmptyDataView": True,
        "supportsKeyboardFocus": True,
        "supportsMultiVisualSelection": True,
        "privileges": [],
        "supportsOnObjectFormatting": True,
        "enablePointerEventsFormatMode": True,
    }
    io.open(os.path.join(ROOT, "capabilities.json"), "w", encoding="utf-8", newline="\n").write(
        json.dumps(caps, indent=2, ensure_ascii=False) + "\n")
    os.makedirs(os.path.join(ROOT, "stringResources", "en-US"), exist_ok=True)
    io.open(os.path.join(ROOT, "tools", "caps_en.json"), "w", encoding="utf-8", newline="\n").write(
        json.dumps(en, indent=2, ensure_ascii=False) + "\n")
    print("capabilities.json:", len(roles), "roles,", len(objects), "objects,", len(en), "keys")

if __name__ == "__main__":
    main()
