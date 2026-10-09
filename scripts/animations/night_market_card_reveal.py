"""Render the Night Market card reveal with ModernGL.

Requires ``python -m pip install moderngl numpy`` and FFmpeg with libx264.
Run from the repository root with ``python scripts/animations/night_market_card_reveal.py``.
"""
import subprocess
from pathlib import Path

import moderngl
import numpy as np


WIDTH, HEIGHT, FPS = 720, 960, 30
DURATION = 1.2

VERTEX_SHADER = """
#version 330
in vec2 in_position;
void main() {
    gl_Position = vec4(in_position, 0.0, 1.0);
}
"""

FRAGMENT_SHADER = """
#version 330
uniform vec2 resolution;
uniform float time;
out vec4 frag_color;

float line(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

float stroke(float distance, float width) {
    return 1.0 - smoothstep(width, width + 1.0, distance);
}

float trace(vec2 p, vec2 a, vec2 b, float progress) {
    vec2 ba = b - a;
    float along = clamp(dot(p - a, ba) / dot(ba, ba), 0.0, 1.0);
    return stroke(line(p, a, b), 1.4) * smoothstep(along - 0.025, along + 0.025, progress);
}

float traceHead(vec2 p, vec2 a, vec2 b, float progress) {
    vec2 point = mix(a, b, clamp(progress, 0.0, 1.0));
    return exp(-length(p - point) * 0.09) * step(0.0, progress) * step(progress, 1.0);
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;
    vec2 card = vec2(150.0 + p.x * 400.0, 200.0 - p.y * 400.0);
    float t = clamp(time / 1.2, 0.0, 1.0);
    float fade = 1.0 - smoothstep(0.84, 1.0, t);
    float pulse = exp(-pow((t - 0.46) / 0.11, 2.0));
    vec3 ice = vec3(0.30, 0.83, 0.94);
    vec3 frost = vec3(0.84, 0.97, 1.0);
    vec3 color = vec3(0.0);

    // Coordinates and paths mirror the pre-reveal card's 300x400 SVG.
    vec2 diamond[4] = vec2[4](vec2(150, 145), vec2(205, 200), vec2(150, 255), vec2(95, 200));
    vec2 inner[4] = vec2[4](vec2(150, 168), vec2(182, 200), vec2(150, 232), vec2(118, 200));
    vec2 core[4] = vec2[4](vec2(150, 187), vec2(163, 200), vec2(150, 213), vec2(137, 200));

    float frameDistance = 1000.0;
    frameDistance = min(frameDistance, line(card, vec2(18, 48), vec2(18, 18)));
    frameDistance = min(frameDistance, line(card, vec2(18, 18), vec2(282, 18)));
    frameDistance = min(frameDistance, line(card, vec2(282, 18), vec2(282, 382)));
    frameDistance = min(frameDistance, line(card, vec2(282, 382), vec2(18, 382)));
    frameDistance = min(frameDistance, line(card, vec2(18, 382), vec2(18, 352)));

    float motifDistance = 1000.0;
    for (int i = 0; i < 4; i++) {
        motifDistance = min(motifDistance, line(card, diamond[i], diamond[(i + 1) % 4]));
        motifDistance = min(motifDistance, line(card, inner[i], inner[(i + 1) % 4]));
        motifDistance = min(motifDistance, line(card, core[i], core[(i + 1) % 4]));
    }
    motifDistance = min(motifDistance, line(card, vec2(150, 135), vec2(150, 97)));
    motifDistance = min(motifDistance, line(card, vec2(150, 303), vec2(150, 265)));
    motifDistance = min(motifDistance, line(card, vec2(93, 200), vec2(58, 200)));
    motifDistance = min(motifDistance, line(card, vec2(242, 200), vec2(207, 200)));

    float circuitDistance = 1000.0;
    circuitDistance = min(circuitDistance, line(card, vec2(18, 90), vec2(42, 90)));
    circuitDistance = min(circuitDistance, line(card, vec2(42, 90), vec2(76, 124)));
    circuitDistance = min(circuitDistance, line(card, vec2(76, 124), vec2(76, 170)));
    circuitDistance = min(circuitDistance, line(card, vec2(282, 90), vec2(258, 90)));
    circuitDistance = min(circuitDistance, line(card, vec2(258, 90), vec2(224, 124)));
    circuitDistance = min(circuitDistance, line(card, vec2(224, 124), vec2(224, 170)));
    circuitDistance = min(circuitDistance, line(card, vec2(18, 310), vec2(42, 310)));
    circuitDistance = min(circuitDistance, line(card, vec2(42, 310), vec2(76, 276)));
    circuitDistance = min(circuitDistance, line(card, vec2(76, 276), vec2(76, 230)));
    circuitDistance = min(circuitDistance, line(card, vec2(282, 310), vec2(258, 310)));
    circuitDistance = min(circuitDistance, line(card, vec2(258, 310), vec2(224, 276)));
    circuitDistance = min(circuitDistance, line(card, vec2(224, 276), vec2(224, 230)));

    float outerProgress = smoothstep(0.10, 0.50, t) * 4.0;
    float innerProgress = smoothstep(0.28, 0.60, t) * 4.0;
    float outerTrace = 0.0;
    float innerTrace = 0.0;
    float movingGlint = 0.0;
    for (int i = 0; i < 4; i++) {
        float outerStep = clamp(outerProgress - float(i), 0.0, 1.0);
        float innerStep = clamp(innerProgress - float(i), 0.0, 1.0);
        vec2 a = diamond[i];
        vec2 b = diamond[(i + 1) % 4];
        vec2 ia = inner[i];
        vec2 ib = inner[(i + 1) % 4];
        outerTrace += trace(card, a, b, outerStep);
        innerTrace += trace(card, ia, ib, innerStep);
        movingGlint += traceHead(card, a, b, outerStep) * step(0.0, outerProgress - float(i)) * step(outerProgress - float(i), 1.0);
    }

    float coreFlash = pulse * exp(-length(card - vec2(150, 200)) * 0.045);
    color += ice * stroke(frameDistance, 1.2) * fade * 0.16;
    color += ice * stroke(circuitDistance, 1.1) * fade * 0.12;
    color += ice * stroke(motifDistance, 1.1) * fade * 0.10;
    color += frost * outerTrace * fade * 0.8;
    color += frost * innerTrace * fade * 0.52;
    color += frost * movingGlint * pulse * 0.52;
    color += frost * coreFlash * 0.36;

    frag_color = vec4(color, 1.0);
}
"""


