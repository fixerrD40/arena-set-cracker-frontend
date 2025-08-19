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

export class ColorUtils {
  static getDisplayName(color: keyof typeof Color): string {
    return Color[color];
  }

  static fromDisplayName(name: string): keyof typeof Color | undefined {
    return (Object.entries(Color) as [keyof typeof Color, string][])
      .find(([_, display]) => display.toLowerCase() === name.toLowerCase())
      ?.[0];
  }
}