l = [c for c in df.columns if "season" in c][0]
season_encoder = LabelEncoder()
df[season_