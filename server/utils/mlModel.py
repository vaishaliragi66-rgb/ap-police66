import pickle

# load model
model_path = "./models/model.pkl"
encoder_path = "./models/target_encoder.pkl"
model = pickle.load(open(model_path, "rb"))
le = pickle.load(open(encoder_path, "rb"))
def predict(features):
    pred = model.predict([features])
    
    # convert back to label
    result = le.inverse_transform(pred)

    return result[0]