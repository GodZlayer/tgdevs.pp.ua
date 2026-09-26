import bpy
import math
import os


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BLEND = os.path.join(ROOT, "blender", "assets", "tgdevs_brands_r2.blend")
OUTPUT = os.path.join(ROOT, "blender", "assets", "tgdevs-og-r2.png")

if bpy.data.filepath != BLEND:
    bpy.ops.wm.open_mainfile(filepath=BLEND)

scene = bpy.context.scene
brand_objects = [
    obj for obj in bpy.data.objects
    if obj.name.startswith("TGDevs favicon") or obj.name.startswith("TGDevs logotxt")
]
if not brand_objects:
    raise RuntimeError("TGDevs Blender lockup source is missing")

for obj in bpy.data.objects:
    obj.hide_render = obj not in brand_objects and obj.type != "LIGHT"

camera_data = bpy.data.cameras.new("TGDevs Social Preview Camera")
camera = bpy.data.objects.new("TGDevs Social Preview Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -18, 2.35)
camera.rotation_euler = (math.pi / 2, 0, 0)
camera_data.type = "ORTHO"
camera_data.ortho_scale = 9.35
scene.camera = camera

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 630
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.compression = 25
scene.render.film_transparent = False
scene.render.filepath = OUTPUT
scene.view_settings.view_transform = "AgX"

bpy.ops.render.render(write_still=True)
print(f"SOCIAL_PREVIEW_RENDERED {OUTPUT} {os.path.getsize(OUTPUT)} bytes")
