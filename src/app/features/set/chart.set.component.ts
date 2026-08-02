import { Component, Input, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-set-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
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
export class SetChart implements OnChanges {
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
