import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLECTION_RARITIES } from '../../../shared/models/card/arena-collection.filter';
import { SetAssignmentMetrics } from '../../../shared/models/discovery/set-assignment-metrics';

@Component({
  selector: 'app-set-assignment-metrics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './set-assignment-metrics.html',
  styleUrls: ['./set-assignment-metrics.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetAssignmentMetricsComponent {
  public readonly metrics = input.required<SetAssignmentMetrics>();
  public readonly rarities = COLLECTION_RARITIES;
}
