import bpy
import bmesh
import math
import random
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree


def material(name, color, roughness=.65, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = metallic
    return mat


def mesh_object(name, vertices, faces, mat, rig, bone):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    ob.parent = rig
    group = ob.vertex_groups.new(name=bone)
    group.add(list(range(len(vertices))), 1, 'REPLACE')
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = rig
    for poly in mesh.polygons:
        poly.use_smooth = True
    return ob


def prepare_open_neck(body, suit):
    global chest_tree, chest_coordinates, chest_polygons, weight_tree, skin_weights
    index=body.vertex_groups['body'].index
    body_vertices={v.index for v in body.data.vertices if any(g.group==index and g.weight>.5 for g in v.groups)}
    weight_tree=KDTree(len(body_vertices));skin_weights={}
    bone_names={g.index:g.name for g in body.vertex_groups if g.name.startswith('mixamorig:')}
    for i in body_vertices:
        vertex=body.data.vertices[i];weight_tree.insert(vertex.co,i)
        skin_weights[i]={bone_names[g.group]:g.weight for g in vertex.groups if g.group in bone_names}
    weight_tree.balance()
    chest_coordinates=[v.co.copy() for v in body.data.vertices]
    chest_polygons=[list(p.vertices) for p in body.data.polygons if all(i in body_vertices for i in p.vertices)]
    chest_tree=BVHTree.FromPolygons(chest_coordinates,chest_polygons)
    shoulder = max(v.co.z for v in suit.data.vertices)
    top, bottom = shoulder-.043, shoulder-.158
    # Keep real chest skin; the replacement shirt defines the opening.
    for mod in body.modifiers:
        if mod.type == 'MASK' and mod.invert_vertex_group:
            group = body.vertex_groups.get(mod.vertex_group)
            group.add([v.index for v in body.data.vertices
                       if bottom-.045 < v.co.z < top+.10 and abs(v.co.x) < .14 and v.co.y < .04], 0, 'REPLACE')
    bm = bmesh.new(); bm.from_mesh(suit.data)
    uv=bm.loops.layers.uv.active
    bm.faces.ensure_lookup_table()
    parent=list(range(len(bm.faces)));edges={}
    def root(i):
        while parent[i]!=i:
            parent[i]=parent[parent[i]];i=parent[i]
        return i
    for face in bm.faces:
        for loop in face.loops:
            other=loop.link_loop_next
            edge=tuple(sorted(((loop.vert.index,tuple(round(v,4) for v in loop[uv].uv)),
                               (other.vert.index,tuple(round(v,4) for v in other[uv].uv)))))
            if edge in edges:parent[root(face.index)]=root(edges[edge])
            else:edges[edge]=face.index
    islands={}
    for face in bm.faces:islands.setdefault(root(face.index),[]).append(face)
    remove=[]
    for faces in islands.values():
        coords=[loop[uv].uv for face in faces for loop in face.loops]
        lo=min(p.x for p in coords);hi=max(p.x for p in coords);vlow=min(p.y for p in coords)
        # These two UV islands are the original shirt/tie and its back collar.
        if (500<len(faces)<550 and .345<lo<.355 and .48<hi<.495 and vlow>.81) or (130<len(faces)<155 and .325<lo<.335 and hi<.365):
            remove.extend(faces)
    assert len(remove)>600, ('shirt island detection',len(remove))
    bmesh.ops.delete(bm,geom=remove,context='FACES')
    bm.to_mesh(suit.data);bm.free()
    # The source texture includes a white shirt. Give those existing faces black fabric.
    mat=suit.data.materials[0]
    tex=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'diffuse' in n.image.name)
    black=material('Lucien original black shirt',(.018,.022,.027),.8)
    suit.data.materials.append(black)
    im=tex.image;width,height=im.size
    pixels=np.empty(width*height*4,dtype=np.float32);im.pixels.foreach_get(pixels)
    uv=suit.data.uv_layers.active.data
    for poly in suit.data.polygons:
        coords=[uv[i].uv for i in poly.loop_indices]
        u=sum(v.x for v in coords)/len(coords);v=sum(v.y for v in coords)/len(coords)
        i=(min(height-1,max(0,int(v*height)))*width+min(width-1,max(0,int(u*width))))*4
        if max(pixels[i:i+3])>.4:poly.material_index=1
    return bottom,top


