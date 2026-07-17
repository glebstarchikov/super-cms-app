import { z } from "zod";
import { Field } from "@/types/field";
import { EditComponent } from "./edit-component";

const schema = (field: Field, configObject?: Record<string, any>) => {
  let zodSchema = z.coerce.number();

  if (field.options?.min !== undefined) zodSchema = zodSchema.min(field.options.min as number, { message: `Минимальное значение — ${field.options.min}` });
  if (field.options?.max !== undefined) zodSchema = zodSchema.max(field.options.max as number, { message: `Максимальное значение — ${field.options.max}` });

  return z.literal("").refine(() => !field.required, { message: "Обязательное поле" }).or(zodSchema);
};

const label = "Number";

export { label, schema, EditComponent };