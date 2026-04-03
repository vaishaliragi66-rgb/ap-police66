import sys
import json
from mlModel import predict

data = json.loads(sys.argv[1])

features = [
    float(data["age"]),
    int(data["gender"]),
    int(data["designation"]),
    float(data["bmi"]),
    float(data["temperature"]),
    float(data["pulse"]),
    float(data["systolic_bp"]),
    float(data["diastolic_bp"]),
    int(data["comorbidity_count"])
]

result = predict(features)

print(json.dumps(result))   # clean output (no "RESULT:" nonsense)