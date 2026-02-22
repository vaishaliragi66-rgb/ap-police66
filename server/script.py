from pymongo import MongoClient

client = MongoClient("mongodb+srv://VaishnaviTandra:VaishnaviTandra171431@cluster0.baf7wyg.mongodb.net/test?retryWrites=true&w=majority")
db = client["test"]

print(db.list_collection_names())