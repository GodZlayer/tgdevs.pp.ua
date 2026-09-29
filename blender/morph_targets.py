"""Editable Blender point-cloud targets used by the WebGPU logo transition."""
import bpy
import os
import struct

TARGETS = (
    ('tgdevsMark', 'TGDEVS • particle morph target'),
    ('tgbcMark', 'TGBC • particle morph target'),
)


def embed_targets(assets_dir):
    """Read generated samples once and store them as editable point meshes."""
    collection = bpy.data.collections.get('04 • WebGPU vector morph targets')
    if collection is None:
        collection = bpy.data.collections.new('04 • WebGPU vector morph targets')
        bpy.context.scene.collection.children.link(collection)
    collection.hide_render = True
    for key, object_name in TARGETS:
        source = os.path.join(assets_dir, f'{key}-points-r2.bin')
        with open(source, 'rb') as stream:
            raw = stream.read()
        if len(raw) < 14:
            raise RuntimeError(f'Invalid vector point source: {source}')
        magic, version, count, _reserved, aspect = struct.unpack_from('<4sHHHf', raw)
        if magic != b'TGVP' or version != 1 or len(raw) != 14 + count * 11:
            raise RuntimeError(f'Invalid vector point source: {source}')
        vertices = []
        colors = []
        for index in range(count):
            offset = 14 + index * 11
            x, y, red, green, blue = struct.unpack_from('<ffBBB', raw, offset)
            vertices.append((x, y, 0.0))
            colors.append((red / 255, green / 255, blue / 255, 1.0))
        old = bpy.data.objects.get(object_name)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)
        mesh = bpy.data.meshes.new(object_name + ' • editable samples')
        mesh.from_pydata(vertices, [], [])
        mesh.update()
        color_attribute = mesh.color_attributes.new(name='morph_color', type='FLOAT_COLOR', domain='POINT')
        for index, color in enumerate(colors):
            color_attribute.data[index].color = color
        obj = bpy.data.objects.new(object_name, mesh)
        collection.objects.link(obj)
        obj.hide_render = True
        obj.display_type = 'WIRE'
        obj['role'] = 'Editable ordered point positions/colors packed into tgdevs_universe_r1.glb.'
        obj['point_count'] = count
        obj['aspect_ratio'] = aspect
    return collection


def encode_target(obj):
    """Return the compact TGVP browser payload from the current Blender mesh."""
    count = len(obj.data.vertices)
    aspect = float(obj.get('aspect_ratio', 1.0))
    color_attribute = obj.data.color_attributes.get('morph_color')
    if color_attribute is None or len(color_attribute.data) != count:
        raise RuntimeError(f'{obj.name} is missing its per-point morph_color attribute.')
    output = bytearray(struct.pack('<4sHHHf', b'TGVP', 1, count, 0, aspect))
    for index, vertex in enumerate(obj.data.vertices):
        color = color_attribute.data[index].color
        rgb = [max(0, min(255, round(channel * 255))) for channel in color[:3]]
        output.extend(struct.pack('<ffBBB', vertex.co.x, vertex.co.y, *rgb))
    return bytes(output)
