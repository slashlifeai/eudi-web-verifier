import { Component, inject, OnInit } from '@angular/core';
import { FormSelectableField } from '@core/models/FormSelectableField';
import { InputDescriptor } from '@core/models/presentation/InputDescriptor';
import { AttestationFormat } from '@core/models/attestation/AttestationFormat';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { SharedModule } from '@shared/shared.module';
import { AttestationType } from '@core/models/attestation/AttestationType';
import { getAttestationByFormatAndType } from '@core/constants/attestations-per-format';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { DialogData } from '@features/presentation-request-preparation/components/selectable-attestation-attributes/model/DialogData';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';

@Component({
  selector: 'vc-selectable-attestation-attributes',
  templateUrl: './selectable-attestation-attributes.component.html',
  styleUrls: ['./selectable-attestation-attributes.component.scss'],
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatExpansionModule,
    SharedModule,
    MatDialogModule,
    MatButtonModule,
    MatTabsModule,
    MatBadgeModule
  ],
})
export class SelectableAttestationAttributesComponent implements OnInit {
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  attestationType!: AttestationType;
  attestationFormat!: AttestationFormat;
  seed?:
    | {
        selectedFields: string[];
      }
    | undefined;

  formFields!: FormSelectableField[];
  selectedFields: string[] = [];

  constructor(private dialogRef: MatDialogRef<InputDescriptor>) {}

  ngOnInit(): void {
    this.attestationFormat = this.data.format;
    this.attestationType = this.data.type;
    this.seed = this.data.seed;
    this.formFields = this.extractFormFieldsFromModel();
    if (this.seed?.selectedFields) {
      this.selectedFields = this.seed.selectedFields;
    }
  }

  handle(data: FormSelectableField) {
    const value = data.value;
    console.log('Selected field: ', value);
    if (!this.exists(value)) {
      this.selectedFields.push(value);
    } else if (this.exists(value)) {
      this.selectedFields = this.selectedFields.filter((item: string) => {
        return item !== value;
      });
    }
  }

  private exists(value: string) {
    const exists = this.selectedFields.filter((item) => item === value);
    return exists.length > 0;
  }

  private extractFormFieldsFromModel(): FormSelectableField[] {
    let attestation = getAttestationByFormatAndType(
      this.attestationType,
      this.attestationFormat
    );
    if (!attestation) {
      return [];
    }
    return attestation.attestationDef.dataSet.map((attr, index) => {
      return {
        id: index,
        label: attr.attribute,
        value: attr.identifier,
        visible: true,
      };
    });
  }

  trackByFn(_index: number, data: FormSelectableField) {
    return data.id;
  }

  saveSelection() {
    this.dialogRef.close({
      data: {
        selectedFields: this.selectedFields,
        attestationType: this.attestationType,
      },
    });
  }

  isChecked(field: string) {
    return (
      this.selectedFields.filter((item) => {
        return item === field;
      }).length > 0
    );
  }

  isSomethingSelected(): boolean {
    return this.selectedFields.length > 0;
  }
}
