export class ScryfallSet {
  id!: string;
  code!: string;
  name!: string;
  digital!: boolean;
  released_at?: string;
  icon_svg_uri?: string;

  constructor(init?: Partial<ScryfallSet>) {
    if (init) {
      Object.assign(this, init);
    }
  }

  get cleanCode(): string {
    return this.code ? this.code.toLowerCase().trim() : '';
  }
}
