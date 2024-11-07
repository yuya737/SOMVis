/*
 * Copyright (c) 2021-2022 WeatherLayers.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
// import { distance as geodesyDistance } from 'geodesy-fn/src/spherical.ts'

// radius used by deck.gl, see https://github.com/visgl/deck.gl/blob/master/modules/core/src/viewports/globe-viewport.js#L10
export const DEFAULT_RADIUS = 6370972

// export function distance(start, destination) {
  // return geodesyDistance(start, destination, DEFAULT_RADIUS)
// };

export function distance(start, destination) {
  return Math.sqrt(destination[0]-start[0]*destination[0]-start[0] + destination[1]-start[1]*destination[1]-start[1]);
};
