import { inject, Component, ChangeDetectionStrategy } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { firstValueFrom } from 'rxjs';

import { DeckService } from '../services/deck.service';
import { DeckComponent } from '../../features/deck/deck.component';

export type DeckGuardChoice = 'SAVE' | 'DISCARD' | 'ABORT';

export interface DeckGuardDialogData {
  errors: string[];
  hasErrors: boolean;
}

@Component({
  selector: 'app-deck-guard-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>Unsaved Changes Detected</h2>
    <mat-dialog-content>
      @if (dialogData.errors.length > 0) {
        <div class="validation-warning-block" style="color: #d32f2f; margin-bottom: 16px;">
          <p><strong>Warning: Your changes are currently invalid and cannot be saved:</strong></p>
          <ul>
            @for (error of dialogData.errors; track error) {
              <li>{{ error }}</li>
            }
          </ul>
        </div>
      }
      <p>Would you like to save your modifications before navigating away from this workspace layout?</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button color="warn" [disabled]="dialogData.hasErrors" (click)="closeWith('SAVE')">Save</button>
      <button mat-button color="accent" (click)="closeWith('DISCARD')">Discard Changes</button>
      <button mat-flat-button (click)="closeWith('ABORT')">Abort Navigation</button>
    </mat-dialog-actions>
  `
})
export class DeckGuardDialog {
  private readonly dialogRef = inject(MatDialogRef<DeckGuardDialog>);
  public readonly dialogData = inject<DeckGuardDialogData>(MAT_DIALOG_DATA);

  public closeWith(choice: DeckGuardChoice): void {
    this.dialogRef.close(choice);
  }
}

/** Blocks leaving a dirty deck until the user saves, discards, or cancels. */
export const deckGuard: CanDeactivateFn<DeckComponent> = async (component: DeckComponent) => {
  const deckService = inject(DeckService);
  const dialog = inject(MatDialog);

  const isDirty = await firstValueFrom(deckService.isDirty$);
  if (!isDirty) {
    return true;
  }

  const validationResult = component.runDeckValidations();

  const dialogRef = dialog.open(DeckGuardDialog, {
    width: '480px',
    disableClose: true,
    data: {
      errors: validationResult.errors,
      hasErrors: !validationResult.valid
    }
  });

  const userChoice: DeckGuardChoice | undefined = await firstValueFrom(dialogRef.afterClosed());

  switch (userChoice) {
    case 'SAVE':
      if (!validationResult.valid) return false;
      await firstValueFrom(deckService.flush());
      return true;

    case 'DISCARD':
      return true;

    case 'ABORT':
    default:
      return false;
  }
};
