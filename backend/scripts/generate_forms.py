import sys
from pathlib import Path

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.pdfkit import ALTAR, FLAME, INK, INK_SOFT, LINE, MARGIN, PAGE_H, PAGE_W, SCRIPTURE, Sheet

BRANCHES = ["LAIM HQ", "Korrompoi", "Milimani", "Matuu", "Noonkopir"]


def home_church_report(c):
    s = Sheet(c, "Home Church Report", "Thursday home church · 6:00 – 7:00 PM", church_line="LORD’S ALTAR INTERNATIONAL MINISTRY CHURCH  ·  LEVITICUS 6:13")
    s.fields(["Home church name", "Branch", "Date"], [0.45, 0.3, 0.25])
    s.fields(["Area", "Meeting venue", "Time"], [0.3, 0.45, 0.25])
    s.fields(["Leader", "Assistant"])
    s.fields(["Preaching from", "By"], [0.55, 0.45])
    s.fields(["Praise & worship led by"])
    s.section("Attendance", gap=1)
    s.table(["Adults", "Children (above 3 years)"], rows=15, row_h=7.2, numbered=True)
    s.fields(["No. of visitors", "Offering (KSh)", "Leader’s sign", "Date"], [0.2, 0.25, 0.33, 0.22])
    s.note("Tip: this report can also be filled online in the LAIM Office system — Home Church, then Submit report.")


def new_member(c):
    s = Sheet(c, "New Member Registration", "Welcome to the family. Please fill in clearly in capital letters.")
    s.section("Personal details", gap=0)
    s.fields(["First name", "Other names", "Surname"])
    s.options("Gender", ["Male", "Female"])
    s.fields(["Date of birth (dd/mm/yyyy)", "Occupation"], [0.4, 0.6])
    s.options("Marital status", ["Single", "Married", "Widowed", "Divorced", "Separated", "Single parent"])
    s.section("Contact")
    s.fields(["Phone", "Alternative phone", "Email"], [0.28, 0.28, 0.44])
    s.fields(["Where you stay (estate / area)", "Nearest landmark"], [0.6, 0.4])
    s.section("Family")
    s.fields(["Spouse’s name (if married)", "Spouse’s phone"], [0.62, 0.38])
    s.table(["Children’s names", "Date of birth", "Gender"], rows=4, widths=[0.6, 0.25, 0.15])
    s.section("Church", gap=0)
    s.options("Branch", BRANCHES)
    s.fields(["Home church (Thursday cell)", "Previous church (if any)", "Date joined"], [0.36, 0.42, 0.22])
    s.section("Spiritual life")
    s.options("Born again?", ["Yes — date: ____________", "No", "Would like to talk to a pastor"], inline_label_w=38)
    s.options("Water baptised?", ["Yes — date: ____________", "No"], inline_label_w=38)
    s.options("Holy Spirit baptism", ["Yes", "No", "Would like prayer"], inline_label_w=38)
    s.options("I’d like to serve in", ["Worship", "Ushering", "Media", "Sunday School", "Intercession", "Youth", "Hospitality", "Other: ________"], inline_label_w=38)
    s.fields(["Member’s signature", "Date"], [0.7, 0.3], height=12)
    s.office_box(["Received by", "Date", "Entered in system  ☐"])


def new_believer(c):
    s = Sheet(c, "New Believer — Salvation Decision", "“If any man be in Christ, he is a new creature.” — 2 Corinthians 5:17")
    s.section("About you", gap=0)
    s.fields(["Full name", "Phone"], [0.62, 0.38])
    s.options("Gender", ["Male", "Female"])
    s.options("Age group", ["Under 13", "13–19", "20–24", "25–35", "36+"])
    s.fields(["Where you stay (estate / area)", "Occupation / school"], [0.55, 0.45])
    s.section("Your decision")
    s.fields(["Date of decision", "Led to Christ by / counsellor"], [0.35, 0.65])
    s.options("Where", ["Main Service", "Youth Service", "Home Church", "Kesha", "Crusade / outreach", "Other"], inline_label_w=22)
    s.options("First time in church?", ["Yes", "No — I was a backslider returning", "No — from another church"], inline_label_w=38)
    s.lines("Prayer request", count=3)
    s.section("Next steps (office / follow-up team)")
    s.options("Done", ["Bible given", "Assigned to home church", "Enrolled in discipleship class", "Booked for water baptism", "Visited at home"], inline_label_w=16)
    s.fields(["Home church assigned", "Follow-up person", "Their phone"], [0.35, 0.4, 0.25])
    s.table(["Follow-up date", "Contacted by", "How it went"], rows=4, widths=[0.2, 0.3, 0.5])
    s.office_box(["Received by", "Date", "Entered in system  ☐"])


