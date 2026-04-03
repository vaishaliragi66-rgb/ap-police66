import pickle
import json

# ===============================
# LOAD
# ===============================
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))

model = pickle.load(open(os.path.join(BASE_DIR, "models/forecast_model.pkl"), "rb"))
mlb = pickle.load(open(os.path.join(BASE_DIR, "models/forecast_mlb.pkl"), "rb"))
age_encoder = pickle.load(open(os.path.join(BASE_DIR, "models/age_encoder.pkl"), "rb"))
desig_encoder = pickle.load(open(os.path.join(BASE_DIR, "models/desig_encoder.pkl"), "rb"))
# ===============================
# GET ALL VALUES
# ===============================
age_groups = list(age_encoder.classes_)
designations = list(desig_encoder.classes_)

# ===============================
# HELPER
# ===============================
def get_confidence(prob):
    if prob > 0.6:
        return "High"
    elif prob > 0.3:
        return "Medium"
    else:
        return "Low"

def predict(age_group, designation):
    try:
        age_encoded = age_encoder.transform([age_group])[0]
        desig_encoded = desig_encoder.transform([designation])[0]
    except:
        return []

    # use future month index
    X_input = [[999, age_encoded, desig_encoded, 0]]

    pred = model.predict(X_input)
    probs = []

    for estimator in model.estimators_:
        probs.append(estimator.predict_proba(X_input)[0][1])

    result = []

    for i, d in enumerate(mlb.classes_):
        if pred[0][i] == 1:
            result.append({
                "disease": d,
                "confidence": get_confidence(probs[i])
            })

    return result

# ===============================
# BUILD OUTPUT
# ===============================
output = {
    "age_groups": {},
    "designations": {}
}

# Age-wise
for age in age_groups:
    output["age_groups"][age] = predict(age, designations[0])  # fix one designation

# Designation-wise
for desig in designations:
    output["designations"][desig] = predict(age_groups[0], desig)  # fix one age

print(json.dumps(output))