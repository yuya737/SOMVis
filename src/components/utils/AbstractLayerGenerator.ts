import type { LayersList } from "@deck.gl/core/typed";

// My simple implementation of essentially a Composite Layer
// with explicit needsToRedraw method to simplify the logic

export abstract class AbstractLayerGenerator {
  needsToRedraw: boolean;
  layerList: LayersList;

  checkNeedsToRedraw(): boolean {
    return this.needsToRedraw;
  }
  abstract getLayers(): LayersList;
}