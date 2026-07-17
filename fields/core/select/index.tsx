import { z } from "zod";
import { Field } from "@/types/field";
import { EditComponent } from "./edit-component";

const schema = (field: Field) => {
  const normalizedValues = Array.isArray(field.options?.values)
    ? field.options.values.map((item) => (
        typeof item === "object"
          ? String(item.value ?? item.name ?? "")
          : String(item)
      ))
    : [];
  const min = typeof field.options?.min === "number" ? field.options.min : undefined;
  const max = typeof field.options?.max === "number" ? field.options.max : undefined;

  const optionSchema = z.string().refine(
    (value) => normalizedValues.includes(value),
    { message: normalizedValues.length === 0 ? "This select field requires options.values" : "Недопустимый вариант" }
  );

  if (field.options?.multiple) {
    let zodSchema = z.array(optionSchema);

    if (field.required) zodSchema = zodSchema.min(1, "Обязательное поле");
    if (min !== undefined) zodSchema = zodSchema.min(min, `Выберите не менее ${min} вариант${min === 1 ? "" : "а"}`);
    if (max !== undefined) zodSchema = zodSchema.max(max, `Выберите не более ${max} вариант${max === 1 ? "" : "а"}`);

    return z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return [];
        return Array.isArray(val) ? val.map(String) : val;
      },
      zodSchema
    );
  }

  return z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    field.required
      ? optionSchema
      : z.union([z.literal(""), optionSchema]).optional()
  );
};

const label = "Select";

export { label, schema, EditComponent };
