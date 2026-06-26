#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Генератор КАРТЫ САЙТА (информационной архитектуры) «Окколо» в формате draw.io.

Жанр — карта сайта, а НЕ пользовательский сценарий: узлы = страницы (то, что имеет
URL/адрес), связи = иерархия навигации. Модалки/корзина/формы (карточка товара,
оформление заказа, запись на мероприятие, заявка) — это процесс, их место в отдельной
схеме user-flow, здесь их нет.

Источник истины — роутинг okkolo-mobile/src/App.tsx (страницы) и навигация
(src/data/site.ts, src/data/legal.ts, Footer.tsx — для глобальной полосы).
Единственная динамическая под-страница — /events/:id (стопка: по одной на мероприятие)."""

from html import escape
import os

TYPES = {
    "root":  ("#d5a7f6", "#9c5fc4"),  # вход на сайт
    "page":  ("#dae8fc", "#6c8ebf"),  # страница
    "legal": ("#eeeeee", "#999999"),  # служебная / правовая
}

# id, номер, заголовок, путь, x, y, w, h, тип
NODES = [
    ("home", "1", "Главная", "/", 637, 98, 210, 56, "root"),
    # уровень 2 — основные разделы (ряд)
    ("events",    "2", "Мероприятия", "/events",        40,   206, 175, 58, "page"),
    ("showroom",  "3", "Шоурум",      "/showroom",      245,  206, 175, 58, "page"),
    ("workshops", "4", "Мастерские",  "/workshops",     450,  206, 175, 58, "page"),
    ("cafe",      "5", "Кофейня",     "/cafe",          655,  206, 175, 58, "page"),
    ("about",     "6", "О нас",       "/about",         860,  206, 175, 58, "page"),
    ("access",    "7", "Доступность", "/accessibility", 1065, 206, 175, 58, "page"),
    ("reports",   "8", "Отчёты",      "/reports",       1270, 206, 175, 58, "page"),
    # уровень 3 — динамическая под-страница (стопка)
    ("event_detail", "2.1", "Мероприятие — детально", "/events/:id", 40, 352, 175, 56, "page"),
    # служебные / правовые (в рамке «из подвала»)
    ("terms",   "9",  "Условия покупки", "/terms",   60,  512, 185, 50, "legal"),
    ("privacy", "10", "Политика данных", "/privacy", 258, 512, 185, 50, "legal"),
]
EDGES = [
    ("home", "events"), ("home", "showroom"), ("home", "workshops"), ("home", "cafe"),
    ("home", "about"), ("home", "access"), ("home", "reports"),
    ("events", "event_detail"),
]

W, H = 1480, 640
cells = []
def cell(s): cells.append(s)
def xesc(s): return escape(s, quote=True)

# заголовок
cell(f'<mxCell id="title" value="{xesc("Карта сайта (информационная архитектура) — «Окколо»")}" '
     f'style="text;html=1;align=left;verticalAlign=middle;fontSize=16;fontStyle=1;" vertex="1" parent="1">'
     f'<mxGeometry x="40" y="2" width="980" height="26" as="geometry"/></mxCell>')

# полоса глобальной навигации (одним блоком — без стрелок ко всем страницам)
band = ("<b>Глобальная навигация — на каждой странице.</b>&nbsp;&nbsp; "
        "<b>Шапка:</b> логотип → «Главная» · меню разделов · бургер = полное меню.&nbsp;&nbsp; "
        "<b>Подвал:</b> ссылки на все разделы · контакты · соцсети · правовые страницы.")
cell(f'<mxCell id="band" value="{xesc(band)}" '
     f'style="rounded=1;arcSize=6;whiteSpace=wrap;html=1;dashed=1;fillColor=#eef0f2;strokeColor=#9aa0a6;'
     f'fontSize=11;align=left;verticalAlign=middle;spacingLeft=12;spacingRight=12;" vertex="1" parent="1">'
     f'<mxGeometry x="40" y="34" width="1405" height="44" as="geometry"/></mxCell>')

# рамка «правовые / служебные — из подвала»
cell(f'<mxCell id="legalbox" value="{xesc("Служебные / правовые страницы — доступ из подвала (на всех страницах)")}" '
     f'style="rounded=1;html=1;whiteSpace=wrap;dashed=1;fillColor=#fbfbfb;strokeColor=#bdbdbd;'
     f'verticalAlign=top;align=left;fontSize=11;fontColor=#777777;spacingTop=6;spacingLeft=10;" vertex="1" parent="1">'
     f'<mxGeometry x="40" y="470" width="423" height="110" as="geometry"/></mxCell>')

def node(nid, num, title, path, x, y, w, h, typ):
    fill, stroke = TYPES[typ]
    val = (f'<b>{num}. {title}</b>'
           f'<br><font style="font-size:10px;" color="#5a5a5a">{path}</font>')
    style = (f"rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};"
             f"fontSize=12;verticalAlign=middle;align=center;")
    cell(f'<mxCell id="{nid}" value="{xesc(val)}" style="{style}" vertex="1" parent="1">'
         f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')

# «стопка» для динамической страницы — две листа-подложки сзади (рисуем до основного узла)
ed = next(n for n in NODES if n[0] == "event_detail")
_, _, _, _, ex, ey, ew, eh, _ = ed
sheet = "rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
cell(f'<mxCell id="ed_b2" value="" style="{sheet}" vertex="1" parent="1">'
     f'<mxGeometry x="{ex+12}" y="{ey-12}" width="{ew}" height="{eh}" as="geometry"/></mxCell>')
cell(f'<mxCell id="ed_b1" value="" style="{sheet}" vertex="1" parent="1">'
     f'<mxGeometry x="{ex+6}" y="{ey-6}" width="{ew}" height="{eh}" as="geometry"/></mxCell>')

# узлы (основные поверх подложек)
for n in NODES:
    node(*n)

# аннотации
cell(f'<mxCell id="home_note" value="{xesc("секции одной страницы: Hero · О проекте · Направления · Афиша")}" '
     f'style="text;html=1;align=center;verticalAlign=middle;fontSize=10;fontColor=#777777;" vertex="1" parent="1">'
     f'<mxGeometry x="585" y="158" width="320" height="18" as="geometry"/></mxCell>')
cell(f'<mxCell id="ed_note" value="{xesc("стопка: по одной странице на каждое мероприятие (динамический набор)")}" '
     f'style="text;html=1;align=left;verticalAlign=middle;fontSize=10;fontStyle=2;fontColor=#777777;" vertex="1" parent="1">'
     f'<mxGeometry x="40" y="420" width="300" height="30" as="geometry"/></mxCell>')
cell(f'<mxCell id="rep_note" value="{xesc("+ PDF-отчёты на скачивание")}" '
     f'style="text;html=1;align=center;verticalAlign=middle;fontSize=10;fontColor=#777777;" vertex="1" parent="1">'
     f'<mxGeometry x="1270" y="270" width="175" height="16" as="geometry"/></mxCell>')

# рёбра иерархии (сплошные)
for i, (s, d) in enumerate(EDGES):
    style = ("edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=none;"
             "strokeColor=#7a7a7a;exitX=0.5;exitY=1;entryX=0.5;entryY=0;")
    cell(f'<mxCell id="e{i}" style="{style}" edge="1" parent="1" source="{s}" target="{d}">'
         f'<mxGeometry relative="1" as="geometry"/></mxCell>')

# легенда
legend = (
    '<b>Условные обозначения</b><br>'
    '■ фиолетовый — главная (вход на сайт)&nbsp;&nbsp;·&nbsp;&nbsp;■ голубой — страница раздела<br>'
    '■ серый — служебная / правовая страница<br>'
    'стопка листов — динамическая страница (по одной на запись)<br>'
    'линии — иерархия навигации&nbsp;&nbsp;·&nbsp;&nbsp;нумерация — уровень в структуре<br>'
    '<i>модалки и формы (корзина, карточка товара, запись) — это сценарии, на карте сайта не показаны</i>'
)
cell(f'<mxCell id="legend" value="{xesc(legend)}" '
     f'style="rounded=1;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=8;'
     f'fillColor=#f8f9fa;strokeColor=#cccccc;fontSize=11;" vertex="1" parent="1">'
     f'<mxGeometry x="500" y="470" width="640" height="120" as="geometry"/></mxCell>')

body = "\n        ".join(cells)
xml = f'''<mxfile host="app.diagrams.net">
  <diagram name="Карта сайта — Окколо" id="okkolo-sitemap">
    <mxGraphModel dx="1200" dy="800" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{W}" pageHeight="{H}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        {body}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
'''
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "sitemap-okkolo.drawio")
with open(out, "w", encoding="utf-8") as f:
    f.write(xml)
print("written:", out)
print("страниц:", len(NODES), "связей:", len(EDGES))
