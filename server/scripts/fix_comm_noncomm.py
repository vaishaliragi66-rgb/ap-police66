import json, glob, os

data_dir = r"c:\Users\bhava\OneDrive\Desktop\appolice\ap-police\server\data"
# find latest backup
backups = sorted(glob.glob(os.path.join(data_dir, 'diseases.json.bak.*')))
if not backups:
    print('no backup')
    raise SystemExit(1)
backup = backups[-1]
with open(backup,'r',encoding='utf8') as f:
    orig = json.load(f)
with open(os.path.join(data_dir,'diseases.json'),'r',encoding='utf8') as f:
    cur = json.load(f)
final_all = cur.get('all', [])
comm = [x for x in orig.get('communicable', []) if x in final_all]
noncomm = [x for x in orig.get('nonCommunicable', []) if x in final_all]

out = {
    'communicable': sorted(comm, key=lambda s: s.lower()),
    'nonCommunicable': sorted(noncomm, key=lambda s: s.lower()),
    'all': final_all
}
with open(os.path.join(data_dir,'diseases.json'),'w',encoding='utf8') as f:
    json.dump(out,f,ensure_ascii=False,indent=2)

print('written counts', len(out['all']), len(out['communicable']), len(out['nonCommunicable']))
