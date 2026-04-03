def map_disease(d):
    d = str(d).lower()

    if "diabetes" in d:
        return "Diabetes"
    elif "hypertension" in d or "bp" in d:
        return "Hypertension"
    elif "cad" in d or "heart" in d or "stroke" in d:
        return "Cardiovascular"
    elif "asthma" in d or "copd" in d:
        return "Respiratory"
    elif "thyroid" in d:
        return "Thyroid"
    elif "liver" in d or "hepatitis" in d:
        return "Liver"
    elif "infection" in d or "fever" in d or "malaria" in d or "typhoid" in d:
        return "Infection"
    elif "pain" in d or "arthritis" in d:
        return "Musculoskeletal"
    elif "anxiety" in d or "depression" in d:
        return "Mental Health"
    elif "obesity" in d:
        return "Obesity"
    else:
        return "Other"