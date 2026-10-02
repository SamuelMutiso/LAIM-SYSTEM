BRANCHES = [
    (1, "LAIM", "LAIM Headquarters"),
    (2, "KOR", "Lord's Altar Korrompoi"),
    (3, "MIL", "Lord's Altar Milimani"),
    (4, "MAT", "Lord's Altar Matuu"),
    (5, "NKP", "Lord's Altar Noonkopir"),
]
HQ_BRANCH_ID = 1

ROLES = ("bishop", "pastor", "secretary", "cell_leader")
GENDERS = ("M", "F")
MARITAL = ("Single", "Married", "Widowed", "Divorced", "Separated")
MEMBER_STATUS = ("Active", "Inactive", "Transferred", "Deceased")
PAYMENT_METHODS = ("mpesa", "bank", "cash")
DENOMINATIONS = (1000, 500, 200, 100, 50, 20, 10, 5, 1)
CONDITIONS = ("Excellent", "Good", "Fair", "Needs repair", "Missing")
INVENTORY_CATEGORIES = (
    "Keyboards & Pianos",
    "Guitars",
    "Drums & Percussion",
    "Microphones",
    "Speakers",
    "Mixers",
    "Amplifiers",
    "Stands",
    "Cables & Accessories",
    "Media & Projection",
    "Furniture",
)


def group_for(age, gender, marital_status, single_parent):
    if age is None:
        return None
    if age <= 12:
        return "sunday_school"
    if age <= 19:
        return "teens"
    if marital_status in ("Married", "Widowed") or single_parent:
        return "mothers" if gender == "F" else "fathers"
    if age <= 24:
        return "junior_youth"
    return "senior_youth"
