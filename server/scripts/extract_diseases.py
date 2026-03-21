import zipfile
import xml.etree.ElementTree as ET
import os

DOCX_PATH = r"C:\Users\bhava\OneDrive\Documents\AP_Police_Disease_List_CD_NCD.docx"
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
OUT_FILE = os.path.join(OUT_DIR, 'diseases.json')

os.makedirs(OUT_DIR, exist_ok=True)

def extract_text_from_docx(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        with z.open('word/document.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            # Word XML uses namespaces; find default namespace
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = []
            for p in root.findall('.//w:p', ns):
                texts = [t.text for t in p.findall('.//w:t', ns) if t is not None and t.text]
                if texts:
                    paragraphs.append(''.join(texts).strip())
            return paragraphs


def split_into_sections(paragraphs):
    comm = []
    nonc = []
    current = None
    for line in paragraphs:
        if not line:
            continue
        up = line.strip().upper()
        if 'COMMUNICABLE' in up and 'NON' not in up:
            current = 'comm'
            continue
        if 'NON-COMMUNICABLE' in up or 'NON COMMUNICABLE' in up or 'NONCOMMUNICABLE' in up:
            current = 'non'
            continue
        # skip obvious headings
        if any(h in up for h in ['DISEASE', 'LIST', 'CD', 'NCD', 'S.NO', 'S. NO']):
            # ignore heading-ish lines
            continue
        # if we haven't seen a section yet, try to heuristically assign
        if current is None:
            # if line contains words like Diabetes/Hypertension -> non-communicable
            if any(k in up for k in ['DIABETES','HYPERTENSION','CARDI','HEART','CANCER','OBESITY','STROKE','DIABETES']):
                current = 'non'
            else:
                # default to comm if common infectious terms
                if any(k in up for k in ['TUBERCULOSIS','MALARIA','DENGUE','COVID','CHOLERA','TYPHOID']):
                    current = 'comm'
                else:
                    # if still unsure, add to non by default
                    current = 'non'
        # sometimes lines are like "1. Tuberculosis"
        # strip leading numbering
        item = line.strip()
        # remove leading numbering
        import re
        item = re.sub(r'^\s*\d+\.?\s*-?\s*', '', item)
        # remove trailing punctuation
        item = item.rstrip(' .,-')
        if not item:
            continue
        # filter out non-disease headings and programmatic entries
        exclude_keywords = [
            'surveillance', 'monitoring', 'vaccination', 'routine health', 'fitness for duty',
            'pre-employment', 'periodic medical', 'occupational', 'preventive & occupational',
            'region-specific', 'lifestyle', 'tobacco', 'alcohol use', 'sedentary lifestyle',
            'unhealthy diet', 'occupational stress', 'health surveillance', 'fitness for duty assessment',
            'vaccination status', 'routine health checkups', 'preventive & occupational health',
            'andhra pradesh', 'public health', 'surveillance &', 'surveillance –', 'surveillance -',
            'surveillance (', 'surveillance:', 'surveillance,'
        ]

        low = item.lower()
        if any(k in low for k in exclude_keywords):
            continue

        if current == 'comm':
            comm.append(item)
        else:
            nonc.append(item)
    return comm, nonc

if __name__ == '__main__':
    try:
        paras = extract_text_from_docx(DOCX_PATH)
        comm, nonc = split_into_sections(paras)
        import json
        out = {
            'communicable': comm,
            'nonCommunicable': nonc,
            'all': list(dict.fromkeys(comm + nonc))
        }
        with open(OUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print('Wrote', OUT_FILE)
    except Exception as e:
        print('Error:', e)
