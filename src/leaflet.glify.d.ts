import * as L from 'leaflet';

declare module 'leaflet' {
  namespace glify {
    interface GlifyColor {
      r: number; // 0–1
      g: number; // 0–1
      b: number; // 0–1
      a?: number; // 0–1
    }

    interface PointsOptions {
      map: L.Map;
      data: [number, number][] | GeoJSON.FeatureCollection;
      size?: number | ((index: number, point: [number, number]) => number);
      color?:
        | GlifyColor
        | ((index: number, point: [number, number]) => GlifyColor);
      opacity?: number;
      click?: (
        e: L.LeafletMouseEvent,
        feature: [number, number],
        xy: { x: number; y: number }
      ) => boolean | void;
      hover?: (
        e: L.LeafletMouseEvent,
        feature: [number, number],
        xy: { x: number; y: number }
      ) => boolean | void;
      hoverOff?: (
        e: L.LeafletMouseEvent,
        feature: [number, number],
        xy: { x: number; y: number }
      ) => boolean | void;
      sensitivity?: number;
      sensitivityHover?: number;
      pane?: string;
      className?: string;
      fragmentShaderSource?: string | (() => string);
      vertexShaderSource?: string | (() => string);
    }

    interface PointsInstance {
      remove(): this;
      update(data: [number, number][], index?: number): this;
      render(): this;
      resetVertices(): this;
      canvas: HTMLCanvasElement;
      gl: WebGLRenderingContext;
      settings: PointsOptions;
    }

    interface LinesOptions {
      map: L.Map;
      data: GeoJSON.FeatureCollection | [number, number][][];
      color?:
        | GlifyColor
        | ((index: number, feature: unknown) => GlifyColor);
      weight?: number | ((index: number, feature: unknown) => number);
      opacity?: number;
      click?: (
        e: L.LeafletMouseEvent,
        feature: unknown,
        xy: { x: number; y: number }
      ) => boolean | void;
      sensitivity?: number;
      pane?: string;
      className?: string;
    }

    interface LinesInstance {
      remove(): this;
      render(): this;
    }

    interface ShapesOptions {
      map: L.Map;
      data: GeoJSON.FeatureCollection;
      color?:
        | GlifyColor
        | ((index: number, feature: unknown) => GlifyColor);
      opacity?: number;
      click?: (
        e: L.LeafletMouseEvent,
        feature: unknown,
        xy: { x: number; y: number }
      ) => boolean | void;
      sensitivity?: number;
      pane?: string;
      className?: string;
    }

    interface ShapesInstance {
      remove(): this;
      render(): this;
    }

    function points(options: PointsOptions): PointsInstance;
    function lines(options: LinesOptions): LinesInstance;
    function shapes(options: ShapesOptions): ShapesInstance;

    /** Longitudinal wrapping helper */
    function longitudeFirst(): void;
    function latitudeFirst(): void;
  }
}

export {};
