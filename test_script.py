import sys

# Define vertices for a 3D faceted crystal rising from center
# Canvas 1920x1080, center (960, 540)

vertices = {
    # Top Spire
    'TOP': (960, 120),
    'TOP_L1': (915, 230),
    'TOP_R1': (1010, 210),
    'TOP_M': (960, 270),
    
    # Upper Section
    'UP_FAR_L': (820, 330),
    'UP_MID_L': (895, 340),
    'UP_CORE_L': (940, 360),
    'UP_CORE_R': (985, 350),
    'UP_MID_R': (1035, 320),
    'UP_FAR_R': (1110, 300),

    # Mid Upper Section
    'MU_FAR_L': (730, 440),
    'MU_MID_L': (840, 430),
    'MU_CORE_L': (925, 440),
    'MU_CORE_C': (960, 420),
    'MU_CORE_R': (995, 435),
    'MU_MID_R': (1075, 420),
    'MU_FAR_R': (1200, 410),

    # Waist (Widest point)
    'W_OUTER_L2': (620, 540),
    'W_OUTER_L1': (720, 530),
    'W_MID_L': (830, 520),
    'W_CORE_L': (915, 525),
    'W_CENTER': (960, 540),
    'W_CORE_R': (1005, 515),
    'W_MID_R': (1090, 530),
    'W_OUTER_R1': (1210, 520),
    'W_OUTER_R2': (1310, 540),

    # Mid Lower Section
    'ML_FAR_L': (710, 640),
    'ML_MID_L': (835, 630),
    'ML_CORE_L': (920, 620),
    'ML_CORE_C': (960, 630),
    'ML_CORE_R': (1000, 615),
    'ML_MID_R': (1080, 635),
    'ML_FAR_R': (1190, 650),

    # Lower Section
    'LOW_FAR_L': (800, 750),
    'LOW_MID_L': (885, 740),
    'LOW_CORE_L': (935, 720),
    'LOW_CORE_R': (980, 730),
    'LOW_MID_R': (1040, 750),
    'LOW_FAR_R': (1120, 770),

    # Bottom Spire
    'BOT_L1': (910, 840),
    'BOT_R1': (1015, 850),
    'BOT_M': (960, 810),
    'BOT': (960, 940),
    
    # Extra Core Highlight Shard vertices (floating directly inside center)
    'SHARD_TOP': (960, 310),
    'SHARD_ML': (942, 450),
    'SHARD_MR': (978, 440),
    'SHARD_CTR': (960, 530),
    'SHARD_BL': (938, 620),
    'SHARD_BR': (982, 610),
    'SHARD_BOT': (960, 750)
}

print("Total vertices defined:", len(vertices))
