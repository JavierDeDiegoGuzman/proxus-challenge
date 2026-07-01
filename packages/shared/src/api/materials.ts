import { Schema } from "effect";
import { Multipart } from "effect/unstable/http";
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";
import { MaterialListResponse, PdfMaterial } from "../schemas/material.ts";

export const UploadMaterialPayload = HttpApiSchema.asMultipart()(
  Schema.Struct({
    file: Multipart.SingleFileSchema
  })
);

export const UploadMaterialResponse = Schema.Struct({
  material: PdfMaterial,
  tutorNote: Schema.String
});
export type UploadMaterialResponse = typeof UploadMaterialResponse.Type;

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
      success: UploadMaterialResponse
    })
  )
  .prefix("/materials")
{}
