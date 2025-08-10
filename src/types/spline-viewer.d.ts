// Allow custom Spline element in TSX
// This file augments JSX so <spline-viewer /> is recognized by TypeScript.
declare namespace JSX {
  interface IntrinsicElements {
    'spline-viewer': any;
  }
}
