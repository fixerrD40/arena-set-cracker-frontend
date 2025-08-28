export enum Color {
  W = 'W',
  U = 'U',
  B = 'B',
  R = 'R',
  G = 'G',
}

export const ColorDisplayNames: Record<Color, string> = {
  [Color.W]: 'White',
  [Color.U]: 'Blue',
  [Color.B]: 'Black',
  [Color.R]: 'Red',
  [Color.G]: 'Green',
};

export interface ColorIdentity {
  primary: Color;
  colors: Color[];
}