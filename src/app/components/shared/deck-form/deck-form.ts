import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { Color, ColorDisplayNames } from '../../../models/color';

@Component({
  selector: 'app-deck-form',
  standalone: true,
  templateUrl: './deck-form.html',
  styleUrls: ['./deck-form.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule
  ]
})
export class DeckFormComponent implements OnInit {
  @Input() initialValues?: Partial<{
    name: string;
    arenaDeck: string | null;
    primaryColor: Color | null;
    colors: Color[];
  }>;

  @Output() submitted = new EventEmitter<{
    name: string;
    arenaDeck: string | null;
    primaryColor: Color;
    colors: Color[];
  }>();

  form: FormGroup<{
  name: FormControl<string>;
  arenaDeck: FormControl<string | null>;
  primaryColor: FormControl<Color | null>;
  colors: FormControl<Color[]>;
}> = new FormGroup({
  name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  arenaDeck: new FormControl(''),
  primaryColor: new FormControl<Color | null>(null, { validators: [Validators.required] }),
  colors: new FormControl<Color[]>([], { nonNullable: true, validators: [Validators.required] }),
});

  readonly allColors: Color[] = Object.values(Color) as Color[];

  ngOnInit(): void {
    if (this.initialValues) {
      this.form.patchValue(this.initialValues);
    }
  }

  getColorName(code: Color): string {
    return ColorDisplayNames[code];
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.submitted.emit(this.form.value as {
      name: string;
      arenaDeck: string | null;
      primaryColor: Color;
      colors: Color[];
    });
  }
}
