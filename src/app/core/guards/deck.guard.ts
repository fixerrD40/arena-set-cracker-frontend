// ─── src/app/core/guards/deck.guard.ts ───
import { inject, Component } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { firstValueFrom } from 'rxjs';

// Absolute or relative path targets tracking down to your service layer and viewport component
import { DeckService } from '../services/deck.service'; // Adjust path tracking to your services location
import { Deck } from '../../features/deck/deck.component';

export type DeckGuardChoice = 'SAVE' | 'DISCARD' | 'ABORT';

// 🌟 STRICT COMPILATION INTERFACE
export interface DeckGuardDialogData {
  errors: string[];
  hasErrors: boolean;
}

@Component({
  selector: 'app-deck-guard-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Unsaved Changes Detected</h2>
    <mat-dialog-content>
      <!-- 🌟 FIX: Checked with strict boolean fallback configuration arrays -->
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
      <!-- 🌟 FIX: Strict property access passes without warnings -->
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

// 2. 🌟 FUNCTIONAL ROUTE TRANSACTION GUARD
export const deckGuard: CanDeactivateFn<Deck> = async (component: Deck) => {
  const deckService = inject(DeckService);
  const dialog = inject(MatDialog);

  // Evaluate the reactive stateful dirty property tracking engine
  const isDirty = await firstValueFrom(deckService.isDirty$);
  if (!isDirty) {
    return true; // Workspace matches database disk baseline, allow path transition natively
  }

  // Poll localized structural parameters and validation errors from components view
  const validationResult = component.runDeckValidations();

  // Initialize Material overlay layout drawer frame container
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

      // Force direct mapping serialization block step and complete database update task transaction
      await firstValueFrom(deckService.flush());
      return true;

    case 'DISCARD':
      // Navigation is allowed to bypass safely. Component teardown handles state flushing.
      return true;

    case 'ABORT':
    default:
      // Cancel route sequence; clamp viewport frame inside current page location boundaries
      return false;
  }
};
