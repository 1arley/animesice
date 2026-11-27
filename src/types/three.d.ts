declare module "three" {
  export const ACESFilmicToneMapping: number;
  export const SRGBColorSpace: string;
  export const DoubleSide: number;
  export const AdditiveBlending: number;
  export const GreaterDepth: number;
  export const DynamicDrawUsage: number;
  export const HalfFloatType: number;
  export const LinearFilter: number;

  export const MathUtils: {
    degToRad(degrees: number): number;
  };

  export class Vector2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
    copy(v: Vector2): this;
  }

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    setScalar(scalar: number): this;
    copy(v: Vector3): this;
    normalize(): this;
  }

  export class Quaternion {
    setFromAxisAngle(axis: Vector3, angle: number): this;
  }

  export class Euler {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
  }

  export class Matrix4 {
    elements: number[];
  }

  export class Color {
    r: number;
    g: number;
    b: number;
    constructor(rOrColor?: string | number, g?: number, b?: number);
    set(color: string | number): this;
    copy(color: Color): this;
    clone(): Color;
    multiplyScalar(s: number): this;
    lerp(color: Color, alpha: number): this;
  }

  export class Plane {
    normal: Vector3;
    constant: number;
    constructor(normal?: Vector3, constant?: number);
  }

  export class Object3D {
    children: Object3D[];
    position: Vector3;
    rotation: Euler;
    scale: Vector3;
    quaternion: Quaternion;
    matrix: Matrix4;
    visible: boolean;
    renderOrder: number;
    frustumCulled: boolean;
    userData: Record<string, unknown>;
    add(...objects: Object3D[]): this;
    remove(...objects: Object3D[]): this;
    traverse(callback: (object: Object3D) => void): void;
    updateMatrix(): void;
    updateMatrixWorld(force?: boolean): void;
  }

  export class Group extends Object3D {}

  export class Scene extends Object3D {
    environment: Texture | null;
  }

  export class PerspectiveCamera extends Object3D {
    fov: number;
    aspect: number;
    near: number;
    far: number;
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    updateProjectionMatrix(): void;
    lookAt(x: number | Vector3, y?: number, z?: number): void;
  }

  export class Texture {
    colorSpace: string;
    minFilter: number;
    magFilter: number;
    generateMipmaps: boolean;
    dispose(): void;
  }

  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement);
  }

  export class TextureLoader {
    setCrossOrigin(crossOrigin: string): this;
    load(
      url: string,
      onLoad?: (texture: Texture) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (err: unknown) => void,
    ): Texture;
  }

  export class WebGLRenderTarget {
    texture: Texture;
    width: number;
    height: number;
    constructor(
      width: number,
      height: number,
      options?: {
        type?: number;
        samples?: number;
      },
    );
    dispose(): void;
  }

  export class PMREMGenerator {
    constructor(renderer: WebGLRenderer);
    fromScene(scene: Scene, sigma?: number): WebGLRenderTarget;
    dispose(): void;
  }

  export class WebGLRenderer {
    domElement: HTMLCanvasElement;
    toneMapping: number;
    toneMappingExposure: number;
    clippingPlanes: Plane[];
    constructor(parameters?: {
      antialias?: boolean;
      alpha?: boolean;
      powerPreference?: string;
      preserveDrawingBuffer?: boolean;
    });
    getContext(): WebGLRenderingContext | WebGL2RenderingContext;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setClearColor(color: number | string | Color, alpha?: number): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    forceContextLoss(): void;
    dispose(): void;
  }

  export class BufferAttribute {
    readonly array: ArrayLike<number>;
    needsUpdate: boolean;
    constructor(array: ArrayLike<number>, itemSize: number);
  }

  export class Float32BufferAttribute extends BufferAttribute {
    constructor(array: Iterable<number> | ArrayLike<number>, itemSize: number);
  }

  export class BufferGeometry {
    index: { array: ArrayLike<number> } | null;
    groups: Array<{ start: number; count: number; materialIndex?: number }>;
    attributes: Record<string, BufferAttribute>;
    translate(x: number, y: number, z: number): this;
    scale(x: number, y: number, z: number): this;
    rotateX(angle: number): this;
    rotateY(angle: number): this;
    rotateZ(angle: number): this;
    setIndex(index: number[]): void;
    clearGroups(): void;
    setAttribute(name: string, attribute: BufferAttribute): this;
    dispose(): void;
  }

  export class BoxGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, depth?: number);
  }

  export class PlaneGeometry extends BufferGeometry {
    constructor(width?: number, height?: number);
  }

  export class CylinderGeometry extends BufferGeometry {
    constructor(
      radiusTop?: number,
      radiusBottom?: number,
      height?: number,
      radialSegments?: number,
      heightSegments?: number,
      openEnded?: boolean,
    );
  }

  export class OctahedronGeometry extends BufferGeometry {
    constructor(radius?: number, detail?: number);
  }

  export class EdgesGeometry extends BufferGeometry {
    constructor(geometry?: BufferGeometry, thresholdAngle?: number);
  }

  export class Shape {
    constructor(points?: Vector2[]);
  }

  export class ShapeGeometry extends BufferGeometry {
    constructor(shapes: Shape | Shape[], curveSegments?: number);
  }

  export interface IUniform<T = unknown> {
    value: T;
  }

  export class Material {
    transparent: boolean;
    opacity: number;
    depthWrite: boolean;
    depthFunc: number;
    side: number;
    blending: number;
    clipping: boolean;
    clippingPlanes: Plane[] | null;
    dispose(): void;
  }

  export class ShaderMaterial extends Material {
    uniforms: Record<string, IUniform>;
    constructor(parameters?: {
      vertexShader?: string;
      fragmentShader?: string;
      uniforms?: Record<string, IUniform>;
      transparent?: boolean;
      depthWrite?: boolean;
      side?: number;
      blending?: number;
      clipping?: boolean;
    });
  }

  export class MeshBasicMaterial extends Material {
    color: Color;
    map: Texture | null;
    constructor(parameters?: {
      color?: number | string | Color;
      transparent?: boolean;
      opacity?: number;
      depthWrite?: boolean;
      colorWrite?: boolean;
      side?: number;
      blending?: number;
      polygonOffset?: boolean;
      polygonOffsetFactor?: number;
      polygonOffsetUnits?: number;
      clippingPlanes?: Plane[] | null;
      map?: Texture | null;
    });
  }

  export class MeshPhysicalMaterial extends Material {
    color: Color;
    emissive: Color;
    emissiveIntensity: number;
    roughness: number;
    metalness: number;
    clearcoat: number;
    clearcoatRoughness: number;
    flatShading: boolean;
    iridescence: number;
    iridescenceIOR: number;
    envMapIntensity: number;
    constructor(parameters?: {
      color?: number | string | Color;
      emissive?: number | string | Color;
      emissiveIntensity?: number;
      roughness?: number;
      metalness?: number;
      clearcoat?: number;
      clearcoatRoughness?: number;
      flatShading?: boolean;
      iridescence?: number;
      iridescenceIOR?: number;
      envMapIntensity?: number;
      transparent?: boolean;
      opacity?: number;
    });
  }

  export class SpriteMaterial extends Material {
    color: Color;
    map: Texture | null;
    constructor(parameters?: {
      map?: Texture | null;
      color?: number | string | Color;
      transparent?: boolean;
      depthWrite?: boolean;
      blending?: number;
      opacity?: number;
    });
  }

  export class Mesh<
    TGeometry extends BufferGeometry = BufferGeometry,
    TMaterial extends Material = Material,
  > extends Object3D {
    geometry: TGeometry;
    material: TMaterial;
    constructor(geometry?: TGeometry, material?: TMaterial);
  }

  export class InstancedMesh<
    TGeometry extends BufferGeometry = BufferGeometry,
    TMaterial extends Material = Material,
  > extends Mesh<TGeometry, TMaterial> {
    instanceMatrix: { needsUpdate: boolean; setUsage(usage: number): void };
    instanceColor: { needsUpdate: boolean; setUsage(usage: number): void } | null;
    constructor(geometry: TGeometry, material: TMaterial, count: number);
    setMatrixAt(index: number, matrix: Matrix4): void;
    setColorAt(index: number, color: Color): void;
    dispose(): void;
  }

  export class Points<
    TGeometry extends BufferGeometry = BufferGeometry,
    TMaterial extends Material = Material,
  > extends Object3D {
    geometry: TGeometry;
    material: TMaterial;
    constructor(geometry?: TGeometry, material?: TMaterial);
  }

  export class Sprite extends Object3D {
    material: SpriteMaterial;
    constructor(material?: SpriteMaterial);
  }

  export class DirectionalLight extends Object3D {
    intensity: number;
    color: Color;
    constructor(color?: number | string | Color, intensity?: number);
  }

  export class PointLight extends Object3D {
    intensity: number;
    color: Color;
    constructor(
      color?: number | string | Color,
      intensity?: number,
      distance?: number,
      decay?: number,
    );
  }
}

