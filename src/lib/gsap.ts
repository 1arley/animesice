"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

/**
 * Único ponto de registro do GSAP para o app.
 * Plugin de animação de scroll (ScrollTrigger) + hook React (useGSAP) com
 * cleanup automático. Importe `gsap`/`ScrollTrigger`/`useGSAP` daqui em vez
 * do pacote direto, para o registro não se repetir.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, ScrollTrigger, useGSAP };
