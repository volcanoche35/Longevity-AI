"""BodyParts3D (CC BY 4.0) -> mobil GLB. Kullanım: python3 scripts/build-anatomy-glb.py
Birimler mm -> cm. Decimation sonrası fix_normals ÇAĞRILMAZ."""
import zipfile, io, json, collections, os
import numpy as np, trimesh

D = '/root/.hermes/cache/scratch/'
OUT = '/root/longevity/public/anatomy/3d/glb/'
os.makedirs(OUT, exist_ok=True)
m = collections.defaultdict(set)
for f in ['partof', 'isa']:
    for l in open(D + f + '_element_parts.txt'):
        p = l.rstrip('\n').split('\t')
        if len(p) == 3:
            m[(f, p[1])].add(p[2])

def ids(*names):
    s = set()
    for n in names:
        s |= m[('partof', n)] | m[('isa', n)]
    return sorted(s)

SPEC = {  # slug: (FJ ids, budget)
    'skin': (['FJ2810'], 4000),
    'brain': (ids('brain'), 5000),
    'lungs': (ids('right lung', 'left lung'), 5000),
    'heart': (ids('heart'), 4000),
    'liver': (ids('liver'), 4500),
    'gallbladder': (ids('gallbladder'), 900),
    'stomach': (ids('stomach'), 1000),
    'pancreas': (ids('pancreas'), 1600),
    'spleen': (ids('spleen'), 900),
    'kidneys': (ids('right kidney', 'left kidney'), 1400),
    'adrenals': (ids('right adrenal gland', 'left adrenal gland'), 900),
    'small-intestine': (ids('small intestine'), 2200),
    'large-intestine': (ids('large intestine'), 2200),
    'bladder': (ids('urinary bladder'), 900),
    'prostate': (ids('prostate'), 900),
}
zs = {n: zipfile.ZipFile(D + n + '_BP3D_4.0_obj_99.zip') for n in ['partof', 'isa']}
index = {n: {os.path.basename(x)[:-4]: x for x in z.namelist() if x.endswith('.obj')} for n, z in zs.items()}

def load(fj):
    for n in ['partof', 'isa']:
        if fj in index[n]:
            return trimesh.load(io.BytesIO(zs[n].read(index[n][fj])), file_type='obj', force='mesh', process=False)
    return None

report = {}
for slug, (fjs, budget) in SPEC.items():
    parts = [x for x in (load(f) for f in fjs) if x is not None and len(x.faces)]
    mesh = trimesh.util.concatenate(parts)
    mesh.merge_vertices()
    mesh.apply_scale(0.1)  # mm -> cm
    before = len(mesh.faces)
    if before > budget:
        mesh = mesh.simplify_quadric_decimation(face_count=budget)
    mesh.export(OUT + slug + '.glb')
    b = mesh.bounds
    report[slug] = dict(fj=len(fjs), parts=len(parts), faces_before=before, faces=len(mesh.faces),
                        min=b[0].round(2).tolist(), max=b[1].round(2).tolist(),
                        kb=round(os.path.getsize(OUT + slug + '.glb') / 1024, 1))
    print(slug, report[slug], flush=True)

sk = np.array([report['skin']['min'], report['skin']['max']])
print('--- skin kapsama')
for s, r in report.items():
    if s == 'skin':
        continue
    ok = (np.array(r['min']) >= sk[0]).all() and (np.array(r['max']) <= sk[1]).all()
    print(s, 'center', ((np.array(r['min']) + np.array(r['max'])) / 2).round(1).tolist(), 'INSIDE' if ok else 'OUTSIDE')
json.dump(report, open(OUT + '../report.json', 'w'), indent=1)