declare module "three/addons/postprocessing/EffectComposer.js" {
  import type { WebGLRenderer, WebGLRenderTarget } from "three";
  export interface PostProcessingPass {
    dispose?: () => void;
    setSize?: (width: number, height: number) => void;
  }
  export class EffectComposer {
    constructor(renderer: WebGLRenderer, renderTarget?: WebGLRenderTarget);
    setPixelRatio(pixelRatio: number): void;
    setSize(width: number, height: number): void;
    addPass(pass: PostProcessingPass): void;
    render(deltaTime?: number): void;
    dispose(): void;
  }
}

declare module "three/addons/postprocessing/RenderPass.js" {
  import type { PerspectiveCamera, Scene } from "three";
  import type { PostProcessingPass } from "three/addons/postprocessing/EffectComposer.js";
  export class RenderPass implements PostProcessingPass {
    constructor(scene: Scene, camera: PerspectiveCamera);
    dispose(): void;
  }
}

declare module "three/addons/postprocessing/UnrealBloomPass.js" {
  import type { Vector2 } from "three";
  import type { PostProcessingPass } from "three/addons/postprocessing/EffectComposer.js";
  export class UnrealBloomPass implements PostProcessingPass {
    strength: number;
    radius: number;
    threshold: number;
    constructor(
      resolution: Vector2,
      strength?: number,
      radius?: number,
      threshold?: number,
    );
    setSize(width: number, height: number): void;
    dispose(): void;
  }
}

