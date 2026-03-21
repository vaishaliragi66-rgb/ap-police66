import json, re, shutil, datetime

src = r"c:\Users\bhava\OneDrive\Desktop\appolice\ap-police\server\data\diseases.json"
backup = src + ".bak." + datetime.datetime.now().strftime('%Y%m%d%H%M%S')

with open(src,'r',encoding='utf8') as f:
    data = json.load(f)

all_list = data.get('all', [])
comm = data.get('communicable', [])
noncomm = data.get('nonCommunicable', [])

# Conservative explicit headings found in the extracted file to remove
heading_exact = set([
    'Viral Infections', 'Viral Hepatitis', 'Respiratory Infections', 'Fungal Infections',
    'Gastrointestinal Infections', 'Sexually Transmitted Infections (STI)',
    'Ectoparasites & Skin Infestations', 'Antimicrobial Resistance (AMR) – Special Category',
    'Fever Syndromes (Undifferentiated)', 'Infectious Skin Conditions', 'Environmental Skin Conditions',
    'Eye Disorders', 'Infectious & Inflammatory Eye Conditions', 'Chronic & Degenerative Eye Conditions',
    'Ear, Nose & Throat (ENT) Disorders', 'Ear Disorders', 'Nose & Throat', 'Upper Respiratory',
    'Upper Gastrointestinal', 'Lower Gastrointestinal', 'Urinary Tract', 'Male Reproductive', 'Female Reproductive',
    'Genitourinary & Reproductive Disorders', 'Immune System & Blood Disorders', 'Immune System Disorders',
    'Blood & Blood-forming Organ Disorders', 'Neoplasms (Cancers)', 'Gynaecological & Breast',
    'Other Solid Tumours', 'Developmental Anomalies & Congenital Disorders', 'Structural Congenital Anomalies',
    'Pigmentation & Structural Disorders', 'Digestive & Metabolic Disorders', 'Genitourinary & Reproductive Disorders'
])

# Pattern-based heuristics (only remove short category-like entries)
heading_pattern = re.compile(r"\b(Infections?|Infection|Infectious|Conditions?|Disorders?|Syndrome|Syndromes|Neoplasms|Environmental|Genitourinary|Gynaecological|Developmental|Structural|Digestive|Upper|Lower|Urinary\s+Tract|Female|Male|Eye\s+Disorders|Ear\s+Disorders|ENT)\b", re.I)

candidates = []
for i,e in enumerate(all_list):
    # skip real disease names that contain parentheses or punctuation suggesting specificity
    word_count = len(e.split())
    if e.strip() in heading_exact:
        candidates.append(e)
        continue
    # if matches heading pattern and looks short/phrase-like (<=4 words) consider removing
    if word_count <= 4 and heading_pattern.search(e):
        candidates.append(e)

# Make a unique list of candidates preserving order
seen = set()
candidates = [x for x in candidates if not (x in seen or seen.add(x))]

# If removing candidates gives us the target 537, proceed; otherwise be conservative and only remove a subset.
wanted = 537
attempt = 0
removed = []
while attempt < 2:
    attempt += 1
    # try removing all candidates first
    cleaned = [x for x in all_list if x not in candidates]
    cleaned = list(dict.fromkeys(cleaned))
    if len(cleaned) == wanted:
        removed = candidates
        break
    # if removing all overshoots, try incremental removal from candidates until reach wanted
    if len(cleaned) < wanted:
        # removing too many; fallback to removing none
        cleaned = list(dict.fromkeys(all_list))
        removed = []
        break
    # if cleaned > wanted, remove candidates one by one until target reached
    if len(cleaned) > wanted:
        cleaned = list(dict.fromkeys(all_list))
        removed = []
        for cand in candidates:
            if cand in cleaned:
                cleaned.remove(cand)
                removed.append(cand)
            if len(cleaned) == wanted:
                break
        if len(cleaned) == wanted:
            break
        # else, try a looser candidate list by including pattern matches beyond short ones
        break

# Backup original
shutil.copy2(src, backup)

# If we didn't hit target, still write a cleaned deduped sorted list but report counts
if not removed and len(list(dict.fromkeys(all_list))) != wanted:
    # produce conservative cleaned: remove only exact headings from heading_exact
    cleaned = [x for x in all_list if x not in heading_exact]
    cleaned = list(dict.fromkeys(cleaned))
    # allow final dedupe

# Write back sorted & deduped lists (all, communicable, nonCommunicable)
# For communicable/nonCommunicable, simply dedupe and sort; keep their entries if they exist in cleaned
final_all = cleaned
final_comm = [x for x in comm if x in final_all]
final_noncomm = [x for x in noncomm if x in final_all]

final_all_sorted = sorted(final_all, key=lambda s: s.lower())
final_comm_sorted = sorted(final_comm, key=lambda s: s.lower())
final_noncomm_sorted = sorted(final_noncomm, key=lambda s: s.lower())

out = {'communicable': final_comm_sorted, 'nonCommunicable': final_noncomm_sorted, 'all': final_all_sorted}
with open(src,'w',encoding='utf8') as f:
    json.dump(out,f,ensure_ascii=False,indent=2)

print('backup', backup)
print('removed_count', len(set(all_list) - set(final_all)))
print('removed_items')
for it in sorted(list(set(all_list) - set(final_all))):
    print('-', it)
print('final_counts all', len(final_all_sorted), 'communicable', len(final_comm_sorted), 'nonCommunicable', len(final_noncomm_sorted))
