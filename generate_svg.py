import sys
import xml.etree.ElementTree as ET

# Define allowed colors
PALETTE = {
    'DARK_BASE': '#0E141D',
    'DARK_SLATE': '#1C2534',
    'OCEAN_BLUE': '#008CDA',
    'ELECTRIC_CYAN': '#00E5FF',
    'MINT_CYAN': '#38E8DA',
    'ICE_CYAN': '#60F6E9',
    'WHITE_CORE': '#E9EFF5'
}

# Check all colors are in allowed set
ALLOWED_COLORS = set(PALETTE.values())

print("Palette initialized with", len(ALLOWED_COLORS), "colors.")