declare module "three/addons/postprocessing/ShaderPass.js" {
  import type { IUniform, ShaderMaterial } from "three";
  import type { PostProcessingPass } from "three/addons/postprocessing/EffectComposer.js";
  export class ShaderPass implements PostProcessingPass {
    uniforms: Record<string, IUniform>;
    material: ShaderMaterial;
    constructor(shader: {
      uniforms: Record<string, IUniform>;
      vertexShader: string;
      fragmentShader: string;
    });
    dispose(): void;
  }
}

declare module "three/addons/postprocessing/OutputPass.js" {
  import type { PostProcessingPass } from "three/addons/postprocessing/EffectComposer.js";
  export class OutputPass implements PostProcessingPass {
    dispose(): void;
  }
}

declare module "three/addons/lines/LineSegmentsGeometry.js" {
  import type { BufferGeometry, EdgesGeometry } from "three";
  export class LineSegmentsGeometry extends BufferGeometry {
    setPositions(array: number[] | Float32Array): this;
    fromEdgesGeometry(geometry: EdgesGeometry): this;
  }
}

declare module "three/addons/lines/LineMaterial.js" {
  import type { Color, Material, Vector2 } from "three";
  export class LineMaterial extends Material {
    color: Color;
    linewidth: number;
    resolution: Vector2;
    dashed: boolean;
    dashSize: number;
    gapSize: number;
    dashOffset: number;
    worldUnits: boolean;
    userData: Record<string, unknown>;
    constructor(parameters?: {
      color?: number | string | Color;
      linewidth?: number;
      transparent?: boolean;
      opacity?: number;
      dashed?: boolean;
      dashSize?: number;
      gapSize?: number;
      worldUnits?: boolean;
    });
  }
}

declare module "three/addons/lines/LineSegments2.js" {
  import type { Object3D } from "three";
  import type { LineMaterial } from "three/addons/lines/LineMaterial.js";
  import type { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
  export class LineSegments2 extends Object3D {
    geometry: LineSegmentsGeometry;
    material: LineMaterial;
    constructor(geometry: LineSegmentsGeometry, material: LineMaterial);
    computeLineDistances(): this;
  }
}

declare module "three/addons/environments/RoomEnvironment.js" {
  import type { Scene } from "three";
  export class RoomEnvironment extends Scene {
    dispose(): void;
  }
}
