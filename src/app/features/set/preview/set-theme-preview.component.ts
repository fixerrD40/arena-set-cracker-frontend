import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  input,
  NgZone,
  OnDestroy,
  OnInit,
  output,
  ViewChild
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, combineLatest, map, Subject } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';

import { MtgCard } from '../../../shared/models/card/card';
import { cardArtUri } from '../../../shared/models/card/card.art';
import {
  buildThemePreviewPageView,
  buildThemePreviewState,
  computeThemePreviewLayout,
  DEFAULT_THEME_PREVIEW_LAYOUT,
  ThemePreviewLayout,
  ThemePreviewPageView
} from '../set.board';

@Component({
  selector: 'app-set-theme-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './set-theme-preview.html',
  styleUrls: ['./set-theme-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetThemePreviewComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  public readonly pool = input.required<readonly MtgCard[]>();
  public readonly selectedTheme = input<string | null>(null);

  public readonly themeClear = output<string>();

  public readonly cardArtUri = cardArtUri;

  private readonly themePreviewPage$ = new BehaviorSubject(0);
  private readonly themePreviewLayout$ = new BehaviorSubject<ThemePreviewLayout>(DEFAULT_THEME_PREVIEW_LAYOUT);
  private latestPageView: ThemePreviewPageView | null = null;
  private previewResizeObserver?: ResizeObserver;
  private previewLayoutRecalc?: () => void;
  private previewWheelGate = false;

  private readonly themePreview$ = combineLatest({
    pool: toObservable(this.pool),
    theme: toObservable(this.selectedTheme)
  }).pipe(map(({ pool, theme }) => buildThemePreviewState(pool, theme)));

  public readonly pageView$ = combineLatest({
    preview: this.themePreview$,
    page: this.themePreviewPage$.asObservable(),
    layout: this.themePreviewLayout$.asObservable()
  }).pipe(
    map(({ preview, page, layout }) => {
      const view = buildThemePreviewPageView(preview, page, layout);
      this.latestPageView = view;
      return view;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  @ViewChild('themePreviewStage')
  set themePreviewStageRef(ref: ElementRef<HTMLElement> | undefined) {
    this.unbindThemePreviewLayout();
    if (ref) {
      this.bindThemePreviewLayout(ref.nativeElement);
    }
  }

  public ngOnInit(): void {
    toObservable(this.selectedTheme)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.themePreviewPage$.next(0);
      });
  }

  public ngAfterViewInit(): void {
    this.host.nativeElement.addEventListener('wheel', this.onPreviewWheelNative, { passive: false });
  }

  public ngOnDestroy(): void {
    this.host.nativeElement.removeEventListener('wheel', this.onPreviewWheelNative);
    this.unbindThemePreviewLayout();
    this.destroy$.next();
    this.destroy$.complete();
  }

  public recalcLayout(): void {
    this.previewLayoutRecalc?.();
  }

  private handleWheel(event: WheelEvent): boolean {
    const view = this.latestPageView;
    if (!view || view.pageCount <= 1) {
      return false;
    }
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return false;
    }

    event.preventDefault();
    if (this.previewWheelGate || event.deltaY === 0) {
      return true;
    }

    this.previewWheelGate = true;
    window.setTimeout(() => {
      this.previewWheelGate = false;
    }, 90);

    if (event.deltaY > 0) {
      this.nextPage();
    } else {
      this.prevPage();
    }
    return true;
  }

  public prevPage(): void {
    const view = this.latestPageView;
    if (view && view.page > 0) {
      this.themePreviewPage$.next(view.page - 1);
      this.cdr.markForCheck();
    }
  }

  public nextPage(): void {
    const view = this.latestPageView;
    if (view && view.page + 1 < view.pageCount) {
      this.themePreviewPage$.next(view.page + 1);
      this.cdr.markForCheck();
    }
  }

  private readonly onPreviewWheelNative = (event: WheelEvent): void => {
    this.ngZone.run(() => {
      this.handleWheel(event);
    });
  };

  private bindThemePreviewLayout(stage: HTMLElement): void {
    const themePreview = stage.closest('.theme-preview');

    const recalc = (): void => {
      if (stage.clientWidth <= 0 || stage.clientHeight <= 0) {
        return;
      }
      this.ngZone.run(() => {
        this.themePreviewLayout$.next(computeThemePreviewLayout(stage));
      });
    };

    this.previewLayoutRecalc = recalc;
    this.previewResizeObserver = new ResizeObserver(() => recalc());
    this.previewResizeObserver.observe(stage);
    if (themePreview instanceof HTMLElement) {
      this.previewResizeObserver.observe(themePreview);
    }
    window.addEventListener('resize', recalc, { passive: true });
    recalc();
  }

  private unbindThemePreviewLayout(): void {
    this.previewResizeObserver?.disconnect();
    this.previewResizeObserver = undefined;

    if (this.previewLayoutRecalc) {
      window.removeEventListener('resize', this.previewLayoutRecalc);
    }

    this.previewLayoutRecalc = undefined;
  }
}
