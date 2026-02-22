import pandas as pd
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv
# 1. Read Excel file
df = pd.read_csv(r"C:\Users\GNANA SRIHASA\OneDrive\Desktop\emloyees.csv")

# 2. Connect to MongoDB

client = MongoClient("mongodb+srv://VaishnaviTandra:VaishnaviTandra171431@cluster0.baf7wyg.mongodb.net/test?retryWrites=true&w=majority")

db = client["test"]   # Your database name (I see you're using "test")
collection = db["employees"]
# 3. Convert each row to required schema format
data_to_insert = []

for _, row in df.iterrows():
    employee = {
        "ABS_NO": str(row["ABS_NO"]).strip(),
        "Name": row["Name"],
        "Email": row["Email"].lower(),
        "Password": row["Password"],  # already hashed? if not, you must hash
        "Designation": row["Designation"],
        "DOB": pd.to_datetime(row["DOB"]),
        "Gender": row["Gender"],
        "Blood_Group": row.get("Blood_Group", ""),
        "Height": str(row["Height"]),
        "Weight": str(row["Weight"]),
        "Phone_No": str(row["Phone_No"]),
        "Photo": row.get("Photo", ""),

        "Address": {
            "Street": row["Street"],
            "District": row["District"],
            "State": row["State"],
            "Pincode": str(row["Pincode"])
        },

        "FamilyMembers": [],   # leave empty if not provided
        "Medical_History": []  # leave empty initially
    }

    data_to_insert.append(employee)

# 4. Insert into MongoDB
collection.insert_one(data_to_insert[0])

print("Data inserted successfully.")