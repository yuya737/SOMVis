/*
 * Copyright (c) 2021-2022 WeatherLayers.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
export default `\
#version 300 es
#define SHADER_NAME particle-layer-update-transform-vertex-shader

precision highp float;

in vec3 sourcePosition;
out vec3 targetPosition;

uniform bool viewportGlobe;
uniform vec2 viewportGlobeCenter;
uniform float viewportGlobeRadius;
uniform vec4 viewportBounds;
uniform float viewportZoomChangeFactor;

uniform sampler2D bitmapTexture;
uniform vec2 imageUnscale;
uniform vec4 bounds;

uniform float numParticles;
uniform float maxAge;
uniform float speedFactor;

uniform float time;
uniform float seed;

uniform float animationProgress;

const vec2 DROP_POSITION = vec2(0);

bool isNaN(float value) {
  return !(value <= 0. || 0. <= value);
}


// see https://stackoverflow.com/a/27228836/1823988
float atan2(float y, float x) {
  return x == 0. ? sign(y) * PI / 2. : atan(y, x);
}

// see https://github.com/chrisveness/geodesy/blob/master/latlon-spherical.js#L187
float distanceTo(vec2 from, vec2 point) {
  float y1 = radians(from.y);
  float x1 = radians(from.x);
  float y2 = radians(point.y);
  float x2 = radians(point.x);
  float dy = y2 - y1;
  float dx = x2 - x1;

  float a = sin(dy / 2.) * sin(dy / 2.) + cos(y1) * cos(y2) * sin(dx / 2.) * sin(dx / 2.);
  float c = 2. * atan2(sqrt(a), sqrt(1. - a));
  float d = EARTH_RADIUS * c;

  return d;
}

vec2 longLatToCartesian(vec2 longLat) {
  float distance = distanceTo(vec2(0), longLat);
  float bearing = atan(longLat.y, longLat.x);

  float x = distance * cos(bearing);
  float y = distance * sin(bearing);

  return vec2(x, y);

}

// see https://github.com/chrisveness/geodesy/blob/master/latlon-spherical.js#L360
vec2 destinationPoint(vec2 from, float dist, float bearing) {
  float d = dist / EARTH_RADIUS;
  float r = radians(bearing);

  float y1 = radians(from.y);
  float x1 = radians(from.x);

  float siny2 = sin(y1) * cos(d) + cos(y1) * sin(d) * cos(r);
  float y2 = asin(siny2);
  float y = sin(r) * sin(d) * cos(y1);
  float x = cos(d) - sin(y1) * siny2;
  float x2 = x1 + atan2(y, x);

  float lat = degrees(y2);
  float lon = degrees(x2);

  return vec2(lon, lat);
}

// longitude wrapping allows rendering in a repeated MapView
float wrapLongitude(float lng) {
  float wrappedLng = mod(lng + 180., 360.) - 180.;
  return wrappedLng;
}

float wrapLongitude(float lng, float minLng) {
  float wrappedLng = wrapLongitude(lng);
  if (wrappedLng < minLng) {
    wrappedLng += 360.;
  }
  return wrappedLng;
}

float randFloat(vec2 seed) {
  return fract(sin(dot(seed.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 randPoint(vec2 seed) {
  return vec2(randFloat(seed + 1.3), randFloat(seed + 2.1));
}

vec2 pointToPosition(vec2 point) {
  if (viewportGlobe) {
    point.x += 0.0001; // prevent generating point in the center
    float dist = sqrt(point.x) * viewportGlobeRadius;
    float bearing = point.y * 360.;
    return destinationPoint(viewportGlobeCenter, dist, bearing);
  } else {
    vec2 viewportBoundsMin = viewportBounds.xy;
    vec2 viewportBoundsMax = viewportBounds.zw;
    return mix(viewportBoundsMin, viewportBoundsMax, point);
  }
}

bool isPositionInBounds(vec2 position, vec4 bounds) {
  vec2 boundsMin = bounds.xy;
  vec2 boundsMax = bounds.zw;
  float lng = wrapLongitude(position.x, boundsMin.x);
  float lat = position.y;
  return (
    boundsMin.x <= lng && lng <= boundsMax.x &&
    boundsMin.y <= lat && lat <= boundsMax.y
  );
}

bool isPositionInViewport(vec2 position) {
  if (viewportGlobe) {
    return distanceTo(viewportGlobeCenter, position) <= viewportGlobeRadius;
  } else {
    return isPositionInBounds(position, viewportBounds);
  }
}

// bitmapTexture is in COORDINATE_SYSTEM.LNGLAT
// no coordinate conversion needed
vec2 getUV(vec2 pos) {
  return vec2(
    (pos.x - bounds[0]) / (bounds[2] - bounds[0]),
    (pos.y - bounds[1]) / (bounds[3] - bounds[1])
  );
}

bool raster_has_values(vec4 values) {
  // if (imageUnscale[0] < imageUnscale[1]) {
  //   return values.a == 1.;
  // } else {
  //   return !isNaN(values.x);
  // }
  // return true;
  return values.w > 0.;
}

vec2 raster_get_values(vec4 color) {
  if (imageUnscale[0] < imageUnscale[1]) {
    return mix(vec2(imageUnscale[0]), vec2(imageUnscale[1]), color.xy);
  } else {
    return color.xy;
  }
}

// src: https://webglfundamentals.org/webgl/lessons/webgl-qna-how-to-simulate-a-3d-texture-in-webgl.html
vec4 sampleAs3DTexture(sampler2D tex, vec3 texCoord, float size) {
    float sliceSize = 1.0 / size;                         // space of 1 slice
    float slicePixelSize = sliceSize / size;              // space of 1 pixel
    float sliceInnerSize = slicePixelSize * (size - 1.0); // space of size pixels
    float zSlice0 = min(floor(texCoord.z * size), size - 1.0);
    float zSlice1 = min(zSlice0 + 1.0, size - 1.0);
    float xOffset = slicePixelSize * 0.5 + texCoord.x * sliceInnerSize;
    float s0 = xOffset + (zSlice0 * sliceSize);
    float s1 = xOffset + (zSlice1 * sliceSize);
    vec4 slice0Color = texture2D(tex, vec2(s0, texCoord.y));
    vec4 slice1Color = texture2D(tex, vec2(s1, texCoord.y));
    float zOffset = mod(texCoord.z * size, 1.0);
    return mix(slice0Color, slice1Color, zOffset);
}

void main() {
  float particleIndex = mod(float(gl_VertexID), numParticles);
  float particleAge = floor(float(gl_VertexID) / numParticles);

  // update particles age0
  // older particles age1-age(N-1) are copied with buffer.copyData
  if (particleAge > 0.) {
    return;
  }

  if (sourcePosition.xy == DROP_POSITION) {
    // generate random position to prevent converging particles
    vec2 particleSeed = vec2(particleIndex * seed / numParticles);
    vec2 point = randPoint(particleSeed);
    vec2 position = pointToPosition(point);
    targetPosition.xy = position;
    targetPosition.x = wrapLongitude(targetPosition.x);
    // targetPosition.z = 10.;
    return;
  }

  if (!isPositionInBounds(sourcePosition.xy, bounds)) {
    // drop out of bounds
    targetPosition.xy = DROP_POSITION;
    return;
  }

  if (!isPositionInViewport(sourcePosition.xy)) {
    // drop out of viewport
    targetPosition.xy = DROP_POSITION;
    return;
  }

  if (viewportZoomChangeFactor > 1. && mod(particleIndex, viewportZoomChangeFactor) >= 1.) {
    // drop when zooming out
    targetPosition.xy = DROP_POSITION;
    return;
  }

  if (abs(mod(particleIndex, maxAge + 2.) - mod(time, maxAge + 2.)) < 1.) {
    // drop by maxAge, +2 because only non-randomized pairs are rendered
    targetPosition.xy = DROP_POSITION;
    return;
  }

  vec2 uv = getUV(sourcePosition.xy);
  vec4 bitmapColor = texture2D(bitmapTexture, uv);

  if (!raster_has_values(bitmapColor)) {
    // drop nodata
    targetPosition.xy = DROP_POSITION;
    return;
  }

  // update position
  vec2 speed = raster_get_values(bitmapColor) * speedFactor;
  //vec2 speed = vec2(animationProgress, animationProgress) * speedFactor * 100.;
  //vec2 speed = bitmapColor.xy * speedFactor;
  //vec2 speed = vec2(100., -100.);
  // float dist = sqrt(speed.x * speed.x + speed.y + speed.y) * 10000.;
  // float bearing = degrees(-atan2(speed.y, speed.x));
  // targetPosition.xy = destinationPoint(sourcePosition.xy, dist, bearing);
  // float distortion = cos(radians(sourcePosition.y));
  float distortion = 1.;
  vec2 offset = vec2(speed.x / distortion, speed.y);
  // offset = vec2(15.,15.);
  targetPosition.xy = sourcePosition.xy + offset;
  // targetPosition.z = 10.;
  // targetPosition.x = wrapLongitude(targetPosition.x);
  // targetPosition.xy *= 10000.;
  // targetPosition.xy = vec2(15.,15.);
  // targetPosition.xy = longLatToCartesian(targetPosition.xy); 
  // targetPosition.xy = vec2(0);
}
`
