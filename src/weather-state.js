// One concurrent condition: warm sunshine, a few clouds, and gentle rain.
// Rain is intentionally independent of cloud cover and directional-light strength.
export const WEATHER=Object.freeze({
  label:'晴 · 少云 · 小雨',
  rain:.65,
  wetness:.58,
  sun:4.8,
  fill:1.25,
  environment:.65,
  exposure:1.1,
  fogNear:95,
  fogFar:320,
  haze:.55,
});
