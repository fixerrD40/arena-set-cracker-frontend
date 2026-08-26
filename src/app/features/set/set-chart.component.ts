import { Component, Input, ViewChild, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';

import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-set-chart',
  standalone: true,
  imports: [BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div style="display: block; width: 100%; height: 300px;">
      <canvas baseChart
              [data]="chartData"
              [options]="chartOptions"
              [type]="'bar'">
      </canvas>
    </div>
  `
})
export class SetChartComponent implements OnChanges {
  @Input() chartData!: ChartConfiguration<'bar'>['data'];

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartData'] && !changes['chartData'].firstChange) {
      this.chart?.update();
    }
  }
}
