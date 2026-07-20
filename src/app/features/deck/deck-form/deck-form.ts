import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-deck-form',
  standalone: true,
  templateUrl: './deck-form.html',
  styleUrls: ['./deck-form.css'],
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule
  ]
})
export class DeckForm implements OnInit {
  // 1. Inputs strictly matched to your smart view component defaults
  @Input() initialValues?: Partial<{
    name: string;
    arenaDeck: string | null;
  }>;

  // 2. Output emits exactly what the smart view's handleSubmit method expects
  @Output() submitted = new EventEmitter<{
    name: string;
    arenaDeck: string | null;
  }>();

  // 3. Strongly typed form layout completely cleared of color properties
  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    arenaDeck: new FormControl<string | null>('')
  });

  ngOnInit(): void {
    if (this.initialValues) {
      this.form.patchValue(this.initialValues);
    }
  }

  onSubmit() {
    if (this.form.invalid) return;

    // 4. Emit clean name and text blob data back up to the smart container
    this.submitted.emit(this.form.getRawValue());
  }
}
