import { registerRoot } from "remotion";
import { RemotionRoot } from "./src/root.tsx";

export { GACHA_RARITIES, type GachaRarity } from "./src/tokens/index.ts";
export {
  CrystalInvocation,
  type CrystalInvocationProps,
} from "./videos/gacha/crystal/gacha-crystal/composition.tsx";

registerRoot(RemotionRoot);
