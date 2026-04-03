import pickle
from diseaseMapper import map_disease

# load model
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "models")

model = pickle.load(open(os.path.join(MODEL_DIR, "model.pkl"), "rb"))
le = pickle.load(open(os.path.join(MODEL_DIR, "target_encoder.pkl"), "rb"))

def predict(features):
    probs = model.predict_proba([features])[0]
    classes = le.classes_

    result = []

    for cls, prob in zip(classes, probs):
        mapped = map_disease(cls)

        result.append({
            "disease": mapped,
            "probability": float(prob)
        })

    # 🔥 Merge grouped diseases
    merged = {}
    for r in result:
        if r["disease"] is None or r["disease"] == "Other":
            continue   # 🚫 ignore noise

        if r["disease"] not in merged:
            merged[r["disease"]] = 0

        merged[r["disease"]] += r["probability"]


    total = sum(merged.values())

    final = [
        {"disease": k, "probability": v / total}
        for k, v in merged.items()
    ]
    # sort
    final = sorted(final, key=lambda x: x["probability"], reverse=True)

    # 🔥 apply threshold (IMPORTANT)
    THRESHOLD = 0.25   # you can tune (0.2–0.3 ideal)

    filtered = [r for r in final if r["probability"] >= THRESHOLD]

    # 🔥 if nothing meaningful → healthy
    if len(filtered) == 0:
        return []

    # return only meaningful predictions
    return [
        {
            "disease": r["disease"],
            "probability": r["probability"],
            "risk": add_risk(r["probability"])
        }
        for r in filtered
    ]

def add_risk(prob):
    if prob > 0.6:
        return "High"
    elif prob > 0.3:
        return "Medium"
    else:
        return "Low"