def render_asset() -> None:
    root = Path(__file__).resolve().parents[2]
    output = root / "public" / "gacha" / "night-market-card-reveal.mp4"
    output.parent.mkdir(parents=True, exist_ok=True)

    context = moderngl.create_standalone_context(require=330, backend="egl")
    framebuffer_texture = context.texture((WIDTH, HEIGHT), components=3, dtype="f1")
    framebuffer = context.framebuffer(color_attachments=[framebuffer_texture])
    program = context.program(vertex_shader=VERTEX_SHADER, fragment_shader=FRAGMENT_SHADER)
    vertices = np.array([-1, -1, 1, -1, -1, 1, 1, 1], dtype="f4")
    buffer = context.buffer(vertices.tobytes())
    vao = context.vertex_array(program, [(buffer, "2f", "in_position")])
    program["resolution"].value = (WIDTH, HEIGHT)
    framebuffer.use()
    context.viewport = (0, 0, WIDTH, HEIGHT)

    encoder = subprocess.Popen(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pixel_format", "rgb24", "-video_size", f"{WIDTH}x{HEIGHT}",
            "-framerate", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-crf", "20",
            "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
        ],
        stdin=subprocess.PIPE,
    )
    assert encoder.stdin is not None
    try:
        for frame in range(round(DURATION * FPS)):
            program["time"].value = frame / FPS
            vao.render(mode=moderngl.TRIANGLE_STRIP)
            pixels = framebuffer.read(components=3, alignment=1)
            assert len(pixels) == WIDTH * HEIGHT * 3
            encoder.stdin.write(np.frombuffer(pixels, dtype=np.uint8).reshape(HEIGHT, WIDTH, 3)[::-1].tobytes())
    finally:
        encoder.stdin.close()
        return_code = encoder.wait()
        vao.release()
        buffer.release()
        program.release()
        framebuffer.release()
        framebuffer_texture.release()
        context.release()
    if return_code:
        raise subprocess.CalledProcessError(return_code, encoder.args)


if __name__ == "__main__":
    render_asset()
