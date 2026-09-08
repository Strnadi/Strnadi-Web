import type { Numeric } from '@/types/basic';

export interface SpectrogramRange<Payload = unknown, Id extends Numeric = Numeric> {
  id: Id;
  start: number;
  end: number;
  color?: string;
  colors?: string[];
  payload?: Payload;
}

export type SpectrogramRangeInputSource = 'primary' | 'secondary' | 'touch';

export interface SpectrogramRangeCreated<Payload = unknown> {
  range: SpectrogramRange<Payload>;
  inputSource: SpectrogramRangeInputSource;
  anchor: {
    x: number;
    y: number;
  };
}
