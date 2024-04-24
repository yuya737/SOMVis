// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

export default `\
#define SHADER_NAME graph-layer-fragment-shader

precision highp float;

uniform vec3 uEyePosition;

varying vec3 eyePos;
varying vec3 vertPos;
varying vec3 normals_out;
varying vec4 vColor;
varying float shouldDiscard;

void main(void) {
  if (shouldDiscard > 0.0) {
    discard;
  }
  // float shininessVal = 80.0;
  // float Kd = 1.0;
  // float Ks = 0.5;
  // float Ka = 0.3;
  // vec3 diffuseColor = vec3(0.1, 0.62, 0.47); 
  // vec3 ambientColor = vec3(0.5, 0.5, 0.5);
  // vec3 specularColor = vec3(1.0, 1.0, 1.0);
  // vec3 N = normalize(normals_out);
  // vec3 L = normalize(vec3(0.,0., 50.) - vertPos);
  // float lambertian = max(dot(N, L), 0.0);
  // float specular = 0.0;
  // if(lambertian > 0.0) {
  //   vec3 R = reflect(L, N);      // Reflected light vector
  //   vec3 V = normalize(vertPos - eyePos); // Vector to viewer
  //   // Compute the specular term
  //   float specAngle = max(dot(R, V), 0.0);
  //   specular = pow(specAngle, shininessVal);
  // }
  // gl_FragColor = vec4(Ka * ambientColor +
  //                     Kd * lambertian * diffuseColor +
  //                     Ks * specular * specularColor, 1.0);

  // gl_FragColor = vec4(normals_out * 0.5 + 0.5, 1.0);
  gl_FragColor = vColor;
  gl_FragColor = picking_filterPickingColor(gl_FragColor);
}
`;
