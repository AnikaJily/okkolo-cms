#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Генератор ER/UML-диаграммы модели данных Окколо CMS в формате draw.io.
Источник истины — src/api/*/content-types/*/schema.json (данные захардкожены ниже
по состоянию на момент генерации; при изменении схем перегенерировать)."""

from html import escape
import os, sys

# Компактный режим (для презентации): только сущности со связями + ключи и пара показательных
# полей. Включается флагом `--compact` или ER_COMPACT=1; пишет отдельный файл, полный не трогает.
COMPACT = ('--compact' in sys.argv) or (os.environ.get('ER_COMPACT') == '1')

# (uid, display, kind, [ (name, type_str, required, kind_of_row) ])
# kind_of_row: 'scalar' | 'media' | 'relation'
ENTITIES = [
    ("event", "Мероприятие", "collection", [
        ("title", "string", True, "scalar"),
        ("slug", "uid", False, "scalar"),
        ("date", "datetime", False, "scalar"),
        ("photo", "media [1]", False, "media"),
        ("gallery", "media [*]", False, "media"),
        ("description", "text", False, "scalar"),
        ("isPaid", "boolean", False, "scalar"),
        ("price", "integer", False, "scalar"),
        ("paymentUrl", "string", False, "scalar"),
        ("type", "→ Тип мероприятия [1]", False, "relation"),
        ("spotsTotal", "integer", False, "scalar"),
        ("spotsTaken", "integer", False, "scalar"),
        ("registrations", "→ Регистрация [*]", False, "relation"),
    ]),
    ("event-registration", "Регистрация на мероприятие", "collection", [
        ("eventTitle", "string", False, "scalar"),
        ("name", "string", True, "scalar"),
        ("phone", "string", True, "scalar"),
        ("email", "email", False, "scalar"),
        ("comment", "text", False, "scalar"),
        ("eventId", "string (устар.)", False, "scalar"),
        ("event", "→ Мероприятие [1]", False, "relation"),
        ("paymentStatus", "enum", False, "scalar"),
    ]),
    ("event-type", "Тип мероприятия", "collection", [
        ("name", "string", True, "scalar"),
        ("slug", "uid", True, "scalar"),
        ("order", "integer", False, "scalar"),
        ("events", "→ Мероприятие [*]", False, "relation"),
    ]),
    ("workshop-program", "Программа мастерской", "collection", [
        ("title", "string", True, "scalar"),
        ("description", "text", True, "scalar"),
        ("image", "media [1]", False, "media"),
        ("order", "integer", False, "scalar"),
    ]),
    ("workshop-application", "Заявка на мастерскую", "collection", [
        ("name", "string", True, "scalar"),
        ("contactMethod", "enum", True, "scalar"),
        ("phone", "string", False, "scalar"),
        ("email", "email", False, "scalar"),
        ("status", "enum", False, "scalar"),
    ]),
    ("order", "Заказ", "collection", [
        ("customerName", "string", True, "scalar"),
        ("phone", "string", True, "scalar"),
        ("email", "email", False, "scalar"),
        ("itemsSubtotal", "integer", False, "scalar"),
        ("deliveryPrice", "integer", False, "scalar"),
        ("totalPrice", "integer", False, "scalar"),
        ("items", "json (снапшот)", False, "scalar"),
        ("orderStatus", "enum", False, "scalar"),
        ("fulfillmentType", "enum", False, "scalar"),
        ("city", "string", False, "scalar"),
        ("address", "string", False, "scalar"),
        ("deliveryComment", "text", False, "scalar"),
    ]),
    ("product", "Товар", "collection", [
        ("title", "string", True, "scalar"),
        ("price", "integer", False, "scalar"),
        ("category", "→ Категория [1]", False, "relation"),
        ("image", "media [1]", True, "media"),
        ("cartUrl", "string", False, "scalar"),
        ("description", "text", False, "scalar"),
        ("gallery", "media [*]", False, "media"),
        ("isAvailable", "boolean", False, "scalar"),
    ]),
    ("category", "Категория шоурума", "collection", [
        ("name", "string", True, "scalar"),
        ("slug", "uid", True, "scalar"),
        ("order", "integer", False, "scalar"),
        ("products", "→ Товар [*]", False, "relation"),
    ]),
    ("direction", "Направление", "collection", [
        ("title", "string", True, "scalar"),
        ("description", "text", False, "scalar"),
        ("href", "string", False, "scalar"),
        ("image", "media [1]", False, "media"),
    ]),
    ("menu-item", "Позиция меню кофейни", "collection", [
        ("name", "string", True, "scalar"),
        ("volume", "string", False, "scalar"),
        ("price", "string", True, "scalar"),
        ("note", "text", False, "scalar"),
        ("category", "enum", True, "scalar"),
        ("season", "enum", True, "scalar"),
        ("order", "integer", False, "scalar"),
    ]),
    ("cafe-menu-page", "Меню кофейни — постеры", "single", [
        ("mainPosterImage", "media [1]", False, "media"),
        ("mainPosterAlt", "string", False, "scalar"),
        ("summerPosterImage", "media [1]", False, "media"),
        ("summerPosterAlt", "string", False, "scalar"),
        ("footnote", "string", False, "scalar"),
    ]),
    ("about-page", "Страница «О нас»", "single", [
        ("eyebrow", "string", False, "scalar"),
        ("title", "string", False, "scalar"),
        ("lead", "text", False, "scalar"),
        ("tagline", "string", False, "scalar"),
        ("heroPhoto", "media [1]", False, "media"),
        ("heroPhotoAlt", "string", False, "scalar"),
    ]),
    ("about-team-photo", "О нас — фото команды", "collection", [
        ("image", "media [1]", True, "media"),
        ("name", "string", True, "scalar"),
        ("role", "string", False, "scalar"),
        ("order", "integer", False, "scalar"),
    ]),
    ("about-workplace-photo", "О нас — фото пространства", "collection", [
        ("image", "media [1]", True, "media"),
        ("alt", "string", False, "scalar"),
        ("order", "integer", False, "scalar"),
    ]),
    ("accessibility-page", "Страница «Доступность»", "single", [
        ("title", "string", False, "scalar"),
        ("lead", "text", False, "scalar"),
        ("heroPhoto", "media [1]", False, "media"),
        ("heroPhotoAlt", "string", False, "scalar"),
    ]),
    ("workshops-page", "Страница «Мастерские»", "single", [
        ("intro", "text", False, "scalar"),
        ("audienceText", "text", False, "scalar"),
        ("audienceNote", "text", False, "scalar"),
        ("afterIntro", "text", False, "scalar"),
        ("audiencePhoto", "media [1]", False, "media"),
        ("audiencePhotoAlt", "string", False, "scalar"),
        ("afterLearningPhoto", "media [1]", False, "media"),
        ("afterLearningPhotoAlt", "string", False, "scalar"),
    ]),
    ("annual-report", "Годовой отчёт", "collection", [
        ("year", "integer", True, "scalar"),
        ("kind", "enum", True, "scalar"),
        ("pdf", "media [1]", True, "media"),
        ("note", "text", False, "scalar"),
    ]),
    ("legal-document", "Документ фонда", "collection", [
        ("title", "string", True, "scalar"),
        ("category", "enum", True, "scalar"),
        ("pdf", "media [1]", True, "media"),
        ("order", "integer", False, "scalar"),
    ]),
    ("showroom", "Шоурум", "collection", [
        ("heroImage", "media [1]", False, "media"),
    ]),
    ("media-file", "Upload: File  «встроенная»", "media", [
        ("name", "string", False, "scalar"),
        ("url", "string", False, "scalar"),
        ("mime", "string", False, "scalar"),
        ("size", "decimal", False, "scalar"),
        ("width", "integer", False, "scalar"),
        ("height", "integer", False, "scalar"),
        ("alternativeText", "string", False, "scalar"),
    ]),
]

# Компактный набор для слайда: только связанные сущности, ключи + 2–3 показательных поля.
COMPACT_ENTITIES = [
    ("event-type", "Тип мероприятия", "collection", [
        ("name", "string", True, "scalar"),
        ("slug", "uid", True, "scalar"),
    ]),
    ("event", "Мероприятие", "collection", [
        ("title", "string", True, "scalar"),
        ("date", "datetime", False, "scalar"),
        ("type", "→ Тип мероприятия [1]", False, "relation"),
    ]),
    ("event-registration", "Заявка на мероприятие", "collection", [
        ("name", "string", True, "scalar"),
        ("phone", "string", True, "scalar"),
        ("eventId", "string", False, "scalar"),
        ("event", "→ Мероприятие [1]", False, "relation"),
    ]),
    ("category", "Категория шоурума", "collection", [
        ("name", "string", True, "scalar"),
        ("slug", "uid", True, "scalar"),
    ]),
    ("product", "Товар", "collection", [
        ("title", "string", True, "scalar"),
        ("price", "integer", False, "scalar"),
        ("category", "→ Категория [1]", False, "relation"),
    ]),
    ("order", "Заказ", "collection", [
        ("customerName", "string", True, "scalar"),
        ("items", "json (снапшот)", False, "scalar"),
    ]),
]
if COMPACT:
    ENTITIES = COMPACT_ENTITIES

# Первичный ключ id показываем явной строкой во всех сущностях (для нормоконтроля).
for _e in ENTITIES:
    _e[3].insert(0, ("id", "целое", True, "pk"))

# раскладка по колонкам (уид'ы)
COLUMNS = [
    ["event", "showroom"],
    ["event-registration", "workshop-program", "workshop-application"],
    ["order", "direction"],
    ["product", "menu-item"],
    ["cafe-menu-page", "about-page"],
    ["accessibility-page", "about-team-photo", "about-workplace-photo"],
    ["workshops-page", "annual-report", "legal-document"],
]

# Показывать ли связи media → Upload:File. В дипломной — выкл. (инфраструктура CMS,
# media остаётся как атрибут). Поставь True для полного «физического» варианта.
SHOW_MEDIA = False

# реальные доменные связи: (child_uid, parent_uid, глагол) — читается child → parent
# (child, parent, label, parent_mandatory)
# parent_mandatory=True → у родителя «ровно один» (‖); False → «ноль или один» (○|),
# т.к. внешний ключ у ребёнка необязателен (nullable) — товар может быть без категории,
# мероприятие без типа, заявка (workshops-callback) без мероприятия.
DOMAIN_RELS = [
    ("event-registration", "event", "регистрируется на", False),
    ("event", "event-type", "относится к", False),
    ("product", "category", "входит в", False),
]
# мягкие (логические) ссылки без БД-ограничения
SOFT_RELS = [
    ("order", "product", "содержит · json-снапшот"),
]

COL_W = 250
COL_GAP = 70
ROW_H = 22
HEADER_H = 42
V_GAP = 40
X0, Y0 = 40, 40

COLORS = {
    "collection": "#dae8fc",
    "single": "#d5e8d4",
    "media": "#fff2cc",
}

def xesc(s):
    """XML-экранирование значения mxCell. draw.io хранит HTML-разметку как
    escaped-текст и рендерит её при html=1."""
    return escape(s, quote=True)

emap = {e[0]: e for e in ENTITIES}

# --- раскладка по направлениям (группам-«пакетам») ---
# (заголовок, цвет рамки-фона, [uid сущностей внутри])
GROUPS = [
    ("Кофейня",         "#fff7e6", ["cafe-menu-page", "menu-item"]),
    ("Мастерские",      "#eef7ee", ["workshops-page", "workshop-program", "workshop-application"]),
    ("Шоурум",          "#eef2ff", ["showroom", "category", "product", "order"]),
    ("Мероприятия",     "#fdeef2", ["event", "event-type", "event-registration"]),
    ("О фонде и общее", "#f3f4f6", ["about-page", "about-team-photo", "about-workplace-photo",
                                     "accessibility-page", "annual-report", "legal-document"]),
    ("Навигация",       "#fef9e7", ["direction"]),
]
if SHOW_MEDIA:
    GROUPS.append(("Хранилище (Strapi)", "#fff2cc", ["media-file"]))

if COMPACT:
    GROUPS = [
        ("Мероприятия", "#fdeef2", ["event-type", "event", "event-registration"]),
        ("Шоурум",      "#eef2ff", ["category", "product", "order"]),
    ]

GROUP_PAD = 16
GROUP_HEADER = 30
GROUP_GAP_X = 80
CONT_W = COL_W + 2 * GROUP_PAD

group_geom = []   # (gid, gname, gcolor, x, y, w, h)
ent_geom = {}     # uid -> (gid, rel_x, rel_y, w, h) — позиция относительно контейнера
for gi, (gname, gcolor, uids) in enumerate(GROUPS):
    gid = f"g{gi}"
    cont_x = X0 + gi * (CONT_W + GROUP_GAP_X)
    ry = GROUP_HEADER + GROUP_PAD
    for uid in uids:
        attrs = emap[uid][3]
        h = HEADER_H + ROW_H * len(attrs)
        ent_geom[uid] = (gid, GROUP_PAD, ry, COL_W, h)
        ry += h + V_GAP
    cont_h = ry - V_GAP + GROUP_PAD
    group_geom.append((gid, gname, gcolor, cont_x, Y0, CONT_W, cont_h))

legend_y = Y0 + max(g[6] for g in group_geom) + 40

cells = []

def cell(s):
    cells.append(s)

def key_marker(typ, row_kind):
    """Ключ поля для академической нотации: PK / FK / UK."""
    if row_kind == "pk":
        return "PK"
    if row_kind == "media":
        return "FK"  # media-поле = внешний ключ на встроенную сущность Upload: File
    if row_kind == "relation" and "[1]" in typ:
        return "FK"  # владелец связи (manyToOne) держит реальный FK; обратная сторона [*] ключа не несёт
    if typ == "uid":
        return "UK"  # slug — уникальный ключ
    return ""

def attr_label(name, typ, required, row_kind):
    # правый столбец «поле : тип» (ключ ПК/ВК/УК выводится отдельно в левом столбце)
    if row_kind == "pk":
        return f'<b>{name}</b> : {typ}'
    if row_kind == "relation":
        return f'<i>{name}</i> : <i>{typ}</i>'
    if required:
        return f'<b>{name}</b> : {typ} <b>*</b>'
    return f'{name} : {typ}'

# контейнеры-направления (рисуем первыми — они сзади, как UML-«пакеты»)
for gid, gname, gcolor, x, y, w, h in group_geom:
    gstyle = (f"rounded=1;arcSize=3;html=1;whiteSpace=wrap;container=1;collapsible=0;"
              f"fillColor={gcolor};strokeColor=#9aa0a6;verticalAlign=top;align=center;"
              f"fontStyle=1;fontSize=14;spacingTop=6;")
    cell(f'<mxCell id="{gid}" value="{xesc(gname)}" style="{gstyle}" vertex="1" parent="1">'
         f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')

# сущности — HTML-таблица: слева узкий столбец ключа (ПК/ВК/УК), справа «поле : тип»
def entity_html(display, kind, attrs):
    stereo = {"collection": "collection type",
              "single": "single type",
              "media": "plugin::upload"}[kind]
    head_bg = COLORS[kind]
    buf = ("<table width='100%' cellspacing='0' cellpadding='3' "
           "style='background:#ffffff;border-collapse:collapse;font-size:11px;font-family:Helvetica,Arial,sans-serif;'>")
    buf += (f"<tr><td colspan='2' style='background:{head_bg};font-weight:bold;text-align:center;"
            f"padding:5px;border:1px solid #b0b0b0'>«{stereo}»<br>{display}</td></tr>")
    for name, typ, required, row_kind in attrs:
        mk = key_marker(typ, row_kind)
        key = mk
        field = attr_label(name, typ, required, row_kind)
        buf += (f"<tr>"
                f"<td style='width:40px;text-align:center;color:#6a1b9a;font-weight:bold;"
                f"border:1px solid #b0b0b0'>{key}</td>"
                f"<td style='text-align:left;border:1px solid #b0b0b0'>{field}</td></tr>")
    return buf + "</table>"

ENTITY_STYLE = "rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;strokeColor=none;fillColor=none;"
for uid, display, kind, attrs in ENTITIES:
    if uid not in ent_geom:
        continue
    gid, x, y, w, h = ent_geom[uid]
    eid = "n_" + uid.replace("-", "_")
    cell(f'<mxCell id="{eid}" value="{xesc(entity_html(display, kind, attrs))}" '
         f'style="{ENTITY_STYLE}" vertex="1" parent="{gid}">'
         f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')

def nid(uid):
    return "n_" + uid.replace("-", "_")

edge_n = 0
def edge(src, dst, style, value="", src_lbl="", dst_lbl=""):
    global edge_n
    eid = f"e{edge_n}"; edge_n += 1
    cell(f'<mxCell id="{eid}" value="{xesc(value)}" style="{style}" edge="1" parent="1" '
         f'source="{nid(src)}" target="{nid(dst)}"><mxGeometry relative="1" as="geometry"/></mxCell>')
    if src_lbl:
        cell(f'<mxCell id="{eid}_s" value="{xesc(src_lbl)}" '
             f'style="edgeLabel;html=1;align=left;verticalAlign=bottom;fontSize=11;" '
             f'connectable="0" vertex="1" parent="{eid}">'
             f'<mxGeometry x="-0.8" relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry></mxCell>')
    if dst_lbl:
        cell(f'<mxCell id="{eid}_d" value="{xesc(dst_lbl)}" '
             f'style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=11;" '
             f'connectable="0" vertex="1" parent="{eid}">'
             f'<mxGeometry x="0.8" relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry></mxCell>')

# доменные связи (чёрные сплошные, crow's foot):
# child-конец (источник) = ○< (ноль или много), parent-конец (цель) = ‖ (один и только один)
def domain_style(parent_mandatory):
    # ребёнок: ○< (ноль или много); родитель: ‖ (ровно один) или ○| (ноль или один)
    end = "ERmandOne" if parent_mandatory else "ERzeroToOne"
    return (f"startArrow=ERzeroToMany;startFill=0;endArrow={end};endFill=0;html=1;"
            f"strokeColor=#1a1a1a;strokeWidth=1.6;edgeStyle=entityRelationEdgeStyle;rounded=0;")
for child, parent, lbl, parent_mandatory in DOMAIN_RELS:
    edge(child, parent, domain_style(parent_mandatory), value=lbl)

# мягкие ссылки (оранжевый пунктир, ○< с обеих сторон — фактически many-to-many)
SOFT_STYLE = ("startArrow=ERzeroToMany;startFill=0;endArrow=ERzeroToMany;endFill=0;html=1;"
              "dashed=1;strokeColor=#e8710a;strokeWidth=1.2;edgeStyle=entityRelationEdgeStyle;rounded=0;")
for src, dst, lbl in SOFT_RELS:
    edge(src, dst, SOFT_STYLE, value=lbl)

# media-связи (серые, crow's foot): entity = | (один), File = ○| (0..1) или ○< (0..*)
if SHOW_MEDIA:
    for uid, display, kind, attrs in ENTITIES:
        if uid == "media-file":
            continue
        for name, typ, required, row_kind in attrs:
            if row_kind == "media":
                end = "ERzeroToMany" if "[*]" in typ else "ERzeroToOne"
                mstyle = (f"startArrow=ERone;startFill=0;endArrow={end};endFill=0;html=1;"
                          f"strokeColor=#9aa0a6;strokeWidth=1;edgeStyle=orthogonalEdgeStyle;rounded=0;")
                edge(uid, "media-file", mstyle, value=name)

# легенда
media_line = ('— серая сплошная: media → Upload: File (встроенная сущность)<br>'
              if SHOW_MEDIA else
              'поля типа media хранятся в Upload: File (плагин @strapi/upload)<br>')
legend = (
    '<b>Условные обозначения (crow’s foot)</b><br>'
    '‖ — один и только один · ○| — ноль или один · ○< — ноль или много<br>'
    '<b>PK</b> — первичный ключ · <b>FK</b> — внешний ключ · <b>UK</b> — уникальный ключ<br>'
    '— чёрная сплошная: связь Strapi (relation)<br>'
    + media_line +
    '— оранжевый пунктир: «мягкая» ссылка (json/строка, без БД-ограничения)<br>'
    '<b>*</b> — обязательное поле (NOT NULL) · <i>курсив</i> — поле-связь<br>'
    'Прочие системные поля у всех сущностей: documentId, createdAt, updatedAt, publishedAt'
)
cell(f'<mxCell id="legend" value="{xesc(legend)}" '
     f'style="rounded=1;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=10;'
     f'fillColor=#f8f9fa;strokeColor=#bbbbbb;fontSize=12;" vertex="1" parent="1">'
     f'<mxGeometry x="{X0}" y="{legend_y}" width="{COL_W*2}" height="175" as="geometry"/></mxCell>')

body = "\n        ".join(cells)
xml = f'''<mxfile host="app.diagrams.net">
  <diagram name="ER — Окколо CMS" id="okkolo-er">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="2336" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        {body}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
'''

import os
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs",
                   "er-okkolo-compact.drawio" if COMPACT else "er-okkolo.drawio")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    f.write(xml)
print("written:", out)
print("entities:", len(ENTITIES), "edges:", edge_n)
