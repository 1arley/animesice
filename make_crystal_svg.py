import os

# Palette colors strictly allowed:
C_DARK1 = '#0E141D'
C_DARK2 = '#1C2534'
C_MID1  = '#008CDA'
C_MID2  = '#00E5FF'
C_BRT1  = '#38E8DA'
C_BRT2  = '#60F6E9'
C_CORE  = '#E9EFF5'

# Define vertices for a 3D faceted crystal rising from center (960, 540)
V = {
    # Apexes
    'TOP': (960, 90),
    'BOT': (960, 970),

    # Row 1 (Near Top Apex)
    'R1_L': (915, 200),
    'R1_C': (960, 230),
    'R1_R': (1010, 190),

    # Row 2 (Upper shoulders)
    'R2_FL': (800, 310),
    'R2_L': (885, 325),
    'R2_CL': (938, 335),
    'R2_CR': (982, 330),
    'R2_R': (1040, 310),
    'R2_FR': (1130, 280),

    # Row 3 (Upper Mid)
    'R3_FL': (710, 420),
    'R3_L': (820, 425),
    'R3_CL': (915, 430),
    'R3_CC': (960, 405),
    'R3_CR': (1005, 425),
    'R3_R': (1090, 405),
    'R3_FR': (1220, 390),

    # Row 4 (Waist - Maximum lateral expansion)
    'R4_OUT_L': (580, 540),
    'R4_FL': (695, 525),
    'R4_L': (810, 520),
    'R4_CL': (910, 520),
    'R4_CTR': (960, 540),
    'R4_CR': (1010, 510),
    'R4_R': (1105, 520),
    'R4_FR': (1230, 510),
    'R4_OUT_R': (1340, 540),

    # Row 5 (Lower Mid)
    'R5_FL': (690, 660),
    'R5_L': (815, 645),
    'R5_CL': (915, 630),
    'R5_CC': (960, 645),
    'R5_CR': (1000, 620),
    'R5_R': (1095, 635),
    'R5_FR': (1215, 660),

    # Row 6 (Lower Shoulders)
    'R6_FL': (780, 775),
    'R6_L': (875, 760),
    'R6_CL': (930, 745),
    'R6_CR': (990, 750),
    'R6_R': (1045, 765),
    'R6_FR': (1140, 790),

    # Row 7 (Near Bottom Apex)
    'R7_L': (900, 870),
    'R7_C': (960, 845),
    'R7_R': (1020, 875),

    # Signal Core Shards (Central Column Overlays)
    'SC_TOP': (960, 270),
    'SC_M1_L': (935, 380),
    'SC_M1_R': (985, 370),
    'SC_CTR': (960, 485),
    'SC_M2_L': (930, 595),
    'SC_M2_R': (990, 585),
    'SC_BOT': (960, 705),

    # Core High Energy Inset Shard
    'CORE_TOP': (960, 360),
    'CORE_L': (945, 470),
    'CORE_R': (975, 460),
    'CORE_BOT': (960, 585)
}

def pts(*keys):
    return " ".join(f"{V[k][0]},{V[k][1]}" for k in keys)