def data_image(name, channels):
    height, width = channels.shape[:2]
    image = bpy.data.images.new(name, width=width, height=height, alpha=True)
    image.colorspace_settings.name = 'Non-Color'
    image.pixels.foreach_set(channels.astype(np.float32).reshape(-1))
    image.pack()
    return image


def surface_maps(mat, cloth=False):
    rng = np.random.default_rng(224 if cloth else 327)
    size = 512 if cloth else 1024
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    noise = rng.normal(0, 1, (size, size)).astype(np.float32)
    smooth = (noise + np.roll(noise, 1, 0) + np.roll(noise, -1, 0) + np.roll(noise, 1, 1) + np.roll(noise, -1, 1))/5
    if cloth:
        height = .035*np.sin(x*math.tau/2.7)*np.sin(y*math.tau/2.7)+.025*smooth
        roughness = .76+.025*smooth
    else:
        height = .12*smooth+.025*noise
        roughness = .47+.035*smooth
    dx = np.roll(height, -1, 1)-np.roll(height, 1, 1)
    dy = np.roll(height, -1, 0)-np.roll(height, 1, 0)
    length = np.sqrt(dx*dx+dy*dy+1)
    normal = np.stack((.5-.5*dx/length, .5-.5*dy/length, .5+.5/length, np.ones_like(x)), axis=-1)
    mr = np.stack((np.ones_like(x), np.clip(roughness, .32, .85), np.zeros_like(x), np.ones_like(x)), axis=-1)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bs = nodes.get('Principled BSDF')
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = data_image(mat.name+' micro normal', normal)
    n = nodes.new('ShaderNodeNormalMap')
    n.inputs['Strength'].default_value = .10 if cloth else .24
    links.new(tex.outputs['Color'], n.inputs['Color'])
    links.new(n.outputs['Normal'], bs.inputs['Normal'])
    packed = nodes.new('ShaderNodeTexImage')
    packed.image = data_image(mat.name+' roughness', mr)
    sep = nodes.new('ShaderNodeSeparateColor')
    links.new(packed.outputs['Color'], sep.inputs[0])
    links.new(sep.outputs['Green'], bs.inputs['Roughness'])
    links.new(sep.outputs['Blue'], bs.inputs['Metallic'])


def tube(vertices, faces, points, radius, sides=5, flatten=1, taper=True):
    start = len(vertices)
    for i, point in enumerate(points):
        tangent = (points[min(i+1, len(points)-1)]-points[max(i-1, 0)]).normalized()
        axis = tangent.cross(Vector((0, 1, 0)))
        if axis.length < .05:
            axis = tangent.cross(Vector((1, 0, 0)))
        axis.normalize()
        other = tangent.cross(axis).normalized()
        scale = max(.08, math.sin(math.pi*(.04+.94*i/(len(points)-1)))**.3) if taper else 1
        for j in range(sides):
            angle = math.tau*j/sides
            vertices.append(tuple(point+scale*radius*(axis*math.cos(angle)+other*math.sin(angle)*flatten)))
    for i in range(len(points)-1):
        for j in range(sides):
            a = start+i*sides+j
            b = start+i*sides+(j+1)%sides
            faces.append((a, b, b+sides, a+sides))


