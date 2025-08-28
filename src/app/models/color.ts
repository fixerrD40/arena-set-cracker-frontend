export enum Color {
  W = 'White',
  U = 'Blue',
  B = 'Black',
  R = 'Red',
  G = 'Green',
}

export interface ColorIdentity {
  primary: Color;
  colors: Color[];
}