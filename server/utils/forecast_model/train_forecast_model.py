import pandas as pd
import pickle
import os

from sklearn.preprocessing import MultiLabelBinarizer, LabelEncoder
from sklearn.multioutput import MultiOutputClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, hamming_loss, classification_report


df = pd.read_excel(
    r"C:\Users\A SARIKA REDDY\ap-police\server\data\AP_Police_ML_Final_v4.xlsx",
)
# ===============================
# CLEAN COLUMN NAMES
# ===============================
df.columns = (
    df.columns.astype(str)
    .str.strip()
    .str.lower()
    .str.replace(" ", "_")
    .str.replace("–", "_")
)

print("\nColumns:", df.columns.tolist())

# ===============================
# AUTO DETECT REQUIRED COLUMNS
# ===============================
DATE_COL = None
TARGET_COL = None
AGE_COL = None
DESIG_COL = None

for col in df.columns:
    if "visit_arrival" in col:
        DATE_COL = col
    if "ml_target" in col:
        TARGET_COL = col
    if "age_group" in col:
        AGE_COL = col
    if "designation" in col:
        DESIG_COL = col

if None in [DATE_COL, TARGET_COL, AGE_COL, DESIG_COL]:
    raise ValueError("Required columns not found")

print("Using DATE:", DATE_COL)
print("Using TARGET:", TARGET_COL)
print("Using AGE:", AGE_COL)
print("Using DESIGNATION:", DESIG_COL)

# ===============================
# PREPROCESS
# ===============================
df[DATE_COL] = pd.to_datetime(df[DATE_COL], errors="coerce")

df = df.dropna(subset=[DATE_COL, TARGET_COL, AGE_COL, DESIG_COL])
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from diseaseMapper import map_disease

df[TARGET_COL] = df[TARGET_COL].apply(map_disease)
df = df[df[TARGET_COL].str.strip() != ""]

# ===============================
# CREATE MONTH
# ===============================
df["month"] = df[DATE_COL].dt.to_period("M")

# ===============================
# ENCODE AGE + DESIGNATION
# ===============================
age_encoder = LabelEncoder()
desig_encoder = LabelEncoder()

df[AGE_COL] = age_encoder.fit_transform(df[AGE_COL].astype(str))
df[DESIG_COL] = desig_encoder.fit_transform(df[DESIG_COL].astype(str))

# ===============================
# GROUP DATA
# ===============================
grouped = df.groupby(["month", AGE_COL, DESIG_COL])[TARGET_COL].apply(list)

# ===============================
# CREATE TRAIN DATA
# ===============================
X = []
Y = []

keys = list(grouped.index)

X = []
Y = []

# sort keys properly
keys = sorted(grouped.index)

season_col = [c for c in df.columns if "season" in c][0]
season_encoder = LabelEncoder()
df[season_col] = season_encoder.fit_transform(df[season_col].astype(str))
for i in range(len(keys)):
    current = keys[i]
    month, age, desig = current

    next_month = month + 1

    next_key = (next_month, age, desig)

    if next_key in grouped:
        season = df.loc[
            (df["month"] == month) &
            (df[AGE_COL] == age) &
            (df[DESIG_COL] == desig),
            season_col
        ].iloc[0]

        X.append([month.ordinal, age, desig, season])
        Y.append(list(set(grouped[next_key])))

if len(X) == 0:
    raise ValueError("No training data formed. Check dataset.")

# ===============================
# MULTI LABEL ENCODING
# ===============================
mlb = MultiLabelBinarizer()
Y_encoded = mlb.fit_transform(Y)

# ===============================
# TRAIN TEST SPLIT
# ===============================
X_train, X_test, Y_train, Y_test = train_test_split(
    X, Y_encoded, test_size=0.2, random_state=42
)

# ===============================
# MODEL
# ===============================

from sklearn.ensemble import RandomForestClassifier

model = MultiOutputClassifier(
    RandomForestClassifier(n_estimators=200, random_state=42)
)

model.fit(X_train, Y_train)

# ===============================
# EVALUATION
# ===============================
Y_pred = model.predict(X_test)

print("\n🔹 Accuracy:", accuracy_score(Y_test, Y_pred))
print("🔹 Hamming Loss:", hamming_loss(Y_test, Y_pred))

print("\n🔹 Classification Report:")
print(classification_report(Y_test, Y_pred, zero_division=0))

# ===============================
# SAVE MODEL
# ===============================
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
MODEL_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(MODEL_DIR, exist_ok=True)

pickle.dump(model, open(os.path.join(MODEL_DIR, "forecast_model.pkl"), "wb"))
pickle.dump(mlb, open(os.path.join(MODEL_DIR, "forecast_mlb.pkl"), "wb"))
pickle.dump(age_encoder, open(os.path.join(MODEL_DIR, "age_encoder.pkl"), "wb"))
pickle.dump(desig_encoder, open(os.path.join(MODEL_DIR, "desig_encoder.pkl"), "wb"))
print("\n✅ Forecast model trained & saved successfully")