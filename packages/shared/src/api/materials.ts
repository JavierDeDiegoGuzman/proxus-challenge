import { Schema } from "effect";
import { Multipart } from "effect/unstable/http";
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";
import { MaterialListResponse, PdfMaterial } from "../schemas/material.ts";

export const UploadMaterialPayload = HttpApiSchema.asMultipart()(
  Schema.Struct({
    file: Multipart.SingleFileSchema
  })
);

export class MaterialsApi extends HttpApiGroup.make("materials")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: MaterialListResponse
    }),
    HttpApiEndpoint.get("get", "/:id", {
      params: {
        id: Schema.String
      },
      success: PdfMaterial
    }),
    HttpApiEndpoint.post("upload", "/", {
      payload: UploadMaterialPayload,
      success: PdfMaterial
    })
  )
  .prefix("/materials")
{}
