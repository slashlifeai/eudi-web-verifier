import {AttestationType} from "@core/models/attestation/AttestationType";
import {InputDescriptor} from "@core/models/presentation/InputDescriptor";
import {Injectable} from "@angular/core";
import {Attestation, MsoMdocAttestation, SdJwtVcAttestation} from "@core/models/attestation/Attestations";
import {v4 as uuidv4} from "uuid";
import {FieldConstraint} from "@core/models/presentation/FieldConstraint";
import {DataElement} from "@core/models/attestation/AttestationDefinition";
import {AttestationFormat} from "@core/models/attestation/AttestationFormat";
import {getAttestationByFormatAndType} from "@core/constants/attestations-per-format";
import { AttestationSelection, AttributeSelectionMethod } from "@app/features/presentation-request-preparation/models/AttestationSelection";
import { PresentationDefinitionTransactionRequest } from "../models/TransactionInitializationRequest";

@Injectable({
  providedIn: 'root'
})
export class PresentationDefinitionService {
  presentationDefinitionRequest(
    selectedAttestations: AttestationSelection[],
    selectedAttributes: { [id: string]: string[] }
  ): PresentationDefinitionTransactionRequest {

      let inputDescriptors: InputDescriptor[] = [];

      selectedAttestations.map((attestation) => {
        const selectedAttributesForAttestation =
          selectedAttributes[attestation.type];

        const inputDescriptor =
          this.inputDescriptorOf(
            attestation.type,
            attestation.format!!,
            '',
            attestation.attributeSelectionMethod ===
              AttributeSelectionMethod.ALL_ATTRIBUTES
              ? undefined
              : selectedAttributesForAttestation
          );

        if (inputDescriptor) {
          inputDescriptors.push(inputDescriptor);
        }
      });

      return {
        type: 'vp_token',
        presentation_definition: {
          id: uuidv4(),
          input_descriptors: inputDescriptors!,
        },
        nonce: uuidv4(),
      };
  }

  inputDescriptorOf(
    type: AttestationType,
    format: AttestationFormat,
    presentationPurpose: string,
    includeAttributes?: string[]
  ): InputDescriptor | null {
    let attestation = getAttestationByFormatAndType(type, format);
    if (attestation) {
      switch (attestation.format) {
        case AttestationFormat.MSO_MDOC:
          return this.msoMdocInputDescriptorOf(attestation, includeAttributes);
        case AttestationFormat.SD_JWT_VC:
          return this.sdJwtVcInputDescriptorOf(attestation, presentationPurpose, includeAttributes);
      }
    } else {
      console.error(`No attestation found with type ${type} and format: ${format}`);
      return null;
    }
  }

  private msoMdocInputDescriptorOf(
    attestation: MsoMdocAttestation,
    includeAttributes?: string[]
  ): InputDescriptor {
    return {
      id: attestation.doctype,
      format: {
        mso_mdoc: {
          alg: [
            "ES256",
            "ES384",
            "ES512"
          ]
        }
      },
      constraints: {
        limit_disclosure: 'required',
        fields: this.fieldConstraints(attestation, includeAttributes)
      }
    };
  }

  private sdJwtVcInputDescriptorOf(
    attestation: SdJwtVcAttestation,
    presentationPurpose: string,
    includeAttributes: string[] | undefined
  ) {
    let filedConstraints: FieldConstraint[] = [
      this.sdJwtVCVctFieldConstraint(attestation),
      ...this.fieldConstraints(attestation, includeAttributes)
    ]
    return {
      id: uuidv4(),
      name: attestation.attestationDef.name,
      purpose: presentationPurpose,
      format: {
        "vc+sd-jwt": {
          "sd-jwt_alg_values": ["ES256", "ES384"],
          "kb-jwt_alg_values": ["ES256", "ES384"]
        }
      },
      constraints: {
        fields: filedConstraints
      }
    };
  }

  private sdJwtVCVctFieldConstraint(attestation: SdJwtVcAttestation): FieldConstraint {
    return {
      path: ["$.vct"],
      filter: {
        type: "string",
        const: attestation.vct
      }
    }
  }

  private fieldConstraints(attestation: Attestation, includeAttributes?: string[]): FieldConstraint[] {
    const fieldConstraints: FieldConstraint[] = [];
    attestation.attestationDef.dataSet.forEach((dataElement: DataElement) => {
      if (typeof includeAttributes == 'undefined' || includeAttributes.includes(dataElement.identifier)) {
        fieldConstraints.push(this.fieldConstraint(attestation.attributePath(dataElement)));
      }
    })
    return fieldConstraints;
  }

  private fieldConstraint(path: string, intentToRetainOptional?: boolean): FieldConstraint {
    let intentToRetain = false;
    if (typeof intentToRetainOptional !== 'undefined' && intentToRetainOptional) {
      intentToRetain = true
    }
    return {
      path: [path],
      intent_to_retain: intentToRetain
    }
  }


}