def hair_groom(hair, brows, rig):
    rng = random.Random(91)
    coords = [v.co for v in hair.data.vertices]
    top = max(v.z for v in coords)
    rx = max(abs(v.x) for v in coords)*.96
    min_y, max_y = min(v.y for v in coords), max(v.y for v in coords)
    cy = (min_y+max_y)/2
    ry = (max_y-min_y)*.48
    cz, rz = top-.106, .106
    for vertex in hair.data.vertices:
        front=max(0,min(1,(cy-vertex.co.y)/ry))
        lower=max(0,min(1,(top-.025-vertex.co.z)/.070))
        side=max(0,min(1,abs(vertex.co.x)/rx))
        vertex.co.z-=.016*front*lower+.011*side*lower
        vertex.co.y-=.004*front*lower
        vertex.co.x*=1+.05*side*lower
        direction=(vertex.co-Vector((0,cy,cz))).normalized()
        hit=chest_tree.ray_cast(Vector((0,cy,cz)),direction,.3)[0]
        if hit is not None and (vertex.co-Vector((0,cy,cz))).length<(hit-Vector((0,cy,cz))).length+.002:
            vertex.co=hit+direction*.002
    bm=bmesh.new();bm.from_mesh(hair.data)
    # Smooth only the visible frontal boundary, retaining the reviewed overall groom.
    boundary={v:[edge.other_vert(v) for edge in v.link_edges if edge.is_boundary]
              for v in bm.verts if any(edge.is_boundary for edge in v.link_edges)}
    for iteration in range(3):
        changes={}
        for vertex,neighbors in boundary.items():
            if len(neighbors)==2 and vertex.co.y<cy-.035 and cz+.015<vertex.co.z<top-.025 and abs(vertex.co.x)<rx*.85:
                point=vertex.co.lerp((neighbors[0].co+neighbors[1].co)/2,.45)
                direction=(point-Vector((0,cy,cz))).normalized()
                hit=chest_tree.ray_cast(Vector((0,cy,cz)),direction,.3)[0]
                if hit is not None and (point-Vector((0,cy,cz))).length<(hit-Vector((0,cy,cz))).length+.002:
                    point=hit+direction*.002
                changes[vertex]=point
        for vertex,point in changes.items():vertex.co=point
    bm.to_mesh(hair.data)
    tree=BVHTree.FromBMesh(bm)
    center=Vector((0,cy,cz))
    def scalp(theta, phi, lift=0):
        direction=Vector((rx*math.sin(theta)*math.sin(phi),
                          -ry*math.sin(theta)*math.cos(phi),rz*math.cos(theta))).normalized()
        origin=center.copy();outer=None
        for _ in range(12):
            hit=tree.ray_cast(origin,direction,.4)[0]
            if hit is None:break
            outer=hit;origin=hit+direction*.0002
        if outer is None:
            outer=center+Vector((rx*math.sin(theta)*math.sin(phi),
                                 -ry*math.sin(theta)*math.cos(phi),rz*math.cos(theta)))
        return outer+direction*lift
    vertices, faces = [], []
    for sign in [-1, 1]:
        for lock in range(11):
            along = lock/10
            start_theta = 1.19-along*1.08+rng.uniform(-.025,.025)
            end_phi = sign*(1.40+along*1.03)
            end_theta = 1.40+along*.25
            for strand in range(8):
                points = []
                lateral = (strand-3.5)*.012+rng.uniform(-.002,.002)
                for step in range(25):
                    t = step/24
                    theta = start_theta*(1-t)+end_theta*t-.24*math.sin(math.pi*t)
                    phi = sign*.025*(1-t)+end_phi*t**.82+lateral+sign*.027*math.sin(t*math.tau*1.6+lock*.7)*math.sin(math.pi*t)
                    lift = -.001+(.010+.002*math.sin(lock*.8))*math.sin(math.pi*t)+.0015*math.sin(t*math.tau*1.4+lock*.42)*math.sin(math.pi*t)
                    points.append(scalp(theta, phi, lift))
                tube(vertices, faces, points, .00030+rng.random()*.00015, sides=4, flatten=.65)
        # A few fine temple waves stop beside the eye instead of crossing it.
        for strand in range(9):
            points = []
            for step in range(26):
                t = step/25
                theta = 1.0+.65*t
                phi = sign*(.74+.31*t)+strand*.012*sign
                point = scalp(theta, phi, .004+.005*math.sin(math.pi*t))
                point.x += sign*.002*math.sin(t*math.tau*1.2)
                points.append(point)
            tube(vertices, faces, points, .00042, sides=5)
    # Five unequal front/temple locks change the silhouette without covering the eyes.
    for sign,count in [(-1,3),(1,2)]:
        for lock in range(count):
            along=lock/max(1,count-1)
            p0=scalp(.55+.27*along,sign*.07,.001)
            p1=scalp(.85+.08*along,sign*(.72+.13*along),.025)
            p2=scalp(1.40+.06*along,sign*(.85+.18*along),.022)
            p3=scalp(1.68+.10*along,sign*(1.10+.30*along),.003)+Vector((0,0,-.016))
            for strand in range(26):
                width=(strand/25-.5)*.014
                points=[]
                for step in range(33):
                    t=step/32
                    point=(1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t*t*p2+t**3*p3
                    point+=Vector((sign*width*.6, width*.35, width*.25))*math.sin(math.pi*t)
                    point.y+=.003*math.sin(t*math.tau*1.3+lock*.8)*math.sin(math.pi*t)
                    direction=(point-center).normalized();hit=tree.ray_cast(center,direction,.4)[0]
                    if hit is not None and (point-center).length<(hit-center).length+.001:
                        point=hit+direction*.001
                    points.append(point)
                tube(vertices,faces,points,.00025+rng.random()*.00008,sides=4,flatten=.65)
    bm.free()
    mat = material('Lucien layered black hair strands', (.012,.014,.017), .66)
    mesh_object('Lucien_HairStrands', vertices, faces, mat, rig, 'mixamorig:Head')
    # Real fine eyebrow hairs soften the alpha-card edge without a painted black band.
    vertices, faces = [], []
    for sign in [-1, 1]:
        samples = [v.co.copy() for v in brows.data.vertices if sign*v.co.x > .005]
        lo, hi = min(abs(v.x) for v in samples), max(abs(v.x) for v in samples)
        for i in range(85):
            t = (i+.5)/85
            xx = lo+(hi-lo)*t
            nearby = sorted(samples, key=lambda p: abs(abs(p.x)-xx))[:6]
            yy = min(p.y for p in nearby)-.0007
            zz = sum(p.z for p in nearby)/len(nearby)
            zz += rng.uniform(-.0015,.0015)
            point = Vector((sign*xx, yy, zz))
            length = .0028*(1-.40*t)
            points = [point+Vector((sign*length*.55*k/3, -.0002*math.sin(k*math.pi/3), length*k/3)) for k in range(4)]
            tube(vertices, faces, points, .00013, sides=4)
    mesh_object('Lucien_BrowHairs', vertices, faces, material('Lucien natural brow hairs', (.012,.009,.009), .75), rig, 'mixamorig:Head')


def tailored_open_collar(body, rig, bottom, top):
    tree=chest_tree
    def front(x,z,offset=.006):
        hit=tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))[0]
        if hit is None:
            hit=tree.ray_cast(Vector((x*.6,-1,z-.008)),Vector((0,1,0)))[0]
        assert hit is not None, ('missing collar support',x,z)
        return hit.y-offset
    black=material('Lucien open collar black linen',(.019,.022,.026),.78)
    # Tailor a continuous 3D shirt from the full chest surface, before clothing masks.
    mesh=bpy.data.meshes.new('Lucien shirt topology');mesh.from_pydata(chest_coordinates,[],chest_polygons);mesh.update()
    source=bpy.data.objects.new('Temporary shirt surface',mesh);bpy.context.collection.objects.link(source)
    bpy.context.view_layer.objects.active=source
    sub=source.modifiers.new('Match smoothed skin','SUBSURF');sub.levels=1
    bpy.ops.object.modifier_apply(modifier=sub.name)
    mesh=source.data
    bm=bmesh.new();bm.from_mesh(mesh)
    min_z=top-.50;max_z=top+.043
    planes=[((0,0,min_z),(0,0,1)),((0,0,max_z),(0,0,1)),
            ((.095,0,0),(1,0,0)),((-.095,0,0),(1,0,0)),
            ((0,-.025,0),(0,1,0)),((0,0,bottom),(1,0,-.39)),((0,0,bottom),(-1,0,-.39)),
            ((0,0,bottom),(0,0,1)),((0,0,bottom-.20),(0,0,1)),((0,0,bottom-.02),(0,0,1)),
            ((.05,0,bottom-.15),(1,0,-.30)),((-.05,0,bottom-.15),(-1,0,-.30))]
    for co,no in planes:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
            dist=.000001,plane_co=co,plane_no=no,clear_outer=False,clear_inner=False)
    remove=[]
    for face in bm.faces:
        c=face.calc_center_median()
        width=min(.095,max(.035,.05+.30*(c.z-(bottom-.15))))
        if c.z<min_z or c.z>max_z or abs(c.x)>width or (c.y<-.025 and c.z>bottom and abs(c.x)<.39*(c.z-bottom)+.000001):
            remove.append(face)
    bmesh.ops.delete(bm,geom=remove,context='FACES')
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
    bm.normal_update()
    for vert in bm.verts:vert.co+=vert.normal*.003
    bm.to_mesh(mesh);bm.free()
    ob=mesh_object('Lucien_OpenShirt', [tuple(v.co) for v in mesh.vertices],
                   [tuple(p.vertices) for p in mesh.polygons], black, rig, 'mixamorig:Spine2')
    ob.vertex_groups.clear()
    names={name for weights in skin_weights.values() for name in weights}
    groups={name:ob.vertex_groups.new(name=name) for name in sorted(names)}
    for vertex in ob.data.vertices:
        weights={};total=0
        for point,index,distance in weight_tree.find_n(vertex.co,4):
            influence=1/max(distance,.0001)**2;total+=influence
            for name,weight in skin_weights[index].items():weights[name]=weights.get(name,0)+weight*influence
        for name,weight in weights.items():
            if weight/total>.0001:groups[name].add([vertex.index],weight/total,'REPLACE')
    bpy.data.objects.remove(source,do_unlink=True)
    bpy.data.meshes.remove(mesh)
    bpy.context.view_layer.objects.active=ob
    solid=ob.modifiers.new('Fabric thickness','SOLIDIFY');solid.thickness=.001
    bpy.ops.object.modifier_apply(modifier=solid.name)
    z=bottom-.025;y=front(0,z,.018)
    vertices,faces=[],[]
    points=[Vector((-.018+i*.036/8,y,z+.002*math.sin(i*math.pi/8))) for i in range(9)]
    tube(vertices,faces,points,.0012,sides=8,taper=False)
    mesh_object('Lucien_SilverClasp',vertices,faces,material('Lucien brushed silver',(.32,.35,.39),.25,.88),rig,'mixamorig:Spine2')


