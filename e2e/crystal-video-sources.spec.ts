import { expect, test } from "@playwright/test";

/**
 * O cristal é servido em duas fontes: WebM (VP9, principal) e MP4 (H.264,
 * fallback do Safari — o WebKit só decodifica WebM a partir do iOS 17.4).
 *
 * O bug que este teste trava: o arquivo publicado como `.mp4` era na verdade
 * uma cópia byte-a-byte do WebM (mesmo md5, `format_name=matroska`). Como o
 * componente usava `src` único apontando para o WebM, o Safari recebia 200 com
 * um container que não decodifica e caía no fallback em CSS — a animação
 * existia no repositório, mas nunca tocava no iPhone.
 *
 * Verifica o container pelos bytes mágicos, não pela extensão: é exatamente a
 * distinção que falhou.
 */

/** EBML — cabeçalho de WebM/Matroska (0x1A 0x45 0xDF 0xA3). */
const EBML_MAGIC = [0x1a, 0x45, 0xdf, 0xa3];

/** ISO-BMFF — `....ftyp` no offset 4, assinatura de MP4/MOV. */
const FTYP_BOX = Buffer.from("ftyp", "ascii");

test("crystal videos serve a decodable container for WebM and Safari", async ({
  request,
}) => {
  const sources = [
    { path: "/icons/crystal_animation_clean.webm", isMatroska: true },
    { path: "/icons/crystal_animation_h264.mp4", isMatroska: false },
  ];

  for (const { path, isMatroska } of sources) {
    const response = await request.get(path);

    expect(response.status(), `${path} deve existir`).toBe(200);

    const body = await response.body();
    expect(body.byteLength, `${path} não pode estar vazio`).toBeGreaterThan(1024);

    const looksMatroska = EBML_MAGIC.every(
      (byte, index) => body[index] === byte,
    );

    if (isMatroska) {
      expect(looksMatroska, `${path} deve ser um container WebM/Matroska`).toBe(
        true,
      );
    } else {
      // A extensão .mp4 precisa de ffmpeg de verdade para ser tocável.
      expect(
        body.subarray(4, 8).equals(FTYP_BOX),
        `${path} precisa ser um container ISO-BMFF (ftyp), não um WebM renomeado`,
      ).toBe(true);
    }
  }
});
