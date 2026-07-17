import { EditComponent } from "./edit-component";
import { Field } from "@/types/field";
import { z } from "zod";

const schema = (field: Field, configObject?: Record<string, any>) => {
  let zodSchema = z.string();
  
  if (field.required) zodSchema = zodSchema.min(1, "Обязательное поле");
  if (field.pattern) {
    if (typeof field.pattern === "string") {
      zodSchema = zodSchema.regex(new RegExp(field.pattern), "Неверный формат");
    } else {
      zodSchema = zodSchema.regex(new RegExp(field.pattern.regex), field.pattern.message || "Неверный формат");
    }
  }
  if (field.options?.minlength) zodSchema = zodSchema.min(field.options.minlength as number, `Минимальная длина — ${field.options.minlength} символов`);
  if (field.options?.maxlength) zodSchema = zodSchema.max(field.options.maxlength as number, `Максимальная длина — ${field.options.maxlength} символов`);
  
  return zodSchema;
};

const label = "Code";

export { label, schema, EditComponent };