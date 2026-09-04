import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  output
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DeckService } from '../../../core/services/deck.service';
import { SetService } from '../../../core/services/set.service';
import { MtgDeck } from '../../../shared/models/deck/deck';
import { MtgSet } from '../../../shared/models/set/set';
import { parseArenaText, resolveArenaLinesToCardMap } from '../../../shared/models/deck/deck.utils';

@Component({
  selector: 'app-deck-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './deck-create.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./deck-create.css']
})
export class DeckCreateComponent implements OnInit {
  private readonly deckService = inject(DeckService);
  private readonly setService = inject(SetService);

  readonly dismiss = output<void>();
  readonly completed = output<MtgDeck>();

  public activeSet: MtgSet | null = null;
  public errorMessage: string | null = null;
  public strippedNotice: string | null = null;
  public clipboardHint: string | null = null;
  public isSaving = false;

  public readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    arenaDeck: new FormControl<string>('', { nonNullable: true })
  });

  public ngOnInit(): void {
    const currentWorkspace = this.setService.currentWorkspaceSnapshot;

    if (currentWorkspace?.setInfo) {
      this.activeSet = currentWorkspace.setInfo;
      void this.scrapeClipboardIfArena();
    } else {
      this.errorMessage =
        'No active set workspace. Open an installed set from the library before creating a deck.';
    }
  }

  public get hasArenaText(): boolean {
    return this.form.controls.arenaDeck.value.trim().length > 0;
  }

  public onDismiss(): void {
    if (this.isSaving) {
      return;
    }
    this.dismiss.emit();
  }

  public clearArenaDeck(): void {
    this.form.controls.arenaDeck.setValue('');
    this.clipboardHint = null;
    this.strippedNotice = null;
    this.errorMessage = null;
  }

  public loadFromClipboard(): void {
    void this.scrapeClipboardIfArena(true);
  }

  public onSubmit(): void {
    if (this.form.invalid || this.isSaving) return;
    this.errorMessage = null;
    this.strippedNotice = null;

    if (!this.activeSet?.id || !this.activeSet?.code) {
      this.errorMessage =
        'No active set workspace context has been initialized. Select an installed set before creating custom decks.';
      return;
    }

    const workspace = this.setService.currentWorkspaceSnapshot;
    if (!workspace?.cards?.length) {
      this.errorMessage = 'This set has no card catalog loaded yet. Wait for install to finish, then try again.';
      return;
    }

    const { name, arenaDeck } = this.form.getRawValue();
    const pasted = (arenaDeck || '').trim();
    let cards = new Map<string, number>();

    if (pasted) {
      const lines = parseArenaText(pasted);
      if (lines.length === 0) {
        this.errorMessage = 'Could not parse any Arena deck lines. Paste an export from MTG Arena.';
        return;
      }

      const resolved = resolveArenaLinesToCardMap(lines, workspace.cards);
      if (resolved.cards.size === 0) {
        this.errorMessage =
          'No cards from that paste matched this set’s catalog. Confirm the deck is for the set you have open.';
        return;
      }

      cards = resolved.cards;

      if (resolved.unmatched.length > 0) {
        const names = [...new Set(resolved.unmatched.map((l) => l.name))];
        this.strippedNotice = `Stripped ${resolved.unmatched.length} line(s) not in ${this.activeSet.name}: ${names.join(', ')}`;
      }
    }

    const freshDomainDeck: MtgDeck = {
      id: crypto.randomUUID(),
      setId: this.activeSet.id,
      name: name.trim(),
      status: 'concept',
      themes: [],
      notes: '',
      coverCardId: '',
      cards
    };

    this.isSaving = true;
    this.deckService.insertNewDeckPayload(freshDomainDeck).subscribe({
      next: () => {
        this.isSaving = false;
        this.completed.emit(freshDomainDeck);
      },
      error: (err) => {
        console.error('[DeckCreate] Mutation write block dropped downstream:', err);
        this.isSaving = false;
        this.errorMessage = 'An error occurred while saving the deck configuration.';
      }
    });
  }

  private async scrapeClipboardIfArena(userInitiated = false): Promise<void> {
    if (this.form.controls.arenaDeck.value.trim()) {
      return;
    }
    if (!navigator.clipboard?.readText) {
      if (userInitiated) {
        this.errorMessage = 'Clipboard is not available in this environment.';
      }
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text?.trim() || this.form.controls.arenaDeck.value.trim()) {
        if (userInitiated) {
          this.errorMessage = 'Clipboard is empty.';
        }
        return;
      }
      if (parseArenaText(text).length === 0) {
        if (userInitiated) {
          this.errorMessage = 'Clipboard does not look like an MTG Arena deck export.';
        }
        return;
      }
      this.errorMessage = null;
      this.form.controls.arenaDeck.setValue(text);
      this.clipboardHint = 'Loaded from clipboard';
    } catch {
      if (userInitiated) {
        this.errorMessage = 'Could not read the clipboard. Check app permissions and try again.';
      }
    }
  }
}
