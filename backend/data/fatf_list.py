HIGH_RISK_COUNTRIES = [
    "Cayman Islands", "British Virgin Islands", "Panama",
    "Seychelles", "Belize", "Vanuatu", "Samoa",
    "Myanmar", "Iran", "North Korea", "Syria", "Yemen"
]


def get_fatf_risk(country):
    return "HIGH" if country in HIGH_RISK_COUNTRIES else "LOW"
