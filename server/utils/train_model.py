import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.utils import resample
from sklearn.metrics import classification_report
from diseaseMapper import map_disease
# -------------------------------
# LOAD DATA
# -------------------------------
df = pd.read_excel(r"C:\Users\A SARIKA REDDY\ap-police\server\data\AP_Police_ML_Training_Dataset_5000.xlsx", header=2)

# -------------------------------
# CLEAN COLUMN NAMES
# -------------------------------
df.columns = (
    df.columns
    .str.strip()
    .str.lower()
    .str.replace(" ", "_")
    .str.replace("(", "")
    .str.replace(")", "")
    .str.replace("°", "")
)

print("\nTOTAL COLUMNS:", len(df.columns))
print(df.columns.tolist())

# -------------------------------
# AUTO DETECT REQUIRED COLUMNS
# -------------------------------
def find_col(keyword_list):
    for col in df.columns:
        for key in keyword_list:
            if key in col:
                return col
    return None

TEMP_COL = find_col(["temp"])
PULSE_COL = find_col(["pulse"])
HEIGHT_COL = find_col(["height"])
WEIGHT_COL = find_col(["weight"])
AGE_COL = find_col(["age_years", "age"])
GENDER_COL = find_col(["gender"])
TARGET_COL = "ml_target_–_disease_prediction"

print("\nDetected Columns:")
print("TEMP:", TEMP_COL)
print("PULSE:", PULSE_COL)
print("HEIGHT:", HEIGHT_COL)
print("WEIGHT:", WEIGHT_COL)
print("AGE:", AGE_COL)
print("GENDER:", GENDER_COL)

# -------------------------------
# VALIDATION (fail early)
# -------------------------------
required = [TEMP_COL, PULSE_COL, HEIGHT_COL, WEIGHT_COL, AGE_COL, GENDER_COL, TARGET_COL]

if None in required:
    raise ValueError("Some required columns not found. Check dataset column names.")

# -------------------------------
# FEATURE ENGINEERING
# -------------------------------
df['systolic_bp'] = df['sbp_mmhg']
df['diastolic_bp'] = df['dbp_mmhg']
df['bmi'] = df[WEIGHT_COL] / ((df[HEIGHT_COL] / 100) ** 2)

# -------------------------------
# SELECT FINAL COLUMNS
# -------------------------------
features = [
    AGE_COL,
    GENDER_COL,
    "designation",
    "bmi",
    TEMP_COL,
    PULSE_COL,
    "systolic_bp",
    "diastolic_bp",
    "comorbidity_count",
]

df = df[features + [TARGET_COL]]

# -------------------------------
# HANDLE MISSING VALUES
# -------------------------------
df = df.dropna(subset=features + [TARGET_COL])

print("\nRows after cleaning:", len(df))

if len(df) == 0:
    raise ValueError("Dataset became empty after cleaning. Fix missing values.")

# -------------------------------
# ENCODE FEATURES
# -------------------------------
le_dict = {}
df[TARGET_COL] = df[TARGET_COL].apply(map_disease)
X = df[features].copy()

for col in X.columns:
    if X[col].dtype == 'object':
        le = LabelEncoder()
        X.loc[:, col] = le.fit_transform(X[col])
        le_dict[col] = le

# -------------------------------
# TARGET ENCODING
# -------------------------------
target_le = LabelEncoder()
y = target_le.fit_transform(df[TARGET_COL])

print("\nClass Distribution BEFORE balancing:")
print(df[TARGET_COL].value_counts())

X = df[features].copy()

for col in X.columns:
    if col in le_dict:
        X.loc[:, col] = le_dict[col].transform(X[col])

y = target_le.transform(df[TARGET_COL])

# -------------------------------
# TRAIN TEST SPLIT
# -------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# -------------------------------
# MODEL TRAINING
# -------------------------------
model = RandomForestClassifier(
    random_state=42,
    class_weight='balanced'
)

model.fit(X_train, y_train)

# -------------------------------
# EVALUATION
# -------------------------------
y_pred = model.predict(X_test)

print("\nMODEL PERFORMANCE:")
print(classification_report(y_test, y_pred))

# -------------------------------
# SAVE MODEL
# -------------------------------
import os
import pickle

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "models")

os.makedirs(MODEL_DIR, exist_ok=True)

pickle.dump(model, open(os.path.join(MODEL_DIR, "model.pkl"), "wb"))
pickle.dump(target_le, open(os.path.join(MODEL_DIR, "target_encoder.pkl"), "wb"))
pickle.dump(le_dict, open(os.path.join(MODEL_DIR, "feature_encoders.pkl"), "wb"))

print("\nMODEL TRAINED & SAVED SUCCESSFULLY")