def refine(body, rig, tools, opening):
    skin=body.data.materials[0]
    surface_maps(skin)
    bs=skin.node_tree.nodes.get('Principled BSDF')
    bs.inputs['IOR'].default_value=1.42
    bpy.context.view_layer.objects.active=body
    sub=body.modifiers.new('Facial surface refinement','SUBSURF');sub.levels=1
    bpy.ops.object.modifier_apply(modifier=sub.name)
    eyes=bpy.data.objects['Lucien_Eyes']
    for uv in eyes.data.uv_layers.active.data:
        point=uv.uv
        center=Vector((.292,.292)) if point.x+point.y < 1 else Vector((.707,.707))
        delta=point-center
        if delta.length < .25:
            uv.uv=center+delta*1.13
    mat=eyes.data.materials[0]
    bs=mat.node_tree.nodes.get('Principled BSDF')
    tex=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE')
    mix=mat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY'
    mix.inputs[0].default_value=1;mix.inputs[2].default_value=(.68,.73,.69,1)
    mat.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);mat.node_tree.links.new(mix.outputs['Color'],bs.inputs['Base Color'])
    hair_groom(bpy.data.objects['Lucien_Hair'],bpy.data.objects['Lucien_Brows'],rig)
    tailored_open_collar(body,rig,*opening)
    suit=bpy.data.objects['Lucien_TailoredSuit']
    surface_maps(suit.data.materials[0],cloth=True)