def water_baptism(c):
    s = Sheet(c, "Water Baptism Application", "“He that believeth and is baptized shall be saved.” — Mark 16:16")
    s.section("Candidate", gap=0)
    s.fields(["Full name", "Date of birth", "Phone"], [0.5, 0.22, 0.28])
    s.options("Gender", ["Male", "Female"])
    s.options("Branch", BRANCHES)
    s.fields(["Home church", "Home church leader"], [0.45, 0.55])
    s.section("Testimony")
    s.fields(["Date I got born again", "Where"], [0.35, 0.65])
    s.lines("In a few words, tell us how you came to Christ", count=5)
    s.options("Discipleship class", ["Completed", "Attending", "Not yet"], inline_label_w=38)
    s.fields(["Candidate’s signature", "Date"], [0.7, 0.3], height=12)
    s.section("Recommendation & approval")
    s.fields(["Home church leader’s signature", "Date"], [0.7, 0.3], height=12)
    s.fields(["Pastor’s approval — name & signature", "Date"], [0.7, 0.3], height=12)
    s.fields(["Baptised on", "Place", "Officiating minister"], [0.25, 0.35, 0.4], height=12)
    s.office_box(["Certificate no.", "Entered in system  ☐"])


def child_dedication(c):
    s = Sheet(c, "Child Dedication Request", "“Train up a child in the way he should go.” — Proverbs 22:6")
    s.section("The child", gap=0)
    s.fields(["Child’s full name", "Date of birth"], [0.68, 0.32])
    s.options("Gender", ["Boy", "Girl"])
    s.fields(["Place of birth", "Meaning / reason for the name (optional)"], [0.4, 0.6])
    s.section("Parents / guardian")
    s.fields(["Father’s full name", "Phone"], [0.65, 0.35])
    s.options("Father is a member", ["Yes — branch: ____________", "No"], inline_label_w=38)
    s.fields(["Mother’s full name", "Phone"], [0.65, 0.35])
    s.options("Mother is a member", ["Yes — branch: ____________", "No"], inline_label_w=38)
    s.fields(["Guardian (if not parents)", "Relationship", "Phone"], [0.45, 0.25, 0.3])
    s.fields(["Where the family stays", "Home church"], [0.55, 0.45])
    s.section("Dedication")
    s.fields(["Preferred Sunday", "Service"], [0.4, 0.6])
    s.paragraph("We, the parents / guardian of this child, commit before God and the church to raise this child in the fear and knowledge of the Lord, to pray for them, and to bring them up in the house of God.", size=9.5)
    s.fields(["Father’s signature", "Mother’s signature", "Date"], [0.38, 0.38, 0.24], height=12)
    s.section("Pastor’s approval")
    s.fields(["Approved by", "Dedicated on", "Officiating minister", "Certificate no."], [0.3, 0.2, 0.32, 0.18], height=12)


def marriage(c):
    s = Sheet(c, "Marriage / Wedding Application", "To be handed to the pastor at least three (3) months before the proposed wedding date.")
    for who in ["Groom", "Bride"]:
        s.section(who, gap=0 if who == "Groom" else 3)
        s.fields(["Full name", "Date of birth", "Phone"], [0.5, 0.22, 0.28])
        s.fields(["Where you stay", "Occupation", "Branch / church"], [0.36, 0.32, 0.32])
        s.options("Status", ["Born again", "Water baptised", "Never married before", "Widowed", "Divorced"], inline_label_w=16)
        s.fields(["Parent / guardian’s name", "Their phone"], [0.65, 0.35], height=12)
    s.section("The wedding")
    s.fields(["Proposed date", "Proposed venue", "Expected guests"], [0.25, 0.5, 0.25])
    s.section("Pre-marital counselling")
    s.table(["Session", "Date", "Counsellor", "Couple’s initials"], rows=4, widths=[0.15, 0.2, 0.4, 0.25], numbered=False)
    s.fields(["Groom’s signature", "Bride’s signature", "Pastor’s approval & date"], [0.3, 0.3, 0.4], height=12)


def transfer_letter(c):
    s = Sheet(c, "Membership Transfer Letter", "Letter of transfer — within LAIM branches or to / from another church")
    s.fields(["Ref. no.", "Date"], [0.5, 0.5])
    s.fields(["To (branch / church)", "From (branch / church)"])
    s.section("Member", gap=1)
    s.fields(["Full name", "Phone"], [0.65, 0.35])
    s.fields(["Member since", "Home church", "Ministry / department served"], [0.22, 0.3, 0.48])
    s.options("Status", ["Born again", "Water baptised", "Holy Spirit baptised", "Married", "Single"], inline_label_w=16)
    s.section("Letter")
    s.paragraph("Dear Pastor,", size=10)
    s.paragraph("Greetings in the precious name of our Lord Jesus Christ. This is to confirm that the above-named has been a member of Lord’s Altar Ministries International and, to the best of our knowledge, has been in good standing in fellowship and conduct. We hereby release and recommend them to your care, and ask that you receive them in the Lord.", size=10)
    s.lines("Reason for transfer / pastor’s remarks", count=3)
    s.paragraph("Yours in His service,", size=10)
    s.fields(["Pastor’s name", "Signature", "Date"], [0.42, 0.34, 0.24], height=12)
    c.setStrokeColor(LINE)
    c.setDash(3, 2)
    c.roundRect(PAGE_W - MARGIN - 45 * mm, s.y - 30 * mm, 45 * mm, 30 * mm, 3 * mm)
    c.setDash()
    c.setFont("Manrope-Semi", 7.5)
    c.setFillColor(INK_SOFT)
    c.drawCentredString(PAGE_W - MARGIN - 22.5 * mm, s.y - 16 * mm, "CHURCH STAMP")


