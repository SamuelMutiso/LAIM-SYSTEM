from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

STATIC = Path(__file__).resolve().parent / "static"

ALTAR = HexColor("#2D3191")
ALTAR_LIGHT = HexColor("#EEF0FB")
FLAME = HexColor("#F2C811")
FLAME_DEEP = HexColor("#C78A10")
SCRIPTURE = HexColor("#963C58")
INK = HexColor("#3E403E")
INK_SOFT = HexColor("#6B6E6B")
LINE = HexColor("#B9BBB6")
LINEN = HexColor("#F7F5F0")

PAGE_W, PAGE_H = A4
MARGIN = 16 * mm

_fonts_ready = False


def register_fonts():
    global _fonts_ready
    if _fonts_ready:
        return
    for name, file in [
        ("Sora-Bold", "sora-700.ttf"),
        ("Sora-Semi", "sora-600.ttf"),
        ("Manrope", "manrope-400.ttf"),
        ("Manrope-Semi", "manrope-600.ttf"),
        ("Manrope-Bold", "manrope-700.ttf"),
    ]:
        pdfmetrics.registerFont(TTFont(name, str(STATIC / "fonts" / file)))
    _fonts_ready = True


class Sheet:

    def __init__(self, canvas, title, subtitle=None, church_line=None):
        register_fonts()
        self.c = canvas
        self.title = title
        self.subtitle = subtitle
        self.church_line = church_line
        self.x0 = MARGIN
        self.x1 = PAGE_W - MARGIN
        self.width = self.x1 - self.x0
        self.y = PAGE_H - MARGIN
        self.header()

    def header(self):
        c = self.c
        logo = ImageReader(str(STATIC / "brand" / "mark.png"))
        lw, lh = 20 * mm, 17 * mm
        c.drawImage(logo, self.x0, self.y - lh, lw, lh, mask="auto", preserveAspectRatio=True)
        tx = self.x0 + lw + 5 * mm
        c.setFillColor(INK)
        c.setFont("Sora-Bold", 14.5)
        c.drawString(tx, self.y - 7 * mm, "LORD’S ALTAR MINISTRIES INTERNATIONAL")
        c.setFont("Manrope-Semi", 8)
        c.setFillColor(SCRIPTURE)
        c.drawString(tx, self.y - 11.5 * mm, self.church_line or "LEVITICUS 6:13  ·  LAIM HQ  ·  KORROMPOI  ·  MILIMANI  ·  MATUU")
        self.y -= lh + 3 * mm
        c.setStrokeColor(FLAME)
        c.setLineWidth(2)
        c.line(self.x0, self.y, self.x1, self.y)
        c.setStrokeColor(ALTAR)
        c.setLineWidth(0.8)
        c.line(self.x0, self.y - 1.6 * mm, self.x1, self.y - 1.6 * mm)
        self.y -= 10 * mm
        c.setFillColor(ALTAR)
        c.setFont("Sora-Bold", 19)
        c.drawString(self.x0, self.y, self.title.upper())
        if self.subtitle:
            self.y -= 5.5 * mm
            c.setFillColor(INK_SOFT)
            c.setFont("Manrope", 9)
            c.drawString(self.x0, self.y, self.subtitle)
        self.y -= 7 * mm
        self.footer()

    def footer(self):
        c = self.c
        c.setFont("Manrope", 7)
        c.setFillColor(INK_SOFT)
        c.drawString(self.x0, 9 * mm, "Lord’s Altar Ministries International  ·  “The fire shall ever be burning upon the altar; it shall never go out.” — Leviticus 6:13")
        c.drawRightString(self.x1, 9 * mm, "LAIM Office")

    def ensure(self, needed_mm):
        if self.y - needed_mm * mm > 30 * mm:
            return
        c = self.c
        c.showPage()
        self.y = PAGE_H - MARGIN
        c.setFillColor(ALTAR)
        c.setFont("Sora-Bold", 11)
        c.drawString(self.x0, self.y - 4 * mm, self.title.upper())
        c.setFont("Manrope", 8)
        c.setFillColor(INK_SOFT)
        c.drawRightString(self.x1, self.y - 4 * mm, "Lord’s Altar Ministries International  ·  continued")
        c.setStrokeColor(FLAME)
        c.setLineWidth(1.5)
        c.line(self.x0, self.y - 7 * mm, self.x1, self.y - 7 * mm)
        self.y -= 16 * mm
        self.footer()

    def section(self, text, gap=4):
        self.ensure(gap + 24)
        c = self.c
        self.y -= gap * mm
        c.setFillColor(ALTAR_LIGHT)
        c.roundRect(self.x0, self.y - 2 * mm, self.width, 7 * mm, 1.5 * mm, stroke=0, fill=1)
        c.setFillColor(ALTAR)
        c.setFont("Sora-Semi", 9)
        c.drawString(self.x0 + 3 * mm, self.y, text.upper())
        self.y -= 9 * mm

    def fields(self, labels, widths=None, height=13):
        self.ensure(height)
        c = self.c
        n = len(labels)
        widths = widths or [1 / n] * n
        gap = 5 * mm
        x = self.x0
        total = self.width - gap * (n - 1)
        for label, w in zip(labels, widths):
            fw = total * w
            c.setFont("Manrope-Semi", 7.5)
            c.setFillColor(INK_SOFT)
            c.drawString(x, self.y, label.upper())
            c.setStrokeColor(LINE)
            c.setLineWidth(0.6)
            c.line(x, self.y - (height - 5.5) * mm, x + fw, self.y - (height - 5.5) * mm)
            x += fw + gap
        self.y -= height * mm

    def options(self, label, opts, inline_label_w=38):
        self.ensure(14)
        c = self.c
        c.setFont("Manrope-Semi", 7.5)
        c.setFillColor(INK_SOFT)
        c.drawString(self.x0, self.y, label.upper())
        x = self.x0 + inline_label_w * mm
        c.setFont("Manrope", 9)
        c.setFillColor(INK)
        for o in opts:
            c.setStrokeColor(INK_SOFT)
            c.setLineWidth(0.7)
            c.roundRect(x, self.y - 0.6 * mm, 3.4 * mm, 3.4 * mm, 0.6 * mm, stroke=1, fill=0)
            c.drawString(x + 5 * mm, self.y, o)
            x += (c.stringWidth(o, "Manrope", 9) + 11 * mm)
            if x > self.x1 - 25 * mm and o != opts[-1]:
                x = self.x0 + inline_label_w * mm
                self.y -= 6 * mm
        self.y -= 8 * mm

    def lines(self, label, count=3, spacing=7.5):
        self.ensure(count * spacing + 6)
        c = self.c
        if label:
            c.setFont("Manrope-Semi", 7.5)
            c.setFillColor(INK_SOFT)
            c.drawString(self.x0, self.y, label.upper())
        c.setStrokeColor(LINE)
        c.setLineWidth(0.6)
        for i in range(count):
            yy = self.y - (i + 1) * spacing * mm
            c.line(self.x0, yy, self.x1, yy)
        self.y -= (count * spacing + 5) * mm

    def table(self, headers, rows, widths=None, row_h=7.5, numbered=False):
        self.ensure(rows * row_h + 12)
        c = self.c
        n = len(headers)
        widths = widths or [1 / n] * n
        cols = [self.width * w for w in widths]
        top = self.y + 3 * mm
        c.setFillColor(LINEN)
        c.rect(self.x0, top - 7 * mm, self.width, 7 * mm, stroke=0, fill=1)
        c.setFont("Manrope-Bold", 7.5)
        c.setFillColor(INK)
        x = self.x0
        for h, w in zip(headers, cols):
            c.drawString(x + 2 * mm, top - 4.7 * mm, h.upper())
            x += w
        c.setStrokeColor(LINE)
        c.setLineWidth(0.6)
        y = top - 7 * mm
        for r in range(rows):
            y -= row_h * mm
            c.line(self.x0, y, self.x1, y)
            if numbered:
                x = self.x0
                c.setFont("Manrope", 8)
                c.setFillColor(INK_SOFT)
                for w in cols:
                    c.drawString(x + 2 * mm, y + 2.2 * mm, f"{r + 1}.")
                    x += w
        c.setStrokeColor(INK_SOFT)
        c.setLineWidth(0.8)
        c.rect(self.x0, y, self.width, top - y, stroke=1, fill=0)
        x = self.x0
        for w in cols[:-1]:
            x += w
            c.line(x, top, x, y)
        self.y = y - 8 * mm

    def note(self, text, size=8.5):
        c = self.c
        c.setFont("Manrope", size)
        c.setFillColor(INK_SOFT)
        c.drawString(self.x0, self.y, text)
        self.y -= 6 * mm

    def paragraph(self, text, size=10, leading=5.2, font="Manrope"):
        from reportlab.lib.utils import simpleSplit

        self.ensure(12)
        c = self.c
        c.setFont(font, size)
        c.setFillColor(INK)
        for line in simpleSplit(text, font, size, self.width):
            c.drawString(self.x0, self.y, line)
            self.y -= leading * mm
        self.y -= 2 * mm

    def office_box(self, items):
        self.ensure(20)
        c = self.c
        h = 16 * mm
        y = self.y - h
        c.setFillColor(LINEN)
        c.setStrokeColor(LINE)
        c.roundRect(self.x0, y, self.width, h, 2 * mm, stroke=1, fill=1)
        c.setFont("Sora-Semi", 7.5)
        c.setFillColor(SCRIPTURE)
        c.drawString(self.x0 + 3 * mm, y + h - 5 * mm, "FOR OFFICE USE")
        x = self.x0 + 3 * mm
        seg = (self.width - 6 * mm) / len(items)
        c.setFont("Manrope-Semi", 7)
        c.setFillColor(INK_SOFT)
        for it in items:
            c.drawString(x, y + 4 * mm, it.upper())
            c.setStrokeColor(LINE)
            c.line(x + c.stringWidth(it.upper(), "Manrope-Semi", 7) + 2 * mm, y + 3.6 * mm, x + seg - 4 * mm, y + 3.6 * mm)
            x += seg
        self.y = y - 4 * mm
