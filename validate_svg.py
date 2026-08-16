import xml.etree.ElementTree as ET
import re
import os

filepath = "public/assets/scroll-reveal-crystal.svg"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Parse XML
tree = ET.ElementTree(ET.fromstring(content))
root = tree.getroot()

# 1. Check dimensions
viewbox = root.attrib.get('viewBox')
width = root.attrib.get('width')
height = root.attrib.get('height')
print(f"Dimensions check: viewBox={viewbox}, width={width}, height={height}")
assert viewbox == "0 0 1920 1080", "viewBox must be '0 0 1920 1080'"

# 2. Check size < 80KB
size_bytes = os.path.getsize(filepath)
print(f"File size: {size_bytes} bytes ({size_bytes/1024:.2f} KB)")
assert size_bytes < 80 * 1024, "File size exceeds 80KB"

# 3. Check for text elements
texts = root.findall('.//{http://www.w3.org/2000/svg}text')
assert len(texts) == 0, "No text elements allowed"

# 4. Check for gradients
lg = root.findall('.//{http://www.w3.org/2000/svg}linearGradient')
rg = root.findall('.//{http://www.w3.org/2000/svg}radialGradient')
assert len(lg) == 0 and len(rg) == 0, "No gradients allowed"

# 5. Check for feGaussianBlur - exactly ONE allowed
blur_elements = root.findall('.//{http://www.w3.org/2000/svg}feGaussianBlur')
print(f"feGaussianBlur count: {len(blur_elements)}")
assert len(blur_elements) == 1, f"Must have exactly ONE feGaussianBlur, found {len(blur_elements)}"

# 6. Check rounded corners (rx, ry, or curve commands in paths)
for elem in root.iter():
    assert 'rx' not in elem.attrib, "Rounded corner rx attribute found"
    assert 'ry' not in elem.attrib, "Rounded corner ry attribute found"

# 7. Check palette colors
allowed_colors = {'#0E141D', '#1C2534', '#008CDA', '#00E5FF', '#38E8DA', '#60F6E9', '#E9EFF5'}
# find all hex colors in fill attributes
fills = re.findall(r'fill="([^"]+)"', content)
used_colors = set(fills)
print("Used fill colors:", used_colors)
for c in used_colors:
    assert c in allowed_colors, f"Color {c} is not in allowed palette!"

# 8. Check structure IDs
facet_groups = [elem for elem in root.findall('.//{http://www.w3.org/2000/svg}g') if elem.attrib.get('id', '').startswith('facet-')]
float_groups = [elem for elem in root.findall('.//{http://www.w3.org/2000/svg}g') if elem.attrib.get('id', '').startswith('float-')]

print(f"Facet groups found: {len(facet_groups)} ({[g.attrib['id'] for g in facet_groups[:5]]}...)")
print(f"Float groups found: {len(float_groups)} ({[g.attrib['id'] for g in float_groups]})")

assert len(facet_groups) >= 10, f"Expected at least 10 facet groups, found {len(facet_groups)}"
assert 8 <= len(float_groups) <= 10, f"Expected 8 to 10 float groups, found {len(float_groups)}"

# 9. Check background transparency
# Verify no background rect filling 1920x1080
rects = root.findall('.//{http://www.w3.org/2000/svg}rect')
for r in rects:
    assert not (r.attrib.get('width') == '1920' or r.attrib.get('width') == '100%'), "Transparent background required, rect found"

print("\nALL VERIFICATION CHECKS PASSED PERFECTLY!")
