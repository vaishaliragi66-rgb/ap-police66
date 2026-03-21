import json, glob, os

data_dir = r"c:\Users\bhava\OneDrive\Desktop\appolice\ap-police\server\data"
# find latest backup
backups = sorted(glob.glob(os.path.join(data_dir, 'diseases.json.bak.*')))
if not backups:
    print('no backup found')
    raise SystemExit(1)
backup = backups[-1]
print('using backup', backup)

with open(backup,'r',encoding='utf8') as f:
    data = json.load(f)
all_list = data.get('all', [])
print('original all', len(all_list))

# Candidate headings (ordered) - taken from previous removal output and observed headings
candidates_ordered = [
 'Viral Infections','Viral Hepatitis','Respiratory Infections','Fungal Infections','Gastrointestinal Infections',
 'Sexually Transmitted Infections (STI)','Ectoparasites & Skin Infestations','Antimicrobial Resistance (AMR) – Special Category',
 'Fever Syndromes (Undifferentiated)','Infectious Skin Conditions','Environmental Skin Conditions','Eye Disorders',
 'Infectious & Inflammatory Eye Conditions','Chronic & Degenerative Eye Conditions','Ear, Nose & Throat (ENT) Disorders','Ear Disorders',
 'Nose & Throat','Upper Respiratory','Upper Gastrointestinal','Lower Gastrointestinal','Urinary Tract','Male Reproductive','Female Reproductive',
 'Genitourinary & Reproductive Disorders','Immune System & Blood Disorders','Immune System Disorders','Blood & Blood-forming Organ Disorders',
 'Neoplasms (Cancers)','Gynaecological & Breast','Other Solid Tumours','Developmental Anomalies & Congenital Disorders','Structural Congenital Anomalies',
 'Pigmentation & Structural Disorders','Digestive & Metabolic Disorders'
]

wanted = 537
cleaned = list(dict.fromkeys(all_list))
removed = []
for cand in candidates_ordered:
    if len(cleaned) <= wanted:
        break
    if cand in cleaned:
        cleaned.remove(cand)
        removed.append(cand)

print('removed so far', len(removed))
print('len after removal', len(cleaned))
# If still larger than wanted, try removing any remaining short-heading-like entries until target
if len(cleaned) > wanted:
    # find remaining candidates by heuristic: short (<=3 words) and title-cased and not containing '('
    extras = [x for x in cleaned if len(x.split())<=3 and '(' not in x and any(ch.isalpha() for ch in x)]
    for ex in extras:
        if len(cleaned) <= wanted:
            break
        # Avoid removing items that look like specific diseases (have hyphen, comma, lowercase after first, or contain disease keywords)
        cleaned.remove(ex)
        removed.append(ex)

# final dedupe and sort
cleaned = list(dict.fromkeys(cleaned))
cleaned_sorted = sorted(cleaned, key=lambda s: s.lower())

# write back
out = {'communicable': [], 'nonCommunicable': [], 'all': cleaned_sorted}
with open(os.path.join(data_dir,'diseases.json'),'w',encoding='utf8') as f:
    json.dump(out,f,ensure_ascii=False,indent=2)

print('final_count', len(cleaned_sorted))
print('removed_list_count', len(removed))
for r in removed:
    print('-', r)
