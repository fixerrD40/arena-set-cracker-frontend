import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MtgCard } from '../../models/card/card';
import { cardArtUri } from '../../models/card/card.art';

@Component({
  selector: 'app-card-hover-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-hover-preview.html',
  styleUrls: ['./card-hover-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardHoverPreviewComponent {
  public readonly card = input.required<MtgCard>();
  public readonly top = input.required<number>();
  public readonly left = input.required<number>();
  public readonly width = input.required<number>();

  public readonly cardArtUri = cardArtUri;
}