# Build facet tuples: (points_str, fill_color)
facets_data = [
    # Background blur / focus pull facet base layer
    (pts('R3_CC', 'R4_OUT_L', 'R5_CC', 'R4_OUT_R'), C_BRT2),
    (pts('CORE_TOP', 'R4_FL', 'CORE_BOT', 'R4_FR'), C_CORE),

    # TOP SPIRE FACETS
    (pts('TOP', 'R1_L', 'R1_C'), C_BRT2),
    (pts('TOP', 'R1_C', 'R1_R'), C_CORE),
    (pts('TOP', 'R1_R', 'R2_FR'), C_MID2),
    (pts('TOP', 'R2_FL', 'R1_L'), C_MID1),

    # UPPER SECTION FACETS
    (pts('R1_L', 'R2_FL', 'R2_L'), C_DARK2),
    (pts('R1_L', 'R2_L', 'R2_CL'), C_MID1),
    (pts('R1_L', 'R2_CL', 'R1_C'), C_BRT1),
    (pts('R1_C', 'R2_CL', 'R2_CR'), C_CORE),
    (pts('R1_C', 'R2_CR', 'R1_R'), C_BRT2),
    (pts('R1_R', 'R2_CR', 'R2_R'), C_MID2),
    (pts('R1_R', 'R2_R', 'R2_FR'), C_MID1),

    # MID UPPER SECTION FACETS
    (pts('R2_FL', 'R3_FL', 'R3_L'), C_DARK1),
    (pts('R2_FL', 'R3_L', 'R2_L'), C_DARK2),
    (pts('R2_L', 'R3_L', 'R3_CL'), C_MID1),
    (pts('R2_L', 'R3_CL', 'R2_CL'), C_MID2),
    (pts('R2_CL', 'R3_CL', 'R3_CC'), C_BRT1),
    (pts('R2_CL', 'R3_CC', 'R2_CR'), C_CORE),
    (pts('R2_CR', 'R3_CC', 'R3_CR'), C_BRT2),
    (pts('R2_CR', 'R3_CR', 'R2_R'), C_MID2),
    (pts('R2_R', 'R3_CR', 'R3_R'), C_MID1),
    (pts('R2_R', 'R3_R', 'R2_FR'), C_DARK2),
    (pts('R2_FR', 'R3_R', 'R3_FR'), C_DARK1),

    # WAIST SECTION FACETS (Outer wings to center)
    (pts('R3_FL', 'R4_OUT_L', 'R4_FL'), C_DARK1),
    (pts('R3_FL', 'R4_FL', 'R3_L'), C_DARK2),
    (pts('R3_L', 'R4_FL', 'R4_L'), C_DARK2),
    (pts('R3_L', 'R4_L', 'R3_CL'), C_MID1),
    (pts('R3_CL', 'R4_L', 'R4_CL'), C_MID2),
    (pts('R3_CL', 'R4_CL', 'R3_CC'), C_BRT1),
    (pts('R3_CC', 'R4_CL', 'R4_CTR'), C_CORE),
    (pts('R3_CC', 'R4_CTR', 'R3_CR'), C_BRT2),
    (pts('R3_CR', 'R4_CTR', 'R4_CR'), C_BRT1),
    (pts('R3_CR', 'R4_CR', 'R3_R'), C_MID2),
    (pts('R3_R', 'R4_CR', 'R4_R'), C_MID1),
    (pts('R3_R', 'R4_R', 'R4_FR'), C_DARK2),
    (pts('R3_FR', 'R3_R', 'R4_FR'), C_DARK2),
    (pts('R3_FR', 'R4_FR', 'R4_OUT_R'), C_DARK1),

    # MID LOWER SECTION FACETS
    (pts('R4_OUT_L', 'R5_FL', 'R4_FL'), C_DARK1),
    (pts('R4_FL', 'R5_FL', 'R5_L'), C_DARK2),
    (pts('R4_FL', 'R5_L', 'R4_L'), C_DARK2),
    (pts('R4_L', 'R5_L', 'R5_CL'), C_MID1),
    (pts('R4_L', 'R5_CL', 'R4_CL'), C_MID2),
    (pts('R4_CL', 'R5_CL', 'R4_CTR'), C_BRT1),
    (pts('R4_CTR', 'R5_CL', 'R5_CC'), C_BRT2),
    (pts('R4_CTR', 'R5_CC', 'R4_CR'), C_CORE),
    (pts('R4_CR', 'R5_CC', 'R5_CR'), C_BRT1),
    (pts('R4_CR', 'R5_CR', 'R4_R'), C_MID2),
    (pts('R4_R', 'R5_CR', 'R5_R'), C_MID1),
    (pts('R4_R', 'R5_R', 'R4_FR'), C_DARK2),
    (pts('R4_FR', 'R5_R', 'R5_FR'), C_DARK2),
    (pts('R4_OUT_R', 'R4_FR', 'R5_FR'), C_DARK1),

    # LOWER SHOULDERS FACETS
    (pts('R5_FL', 'R6_FL', 'R5_L'), C_DARK1),
    (pts('R5_L', 'R6_FL', 'R6_L'), C_DARK2),
    (pts('R5_L', 'R6_L', 'R5_CL'), C_DARK2),
    (pts('R5_CL', 'R6_L', 'R6_CL'), C_MID1),
    (pts('R5_CL', 'R6_CL', 'R5_CC'), C_MID2),
    (pts('R5_CC', 'R6_CL', 'R6_CR'), C_BRT1),
    (pts('R5_CC', 'R6_CR', 'R5_CR'), C_BRT2),
    (pts('R5_CR', 'R6_CR', 'R6_R'), C_MID2),
    (pts('R5_CR', 'R6_R', 'R5_R'), C_MID1),
    (pts('R5_R', 'R6_R', 'R6_FR'), C_DARK2),
    (pts('R5_FR', 'R5_R', 'R6_FR'), C_DARK1),

    # LOWER BASE & BOTTOM SPIRE FACETS
    (pts('R6_FL', 'R7_L', 'R6_L'), C_DARK1),
    (pts('R6_L', 'R7_L', 'R6_CL'), C_DARK2),
    (pts('R6_CL', 'R7_L', 'R7_C'), C_MID1),
    (pts('R6_CL', 'R7_C', 'R6_CR'), C_MID2),
    (pts('R6_CR', 'R7_C', 'R7_R'), C_MID1),
    (pts('R6_CR', 'R7_R', 'R6_R'), C_DARK2),
    (pts('R6_R', 'R7_R', 'R6_FR'), C_DARK1),

    (pts('R7_L', 'BOT', 'R7_C'), C_DARK2),
    (pts('R7_C', 'BOT', 'R7_R'), C_MID1),

    # CENTRAL BROADCAST SIGNAL CORE SHARDS (Overlaid central highlights)
    (pts('SC_TOP', 'SC_M1_L', 'SC_CTR'), C_BRT2),
    (pts('SC_TOP', 'SC_CTR', 'SC_M1_R'), C_CORE),
    (pts('SC_CTR', 'SC_M2_L', 'SC_BOT'), C_BRT1),
    (pts('SC_CTR', 'SC_BOT', 'SC_M2_R'), C_CORE),

    # HIGHEST LUMINANCE CORE SHARD (Direct Center Spine)
    (pts('CORE_TOP', 'CORE_L', 'CORE_BOT'), C_CORE),
    (pts('CORE_TOP', 'CORE_BOT', 'CORE_R'), C_BRT2)
]

