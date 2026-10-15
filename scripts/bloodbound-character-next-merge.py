"""Attach the reviewed groom while preserving the approved body buffers."""
import argparse
import copy
import hashlib
import json
import math
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/bloodbound/characters'


def read_glb(path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from('<4sII', raw)
    if magic != b'glTF' or version != 2 or length != len(raw):
        raise ValueError(f'Invalid GLB: {path}')
    count, kind = struct.unpack_from('<I4s', raw, 12)
    if kind != b'JSON':
        raise ValueError('Expected the JSON chunk first')
    document = json.loads(raw[20:20 + count])
    size, kind = struct.unpack_from('<I4s', raw, 20 + count)
    if kind != b'BIN\0':
        raise ValueError('Expected one embedded binary chunk')
    return document, raw[28 + count:28 + count + size], raw


def write_glb(path, document, binary):
    document['buffers'] = [{'byteLength': len(binary)}]
    text = json.dumps(document, separators=(',', ':')).encode()
    text += b' ' * (-len(text) % 4)
    binary += b'\0' * (-len(binary) % 4)
    raw = struct.pack('<4sII', b'glTF', 2, 28 + len(text) + len(binary))
    raw += struct.pack('<I4s', len(text), b'JSON') + text
    raw += struct.pack('<I4s', len(binary), b'BIN\0') + binary
    path.write_bytes(raw)
    return hashlib.sha256(raw).hexdigest()


def identity():
    return [[float(i == k) for k in range(4)] for i in range(4)]


def multiply(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def world_matrices(document):
    parents = {child: i for i, node in enumerate(document['nodes']) for child in node.get('children', [])}
    result = {}

    def world(index):
        if index in result:
            return result[index]
        node = document['nodes'][index]
        if 'matrix' in node:
            local = [[node['matrix'][column * 4 + row] for column in range(4)] for row in range(4)]
        else:
            x, y, z, w = node.get('rotation', [0, 0, 0, 1])
            scale = node.get('scale', [1, 1, 1])
            local = [
                [1 - 2*y*y - 2*z*z, 2*x*y - 2*z*w, 2*x*z + 2*y*w, 0],
                [2*x*y + 2*z*w, 1 - 2*x*x - 2*z*z, 2*y*z - 2*x*w, 0],
                [2*x*z - 2*y*w, 2*y*z + 2*x*w, 1 - 2*x*x - 2*y*y, 0],
                [0, 0, 0, 1],
            ]
            for row in range(3):
                for column in range(3):
                    local[row][column] *= scale[column]
                local[row][3] = node.get('translation', [0, 0, 0])[row]
        result[index] = multiply(world(parents[index]), local) if index in parents else local
        return result[index]

    for index in range(len(document['nodes'])):
        world(index)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--body', type=Path, default=ASSETS / 'lucien-next-candidate.glb')
    parser.add_argument('--hair', type=Path, default=ASSETS / 'lucien-hair-only.glb')
    parser.add_argument('--hair-info', type=Path, default=ASSETS / 'lucien-hair-option.json')
    parser.add_argument('--scalp-map', type=Path, default=ASSETS / 'lucien-scalp-remap.json')
    parser.add_argument('--output', type=Path, default=ASSETS / 'lucien-next-combined.glb')
    args = parser.parse_args()
    if args.output.resolve() in {args.body.resolve(), args.hair.resolve()}:
        raise ValueError('Keep the reviewed component files unchanged')
    body, body_binary, body_raw = read_glb(args.body)
    donor, donor_binary, donor_raw = read_glb(args.hair)
    body_manifest = json.loads(args.body.with_suffix('.json').read_text())
    if body_manifest['sha256'] != hashlib.sha256(body_raw).hexdigest():
        raise ValueError('The body changed since its manifest was generated')
    original_body = copy.deepcopy(body)
    output = bytearray(body_binary)
    maps = {name: {} for name in ['bufferViews', 'accessors', 'samplers', 'images', 'textures', 'materials']}

    def add(kind, index):
        if index in maps[kind]:
            return maps[kind][index]
        item = copy.deepcopy(donor[kind][index])
        if kind == 'bufferViews':
            start = item.get('byteOffset', 0)
            output.extend(b'\0' * (-len(output) % 4))
            item['byteOffset'] = len(output)
            item['buffer'] = 0
            output.extend(donor_binary[start:start + item['byteLength']])
        elif kind == 'accessors':
            if 'bufferView' in item:
                item['bufferView'] = add('bufferViews', item['bufferView'])
            if 'sparse' in item:
                for name in ['indices', 'values']:
                    item['sparse'][name]['bufferView'] = add('bufferViews', item['sparse'][name]['bufferView'])
        elif kind == 'images':
            if 'uri' in item:
                raise ValueError('The groom must embed its image data')
            item['bufferView'] = add('bufferViews', item['bufferView'])
        elif kind == 'textures':
            if 'source' in item:
                item['source'] = add('images', item['source'])
            if 'sampler' in item:
                item['sampler'] = add('samplers', item['sampler'])
            for extension in item.get('extensions', {}).values():
                if 'source' in extension:
                    extension['source'] = add('images', extension['source'])
        elif kind == 'materials':
            def replace_textures(value):
                for key, child in value.items():
                    if isinstance(child, dict):
                        if key.endswith('Texture') and 'index' in child:
                            child['index'] = add('textures', child['index'])
                        replace_textures(child)
            replace_textures(item)
        destination = body.setdefault(kind, [])
        result = len(destination)
        destination.append(item)
        maps[kind][index] = result
        return result

    body_by_name = {node.get('name'): index for index, node in enumerate(body['nodes'])}
    donor_nodes = [(i, node) for i, node in enumerate(donor['nodes']) if node.get('name') == 'LucienAuthoredCurlyHair']
    if len(donor_nodes) != 1:
        raise ValueError('Expected exactly one reviewed authored groom')
    donor_index, donor_node = donor_nodes[0]
    body_world, donor_world = world_matrices(body), world_matrices(donor)
    donor_skin = copy.deepcopy(donor['skins'][donor_node['skin']])
    mapped_joints, max_rest_difference = [], 0
    for index in donor_skin['joints']:
        name = donor['nodes'][index].get('name')
        if name not in body_by_name:
            raise ValueError(f'Missing body joint: {name}')
        mapped = body_by_name[name]
        max_rest_difference = max(max_rest_difference, max(abs(body_world[mapped][r][c] - donor_world[index][r][c]) for r in range(4) for c in range(4)))
        mapped_joints.append(mapped)
    if max_rest_difference > 0.0001:
        raise ValueError(f'Groom/body rest transforms differ: {max_rest_difference}')
    donor_skin['joints'] = mapped_joints
    donor_skin['inverseBindMatrices'] = add('accessors', donor_skin['inverseBindMatrices'])
    donor_skin['name'] = 'LucienGroomSharedBodyJoints'
    if 'skeleton' in donor_skin:
        donor_skin['skeleton'] = body_by_name[donor['nodes'][donor_skin['skeleton']]['name']]
    skin_index = len(body['skins'])
    body['skins'].append(donor_skin)

    groom_mesh = copy.deepcopy(donor['meshes'][donor_node['mesh']])
    for primitive in groom_mesh['primitives']:
        primitive['attributes'] = {key: add('accessors', value) for key, value in primitive['attributes'].items()}
        if 'indices' in primitive:
            primitive['indices'] = add('accessors', primitive['indices'])
        if 'material' in primitive:
            primitive['material'] = add('materials', primitive['material'])
        for target in primitive.get('targets', []):
            for key in target:
                target[key] = add('accessors', target[key])
    mesh_index = len(body['meshes'])
    body['meshes'].append(groom_mesh)
    matrix = donor_world[donor_index]
    node = {'name': 'LucienAuthoredCurlyHair', 'mesh': mesh_index, 'skin': skin_index,
            'matrix': [matrix[row][column] for column in range(4) for row in range(4)]}
    node_index = len(body['nodes'])
    body['nodes'].append(node)
    body['scenes'][body.get('scene', 0)]['nodes'].append(node_index)

    removed = 0
    for mesh in body['meshes'][:-1]:
        kept = []
        for primitive in mesh['primitives']:
            name = body['materials'][primitive.get('material', 0)].get('name', '')
            if 'm154_opacity' in name:
                removed += 1
            else:
                kept.append(primitive)
        mesh['primitives'] = kept
    if removed != 1:
        raise ValueError(f'Expected one old hair primitive, removed {removed}')
    scalp_mesh_index = None
    scalp_record = None
    if args.scalp_map:
        scalp_record = json.loads(args.scalp_map.read_text())
        if scalp_record['sourceSha256'] != hashlib.sha256(body_raw).hexdigest():
            raise ValueError('Scalp face indices refer to another body version')
        candidates = [(i, mesh) for i, mesh in enumerate(body['meshes'][:-1]) if mesh.get('name') == scalp_record['sourceMeshName']]
        if len(candidates) != 1:
            raise ValueError('Scalp mesh name is ambiguous or missing')
        scalp_mesh_index, scalp_mesh = candidates[0]
        candidates = [(i, primitive) for i, primitive in enumerate(scalp_mesh['primitives']) if body['materials'][primitive.get('material', 0)].get('name') == scalp_record['sourceMaterialName']]
        if len(candidates) != 1:
            raise ValueError('Scalp material is ambiguous or missing')
        primitive_index, original_primitive = candidates[0]
        accessor = body['accessors'][original_primitive['indices']]
        formats = {5121: ('B', 1), 5123: ('H', 2), 5125: ('I', 4)}
        fmt, size = formats[accessor['componentType']]
        view = body['bufferViews'][accessor['bufferView']]
        start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        stride = view.get('byteStride', size)
        indices = [struct.unpack_from('<' + fmt, output, start + i * stride)[0] for i in range(accessor['count'])]
        selected = set(scalp_record['triangleIndices'])
        if not selected or min(selected) < 0 or max(selected) >= len(indices) // 3:
            raise ValueError('Scalp triangle indices are invalid')
        scalp, face = [], []
        for index in range(len(indices) // 3):
            (scalp if index in selected else face).extend(indices[index*3:index*3+3])

        def new_indices(values):
            output.extend(b'\0' * (-len(output) % 4))
            offset = len(output)
            output.extend(struct.pack('<' + fmt * len(values), *values))
            view_index = len(body['bufferViews'])
            body['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(values) * size, 'target': 34963})
            index = len(body['accessors'])
            body['accessors'].append({'bufferView': view_index, 'componentType': accessor['componentType'], 'count': len(values), 'type': 'SCALAR', 'min': [min(values)], 'max': [max(values)]})
            return index

        scalp_primitive = copy.deepcopy(original_primitive)
        original_primitive['indices'] = new_indices(face)
        scalp_primitive['indices'] = new_indices(scalp)
        scalp_primitive['material'] = len(body['materials'])
        material = copy.deepcopy(scalp_record.get('replacementMaterial', {
            'name': 'LucienGroomScalpUnderlay',
            'pbrMetallicRoughness': {'baseColorFactor': [.006, .007, .009, 1], 'metallicFactor': 0, 'roughnessFactor': .94},
        }))
        if any(key.endswith('Texture') for key in material.get('pbrMetallicRoughness', {})):
            raise ValueError('Scalp override must not introduce unmapped textures')
        body['materials'].append(material)
        scalp_mesh['primitives'].insert(primitive_index + 1, scalp_primitive)
        for key in ['attributes', 'targets', 'mode']:
            if scalp_primitive.get(key) != original_primitive.get(key):
                raise AssertionError('Scalp split changed vertex or facial data')
    for key in ['extensionsUsed', 'extensionsRequired']:
        if key in donor:
            body[key] = list(dict.fromkeys(body.get(key, []) + donor[key]))
    if output[:len(body_binary)] != body_binary:
        raise AssertionError('Body binary data changed')
    for key in ['accessors', 'bufferViews']:
        if body[key][:len(original_body[key])] != original_body[key]:
            raise AssertionError(f'Body {key} changed')
    for index, mesh in enumerate(original_body['meshes']):
        expected = [primitive for primitive in mesh['primitives'] if 'm154_opacity' not in original_body['materials'][primitive.get('material', 0)].get('name', '')]
        if index != scalp_mesh_index and body['meshes'][index]['primitives'] != expected:
            raise AssertionError('A non-hair body primitive changed')

    digest = write_glb(args.output, body, bytes(output))
    manifest = body_manifest
    hair_manifest = json.loads(args.hair_info.read_text())
    manifest.update({
        'asset': args.output.name, 'file': '/assets/bloodbound/characters/' + args.output.name,
        'sha256': digest, 'bytes': args.output.stat().st_size,
        'license': 'Component licenses: MIT body; CC BY-SA derived groom (original publication does not state a version)',
        'componentLicenses': [
            {'component': 'Rocketbox body, rig, clothing and source textures', 'license': 'MIT', 'notice': 'LICENSE-Microsoft-Rocketbox.md'},
            {'component': 'Derived authored groom geometry', 'author': 'Daniel Bystedt', 'license': 'CC BY-SA, version unspecified by original publication', 'source': hair_manifest['hairSource']},
            {'component': 'Head atlas enhancement', 'source': 'User-authorized company Kaon image edit; underlying Rocketbox atlas MIT'},
        ],
        'bodyInputSha256': hashlib.sha256(body_raw).hexdigest(),
        'hairInputSha256': hashlib.sha256(donor_raw).hexdigest(),
        'bodyBuffersPreserved': True, 'maxJointRestTransformDifference': max_rest_difference,
        'scalpMaterialSplit': scalp_record,
        'gltfMeshes': len(body['meshes']), 'gltfPrimitives': sum(len(mesh['primitives']) for mesh in body['meshes']),
        'gltfJoints': len(set(joint for skin in body['skins'] for joint in skin['joints'])),
        'hair': hair_manifest,
        'status': 'combined candidate awaiting church close-up art review',
        'limitations': ['Stock avatar likeness; not an identity reconstruction of P1.', 'Derived groom appearance and cinematic shoulder motion need final scene acceptance.'],
    })
    components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
    def accessor_count(primitive, name):
        return body['accessors'][primitive['attributes'][name]]['count']
    manifest['renderVertices'] = sum(accessor_count(primitive, 'POSITION') for mesh in body['meshes'] for primitive in mesh['primitives'])
    manifest['triangles'] = sum(body['accessors'][primitive['indices']]['count'] // 3 for mesh in body['meshes'] for primitive in mesh['primitives'])
    manifest.pop('vertices', None)
    manifest['morphTargets'] = list(dict.fromkeys(name for mesh in body['meshes'] for name in mesh.get('extras', {}).get('targetNames', [])))
    if len(manifest['morphTargets']) != 68:
        raise ValueError('Expected all 68 facial and canine controls')
    for accessor in body['accessors']:
        if accessor['componentType'] != 5126:
            continue
        reads = []
        if 'bufferView' in accessor:
            reads.append((accessor['bufferView'], accessor.get('byteOffset', 0), accessor['count']))
        if 'sparse' in accessor:
            sparse = accessor['sparse']
            reads.append((sparse['values']['bufferView'], sparse['values'].get('byteOffset', 0), sparse['count']))
        for view_index, offset, count in reads:
            view = body['bufferViews'][view_index]
            width = components[accessor['type']]
            stride = view.get('byteStride', width * 4)
            start = view.get('byteOffset', 0) + offset
            for index in range(count):
                if not all(math.isfinite(value) for value in struct.unpack_from('<' + 'f' * width, output, start + stride * index)):
                    raise ValueError('Non-finite geometry or morph value')
    manifest['finiteGeometryVerified'] = True
    args.output.with_suffix('.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    anchors = json.loads((ASSETS / 'lucien-face-anchors.json').read_text())
    anchors.update({'asset': args.output.name, 'sha256': digest, 'bodyBuffersPreserved': True})
    args.output.with_name(args.output.stem + '-anchors.json').write_text(json.dumps(anchors, indent=2) + '\n')
    print(json.dumps({key: manifest[key] for key in ['asset', 'sha256', 'bytes', 'renderVertices', 'triangles', 'bodyBuffersPreserved', 'maxJointRestTransformDifference']}, indent=2))


if __name__ == '__main__':
    main()