def visitor_card(c):
    from reportlab.lib.utils import ImageReader
    from app.pdfkit import STATIC, register_fonts

    register_fonts()
    half = PAGE_H / 2
    for top in (PAGE_H, half):
        x0, x1 = MARGIN, PAGE_W - MARGIN
        y = top - 14 * mm
        logo = ImageReader(str(STATIC / "brand" / "mark.png"))
        c.drawImage(logo, x0, y - 14 * mm, 17 * mm, 14 * mm, mask="auto", preserveAspectRatio=True)
        c.setFillColor(ALTAR)
        c.setFont("Sora-Bold", 18)
        c.drawString(x0 + 21 * mm, y - 6 * mm, "Welcome to Lord’s Altar!")
        c.setFont("Manrope", 9)
        c.setFillColor(INK_SOFT)
        c.drawString(x0 + 21 * mm, y - 11.5 * mm, "We are glad you came. Fill this card and drop it with an usher.")
        c.setStrokeColor(FLAME)
        c.setLineWidth(2)
        c.line(x0, y - 17 * mm, x1, y - 17 * mm)
        y -= 26 * mm

        def blank(label, xa, xb, yy):
            c.setFont("Manrope-Semi", 7.5)
            c.setFillColor(INK_SOFT)
            c.drawString(xa, yy, label.upper())
            c.setStrokeColor(LINE)
            c.setLineWidth(0.6)
            c.line(xa, yy - 7 * mm, xb, yy - 7 * mm)

        mid = x0 + (x1 - x0) * 0.6
        blank("Full name", x0, mid - 4 * mm, y)
        blank("Phone", mid, x1, y)
        y -= 12 * mm
        blank("Where you stay", x0, mid - 4 * mm, y)
        blank("Date", mid, x1, y)
        y -= 13 * mm

        def boxes(label, opts, yy):
            c.setFont("Manrope-Semi", 7.5)
            c.setFillColor(INK_SOFT)
            c.drawString(x0, yy, label.upper())
            xx = x0 + 42 * mm
            c.setFont("Manrope", 9)
            c.setFillColor(INK)
            for o in opts:
                c.setStrokeColor(INK_SOFT)
                c.roundRect(xx, yy - 0.6 * mm, 3.4 * mm, 3.4 * mm, 0.6 * mm)
                c.drawString(xx + 5 * mm, yy, o)
                xx += c.stringWidth(o, "Manrope", 9) + 11 * mm

        boxes("This is my", ["First visit", "Second visit", "I attend regularly"], y)
        y -= 7 * mm
        boxes("I heard about you from", ["A friend / family", "Facebook", "YouTube", "Passing by"], y)
        y -= 7 * mm
        boxes("I would like", ["A pastor to call me", "To join a home church", "Prayer"], y)
        y -= 6 * mm
        boxes("", ["To know more about Jesus", "To become a member"], y)
        y -= 10 * mm
        c.setFont("Manrope-Semi", 7.5)
        c.setFillColor(INK_SOFT)
        c.drawString(x0, y, "PRAYER REQUEST")
        c.setStrokeColor(LINE)
        for i in range(3):
            c.line(x0, y - (i + 1) * 7 * mm, x1, y - (i + 1) * 7 * mm)
        c.setFont("Manrope", 7)
        c.drawString(x0, top - half + 12 * mm, "Sundays: Morning Glory 6 AM · Youth 7 AM · Discipleship 8 AM · Main Service 9:30 AM  ·  Home Church: Thursdays 6 PM")
    c.setStrokeColor(INK_SOFT)
    c.setDash(4, 3)
    c.line(6 * mm, half, PAGE_W - 6 * mm, half)
    c.setDash()
    c.setFont("Manrope", 7)
    c.setFillColor(INK_SOFT)
    c.drawString(8 * mm, half + 1.5 * mm, "- - cut here - -")


FORMS = {
    "home-church-report": ("Home Church Report", home_church_report),
    "new-member-registration": ("New Member Registration", new_member),
    "new-believer-decision": ("New Believer — Salvation Decision", new_believer),
    "water-baptism-application": ("Water Baptism Application", water_baptism),
    "child-dedication-request": ("Child Dedication Request", child_dedication),
    "marriage-application": ("Marriage / Wedding Application", marriage),
    "membership-transfer-letter": ("Membership Transfer Letter", transfer_letter),
    "visitor-card": ("Visitor Card", visitor_card),
}


def build(out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    for slug, (title, fn) in FORMS.items():
        path = out_dir / f"{slug}.pdf"
        c = canvas.Canvas(str(path), pagesize=(PAGE_W, PAGE_H))
        c.setTitle(f"{title} — Lord’s Altar Ministries International")
        c.setAuthor("Lord’s Altar Ministries International")
        fn(c)
        c.showPage()
        c.save()
        print("wrote", path)


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "frontend" / "public" / "forms"
    build(target)
