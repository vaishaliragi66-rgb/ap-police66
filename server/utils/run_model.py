import sys
import json
from mlModel import predict

data = json.loads(sys.argv[1])

features = [
    float(data["age"]),
    int(data["gender"]),
    float(data["bmi"]),
    int(data["fever"]),
    int(data["high_pulse"])
]

result = predict(features)

print(result)   # clean output (no "RESULT:" nonsense)