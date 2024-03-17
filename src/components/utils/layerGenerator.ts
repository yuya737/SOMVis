import type { LayersList, MapViewState, Layer } from "@deck.gl/core/typed";

// My implementation of essentially a Composite Layer with explicit support for DataFitlerExtension for e.g. because it just returns a list of base layers

export interface ILayerGenerator {
    needsToRedraw: boolean;
    layerList: LayersList;

    checkNeedsToRedraw(): boolean;
    getLayers(): LayersList;
}