floating_shards = [
    {
        'id': 'float-01',
        'polys': [
            ("320,180 390,210 350,260", C_MID1),
            ("320,180 350,260 290,230", C_DARK2),
            ("350,260 390,210 410,270", C_MID2)
        ]
    },
    {
        'id': 'float-02',
        'polys': [
            ("1580,160 1650,210 1600,250", C_BRT1),
            ("1580,160 1600,250 1530,190", C_MID2),
            ("1600,250 1650,210 1630,280", C_DARK2)
        ]
    },
    {
        'id': 'float-03',
        'polys': [
            ("260,480 340,510 290,570", C_MID2),
            ("260,480 290,570 230,530", C_DARK1),
            ("340,510 380,550 290,570", C_BRT2)
        ]
    },
    {
        'id': 'float-04',
        'polys': [
            ("1660,460 1740,500 1680,560", C_MID1),
            ("1660,460 1680,560 1610,510", C_DARK2),
            ("1740,500 1710,580 1680,560", C_MID2)
        ]
    },
    {
        'id': 'float-05',
        'polys': [
            ("410,810 490,830 440,890", C_MID1),
            ("410,810 440,890 370,860", C_DARK2),
            ("490,830 460,920 440,890", C_DARK1)
        ]
    },
    {
        'id': 'float-06',
        'polys': [
            ("1480,800 1560,840 1500,900", C_BRT1),
            ("1480,800 1500,900 1430,850", C_MID2),
            ("1560,840 1530,920 1500,900", C_DARK2)
        ]
    },
    {
        'id': 'float-07',
        'polys': [
            ("720,160 780,200 750,240", C_CORE),
            ("720,160 750,240 690,210", C_BRT2),
            ("780,200 800,250 750,240", C_MID2)
        ]
    },
    {
        'id': 'float-08',
        'polys': [
            ("1190,150 1260,180 1210,230", C_BRT2),
            ("1190,150 1210,230 1150,190", C_MID1),
            ("1260,180 1280,240 1210,230", C_CORE)
        ]
    },
    {
        'id': 'float-09',
        'polys': [
            ("710,890 770,920 730,970", C_MID2),
            ("710,890 730,970 670,940", C_DARK2),
            ("770,920 780,980 730,970", C_MID1)
        ]
    },
    {
        'id': 'float-10',
        'polys': [
            ("1180,900 1250,930 1190,980", C_BRT1),
            ("1180,900 1190,980 1130,940", C_MID2),
            ("1250,930 1240,990 1190,980", C_CORE)
        ]
    }
]

svg_lines = []
svg_lines.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">')
svg_lines.append('  <defs>')
svg_lines.append('    <filter id="focus-pull-blur" x="-30%" y="-30%" width="160%" height="160%">')
svg_lines.append('      <feGaussianBlur stdDeviation="30" result="blur"/>')
svg_lines.append('    </filter>')
svg_lines.append('  </defs>')

# Facet 01 is the blurred glow base layer
for idx, (p_str, fill_col) in enumerate(facets_data, start=1):
    f_id = f"facet-{idx:02d}"
    filter_attr = ' filter="url(#focus-pull-blur)" opacity="0.6"' if idx in (1, 2) else ''
    svg_lines.append(f'  <g id="{f_id}"{filter_attr}>')
    svg_lines.append(f'    <polygon points="{p_str}" fill="{fill_col}"/>')
    svg_lines.append('  </g>')

for shard in floating_shards:
    s_id = shard['id']
    svg_lines.append(f'  <g id="{s_id}">')
    for p_str, fill_col in shard['polys']:
        svg_lines.append(f'    <polygon points="{p_str}" fill="{fill_col}"/>')
    svg_lines.append('  </g>')

svg_lines.append('</svg>')

svg_content = "\n".join(svg_lines)

output_path = "public/assets/scroll-reveal-crystal.svg"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(svg_content)

print(f"SVG generated at {output_path}")
print(f"Size: {os.path.getsize(output_path)} bytes ({os.path.getsize(output_path)/1024:.2f} KB)")
