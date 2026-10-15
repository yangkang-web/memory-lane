"""Convert DJMaesen FPS arms legacy glTF specular/gloss to metallic/roughness.
Usage: python3 scripts/art/convert-story-arms.py source.glb output.glb
Preserves geometry, skin weights, 2K maps and embedded CC BY attribution.
"""
import json,struct,sys
p,output=sys.argv[1:]
b=open(p,'rb').read();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);tail=b[20+n:]
for m in d['materials']:
 s=m.pop('extensions',{}).get('KHR_materials_pbrSpecularGlossiness',{})
 m['pbrMetallicRoughness']={'baseColorTexture':s['diffuseTexture'],'metallicFactor':0,'roughnessFactor':.86}
 m['name']='DJMaesen / worn fabric and fingerless gloves'
for k in ['extensionsUsed','extensionsRequired']:
 if k in d:d[k]=[x for x in d[k] if x!='KHR_materials_pbrSpecularGlossiness']
s=json.dumps(d,separators=(',',':')).encode();s+=b' '*((-len(s))%4)
open(output,'wb').write(struct.pack('<III',0x46546c67,2,12+8+len(s)+len(tail))+struct.pack('<II',len(s),0x4e4f534a)+s+tail)
