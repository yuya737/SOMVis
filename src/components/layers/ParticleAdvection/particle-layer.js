/*
 * Copyright (c) 2021-2022 WeatherLayers.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { LineLayer } from '@deck.gl/layers/typed'
import { isWebGL2, Buffer, Transform, readPixelsToArray } from '@luma.gl/core'
import { isViewportGlobe, getViewportGlobeCenter, getViewportGlobeRadius, getViewportBounds } from './utils/viewport.js'
import updateTransformVs from './particle-layer-update-transform.vs.glsl'

import distance from "@turf/distance";
import bearing from "@turf/bearing";

const FPS = 30

const DEFAULT_COLOR = [255, 255, 255, 255]

const defaultProps = {
  ...LineLayer.defaultProps,
  data: [],

  image: { type: 'image', value: null, async: true },
  tempHumidityImage: { type: 'image', value: null, async: true },
  imageUnscale: { type: 'array', value: null },

  numParticles: { type: 'number', min: 1, max: 1000000, value: 5000 },
  maxAge: { type: 'number', min: 1, max: 255, value: 100 },
  speedFactor: { type: 'number', min: 0, max: 1, value: 1 },

  animationProgress: { type: 'number', min: 0, max: 1, value: 0 },

  color: { type: 'color', value: DEFAULT_COLOR },
  // 0: No color (i.e. default), 1: Temperature, 2: Humidity
  colorSetting: { type: 'number', min: 0, max: 2, value: 0 },
  width: { type: 'number', value: 1 },
  age: { type: 'array', value: null },
  animate: true,

  bounds: { type: 'array', value: [-180, -90, 180, 90], compare: true },
  coolwarmReds: { type: 'array', value: null },
  coolwarmGreens: { type: 'array', value: null },
  coolwarmBlues: { type: 'array', value: null },

  wrapLongitude: true,
}

export default class ParticleLayer extends LineLayer {
  getShaders() {
    return {
      ...super.getShaders(),
      inject: {
        'vs:#decl': `
          varying float drop;
          const vec2 DROP_POSITION = vec2(0);
          uniform sampler2D tempHumidityImage;
          uniform vec4 bounds;
          uniform float animationProgress;
          uniform float colorSetting;

          // For the coolwam color palette
          uniform float coolwarmReds[33];
          uniform float coolwarmGreens[33];
          uniform float coolwarmBlues[33];

          // uniform float age;
          // in float age;

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

           vec2 getUV(vec2 pos) {
             return vec2(
               (pos.x - bounds[0]) / (bounds[2] - bounds[0]),
               (pos.y - bounds[3]) / (bounds[1] - bounds[3])
             );
           }
           vec3 hsl2rgb(vec3 c){
               vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0  );
               return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
           }
           vec3 coolwarm(float t) {
               float index = floor( t / ( 1.0 / 32.0 ) );
               float index2 = min(index + 1.0, 32.0);
               return mix(
                    vec3(coolwarmReds[int(index)], coolwarmGreens[int(index)], coolwarmBlues[int(index)]),
                    vec3(coolwarmReds[int(index2)], coolwarmGreens[int(index2)], coolwarmBlues[int(index2)]),
                    t - (index * (1.0 / 32.0)));
           }
        `,
        'vs:#main-start': `

          drop = float(instanceSourcePositions.xy == DROP_POSITION || instanceTargetPositions.xy == DROP_POSITION);
        `,
        'vs:#main-end': `
          vec2 uv = getUV(instanceTargetPositions.xy);
          vec4 tempHumidity = sampleAs3DTexture(tempHumidityImage, vec3(uv, animationProgress), 4.0);

          // vColor = vec4(0.3, 0.3, 0.3, age);
          // vec3 hsl = vec3(0.0, 1.0, -tempHumidity.r/2.0+1.0);
          // vColor = vec4(hsl2rgb(hsl), instanceColors.a * opacity);
          // if (colorSetting == 1.0) {
          //   vColor = vec4(coolwarm(tempHumidity.r), instanceColors.a * opacity);
          // }
          // if (colorSetting == 2.0) {
          //   vColor = vec4(coolwarm(tempHumidity.g), instanceColors.a * opacity);
          // }
                `,

        'fs:#decl': `
          varying float drop;
        `,
        'fs:#main-start': `
          if (drop > 0.5) discard;
        `,
      },
    }
  }

  initializeState() {
    const { gl } = this.context
    if (!isWebGL2(gl)) {
      throw new Error('WebGL 2 is required')
    }

    super.initializeState({})

    this._setupTransformFeedback()

    const attributeManager = this.getAttributeManager()
    attributeManager.remove(['instanceSourcePositions', 'instanceTargetPositions', 'instanceColors', 'instanceWidths'])
  }

  updateState({ props, oldProps, changeFlags }) {
    const { numParticles, maxAge, color, width } = props

    super.updateState({ props, oldProps, changeFlags })

    if (!numParticles || !maxAge || !width) {
      this._deleteTransformFeedback()
      return
    }

    if (
      numParticles !== oldProps.numParticles ||
            maxAge !== oldProps.maxAge ||
            color[0] !== oldProps.color[0] ||
            color[1] !== oldProps.color[1] ||
            color[2] !== oldProps.color[2] ||
            color[3] !== oldProps.color[3] ||
            width !== oldProps.width
    ) {
      this._setupTransformFeedback()
    }
  }

  finalizeState() {
    this._deleteTransformFeedback()

    super.finalizeState()
  }

  draw({ uniforms }) {
    const { gl } = this.context
    if (!isWebGL2(gl)) {
      return
    }

    const { initialized } = this.state
    if (!initialized) {
      return
    }

    const { animate, bounds, animationProgress, colorSetting } = this.props
    const { sourcePositions, targetPositions, sourcePositions64Low, targetPositions64Low, colors, widths, age, model } = this.state

    model.setAttributes({
      instanceSourcePositions: sourcePositions,
      instanceTargetPositions: targetPositions,
      instanceSourcePositions64Low: sourcePositions64Low,
      instanceTargetPositions64Low: targetPositions64Low,
      instanceColors: colors,
      instanceWidths: widths,
      // age: age,
    })

    uniforms = {
      ...uniforms,
      bounds,
      animationProgress,
      colorSetting,
    }

    // Hijack the model's draw function to add the airtemp/humidity texture
    super.draw({ uniforms })

    if (animate) {
      this.requestStep()
    }
  }

  _setupTransformFeedback() {
    const { gl } = this.context
    if (!isWebGL2(gl)) {
      return
    }

    const { initialized } = this.state
    if (initialized) {
      this._deleteTransformFeedback()
    }

    const { numParticles, maxAge, color, width } = this.props

    // sourcePositions/targetPositions buffer layout:
    // |          age0         |          age1         |          age2         |...|          ageN         |
    // |pos1,pos2,pos3,...,posN|pos1,pos2,pos3,...,posN|pos1,pos2,pos3,...,posN|...|pos1,pos2,pos3,...,posN|
    const numInstances = numParticles * maxAge
    const numAgedInstances = numParticles * (maxAge - 1)
    const sourcePositions = new Buffer(gl, new Float32Array(numInstances * 3))
    const targetPositions = new Buffer(gl, new Float32Array(numInstances * 3))
    const sourcePositions64Low = new Float32Array([0, 0, 0]) // constant attribute
    const targetPositions64Low = new Float32Array([0, 0, 0]) // constant attribute
    const colors = new Buffer(gl, new Float32Array(new Array(numInstances).fill(undefined).map((_, i) => {
      const age = Math.floor(i / numParticles)
      return [color[0], color[1], color[2], (color[3] ?? 255) * (1 - age / maxAge)].map(d => d / 255)
    }).flat()))
    // const age = new Buffer(gl, 
    //   new Float32Array(new Array(numInstances).fill(undefined).map((_, i) => {
    //   const curAge = Math.floor(i / numParticles)
    //   return curAge / maxAge
    // }).flat()))
    // const age = new Float32Array(new Array(numInstances).fill(undefined).map((_, i) => {
    //   const curAge = Math.floor(i / numParticles)
    //   return curAge / maxAge
    // }).flat())

    const widths = new Float32Array([width]) // constant attribute
    // const age = new Float32Array([0.1])

    const animationProgress = new Buffer(gl, 4)

    const transform = new Transform(gl, {
      sourceBuffers: {
        sourcePosition: sourcePositions,
      },
      feedbackBuffers: {
        targetPosition: targetPositions,
      },
      feedbackMap: {
        sourcePosition: 'targetPosition',
      },
      vs: updateTransformVs,
      elementCount: numParticles,
    })

    this.setState({
      initialized: true,
      numInstances,
      numAgedInstances,
      sourcePositions,
      targetPositions,
      sourcePositions64Low,
      targetPositions64Low,
      // age,
      colors,
      widths,
      transform,
    })
  }

  _runTransformFeedback() {
    const { gl } = this.context
    if (!isWebGL2(gl)) {
      return
    }

    const { initialized } = this.state
    if (!initialized) {
      return
    }
    // console.log(image)

    const { viewport, timeline } = this.context
    const { image, imageUnscale, bounds, numParticles, speedFactor, maxAge, animationProgress } = this.props
    const { numAgedInstances, transform, previousViewportZoom, previousTime } = this.state
    const time = timeline.getTime()
    if (!image || time === previousTime) {
      return
    }
    const arr = readPixelsToArray(image)

    // viewport
    const viewportGlobe = isViewportGlobe(viewport)
    const viewportGlobeCenter = getViewportGlobeCenter(viewport)
    const viewportGlobeRadius = getViewportGlobeRadius(viewport)
    const longLatToOffset = (lngLat) => {
      const d = distance([0, 0], lngLat, {
        units: "meters",
      });
      const a = bearing([0, 0], lngLat);
      const x = d * Math.sin((a * Math.PI) / 180);
      const y = d * Math.cos((a * Math.PI) / 180);
      return [x,y]
    }
    let viewportBounds = getViewportBounds(viewport)
    viewportBounds = [...longLatToOffset([viewportBounds[0], viewportBounds[1]]), ...longLatToOffset([viewportBounds[2], viewportBounds[3]])]
    const viewportZoomChangeFactor = 2 ** ((previousViewportZoom - viewport.zoom) * 4)

    // speed factor for current zoom level
    const currentSpeedFactor = speedFactor / 2 ** (viewport.zoom + 7)

    // update particles age0
    const uniforms = {
      viewportGlobe,
      viewportGlobeCenter: viewportGlobeCenter || [0, 0],
      viewportGlobeRadius: viewportGlobeRadius || 0,
      viewportBounds: viewportBounds || [0, 0, 0, 0],
      viewportZoomChangeFactor: viewportZoomChangeFactor || 0,

      bitmapTexture: image,
      imageUnscale: imageUnscale || [0, 0],
      bounds,
      numParticles,
      maxAge,
      speedFactor: currentSpeedFactor,

      time,
      seed: Math.random(),
    }
    transform.run({ uniforms })
    // console.log("transform.run ", uniforms)

    // update particles age1-age(N-1)
    // copy age0-age(N-2) sourcePositions to age1-age(N-1) targetPositions
    const sourcePositions = transform.bufferTransform.bindings[transform.bufferTransform.currentIndex].sourceBuffers.sourcePosition
    const targetPositions = transform.bufferTransform.bindings[transform.bufferTransform.currentIndex].feedbackBuffers.targetPosition
    // console.log("sourcePositions.getData()", sourcePositions.getData())
    sourcePositions.copyData({
      sourceBuffer: targetPositions,
      readOffset: 0,
      writeOffset: numParticles * 4 * 3,
      // writeOffset: 0,
      size: numAgedInstances * 4 * 3,
    })

    transform.swap()

    // const {sourcePositions, targetPositions} = this.state;
    // console.log(uniforms, sourcePositions.getData().slice(0, 6), targetPositions.getData().slice(0, 6));

    this.state.previousViewportZoom = viewport.zoom
    this.state.previousTime = time
  }

  _resetTransformFeedback() {
    const { gl } = this.context
    if (!isWebGL2(gl)) {
      return
    }

    const { initialized } = this.state
    if (!initialized) {
      return
    }

    const { numInstances, sourcePositions, targetPositions } = this.state

    sourcePositions.subData({ data: new Float32Array(numInstances * 3) })
    targetPositions.subData({ data: new Float32Array(numInstances * 3) })
  }

  _deleteTransformFeedback() {
    const { gl } = this.context
    if (!isWebGL2(gl)) {
      return
    }

    const { initialized } = this.state
    if (!initialized) {
      return
    }

    const { sourcePositions, targetPositions, colors, transform } = this.state

    sourcePositions.delete()
    targetPositions.delete()
    colors.delete()
    transform.delete()

    this.setState({
      initialized: false,
      sourcePositions: undefined,
      targetPositions: undefined,
      sourcePositions64Low: undefined,
      targetPositions64Low: undefined,
      colors: undefined,
      widths: undefined,
      transform: undefined,
      age: undefined,
    })
  }

  requestStep() {
    const { stepRequested } = this.state
    if (stepRequested) {
      return
    }

    this.state.stepRequested = true
    setTimeout(() => {
      this.step()
      this.state.stepRequested = false
    }, 1000 / FPS)
  }

  step() {
    this._runTransformFeedback()

    this.setNeedsRedraw()
  }

  clear() {
    this._resetTransformFeedback()

    this.setNeedsRedraw()
  }
}

ParticleLayer.layerName = 'ParticleLayer'
ParticleLayer.defaultProps = defaultProps
