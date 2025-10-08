import { CoffeeLiquidMat } from '../components/3d/materials/CoffeeLiquidMaterial';
import { Material } from 'three';

declare module '@react-three/fiber' {
  interface ThreeElements {
    coffeeLiquidMat: ReactThreeFiber.Object3DNode<
      CoffeeLiquidMat & Material,
      typeof CoffeeLiquidMat
    >;
  }
}
