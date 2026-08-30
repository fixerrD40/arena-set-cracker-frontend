import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { MANA_COLORS, ManaColor } from '../../../shared/models/card/arena-collection.filter';
import { Color, ColorDisplayNames } from '../../../shared/models/color';

@Component({
  selector: 'app-set-discovery-pool',
  standalone: true,
  imports: [CommonModule, MatSlideToggleModule],
  templateUrl: './set-discovery-pool.html',
  styleUrls: ['./set-discovery-pool.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetDiscoveryPoolComponent {
  public readonly scoped = input.required<number>();
  public readonly remaining = input.required<number>();
  public readonly total = input.required<number>();
  public readonly scopedColors = input.required<readonly ManaColor[]>();
  public readonly drainNeedsWork = input.required<boolean>();

  public readonly colorScopeChange = output<ManaColor>();
  public readonly drainNeedsWorkChange = output<boolean>();

  public readonly manaColors = MANA_COLORS;

  public colorLabel(code: ManaColor): string {
    return ColorDisplayNames[code as Color];
  }

  public isColorScoped(color: ManaColor): boolean {
    return this.scopedColors().includes(color);
  }

  public toggleColorScope(color: ManaColor): void {
    this.colorScopeChange.emit(color);
  }
}
